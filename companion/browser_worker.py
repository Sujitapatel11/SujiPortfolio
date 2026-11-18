"""Generic, local-first Playwright worker for bounded browser tasks.

This module is deliberately not wired to the remote command queue yet. The next
integration step must add explicit per-workflow domain scopes and user-visible
pause/resume controls before exposing these primitives to the planner.
"""
from __future__ import annotations

import ipaddress
import socket
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import BrowserContext, Page, Playwright, TimeoutError as PlaywrightTimeoutError, sync_playwright


class BrowserWorkerError(RuntimeError):
    """Safe, user-displayable browser worker failure."""


def _normalise_host(host: str | None) -> str:
    return (host or "").rstrip(".").lower()


def host_in_scope(host: str, allowed_domains: list[str]) -> bool:
    """Allow an exact domain or its subdomains; reject empty/malformed scopes."""
    candidate = _normalise_host(host)
    for raw_domain in allowed_domains:
        domain = _normalise_host(raw_domain)
        if domain and (candidate == domain or candidate.endswith("." + domain)):
            return True
    return False


def detect_challenges(page: Page) -> dict:
    """Detect bot challenges, CAPTCHAs, MFA prompts, and login walls without bypassing them."""
    try:
        title = (page.title() or "").lower()
        body_text = page.locator("body").inner_text(timeout=2000)[:10000].lower()
        combined = f"{title} {body_text}"
        if any(marker in combined for marker in [
            "verify you are human", "checking your browser", "cloudflare", "turnstile",
            "just a moment...", "please verify you are a human", "attention required",
            "security check", "robot or human", "recaptcha", "hcaptcha"
        ]):
            return {"challenge": "bot_or_captcha", "requires_user_action": True, "reason": "Bot challenge or CAPTCHA detected"}
        if any(marker in combined for marker in [
            "two-factor authentication", "2-step verification", "enter verification code",
            "security code", "mfa verification", "authenticator app"
        ]):
            return {"challenge": "mfa_required", "requires_user_action": True, "reason": "Multi-factor authentication prompt detected"}
        if any(marker in combined for marker in [
            "sign in to continue", "log in to your account", "enter your password",
            "login required", "please sign in"
        ]):
            return {"challenge": "login_required", "requires_user_action": True, "reason": "Login wall or sign-in prompt detected"}
        return {"challenge": None, "requires_user_action": False, "reason": None}
    except Exception:
        return {"challenge": None, "requires_user_action": False, "reason": None}


def validate_url(url: str, allowed_domains: list[str]) -> str:
    parsed = urlsplit(url.strip())
    host = _normalise_host(parsed.hostname)
    if parsed.scheme != "https" or not host or parsed.username or parsed.password:
        raise BrowserWorkerError("Only credential-free HTTPS URLs are allowed.")
    if not host_in_scope(host, allowed_domains):
        raise BrowserWorkerError("Navigation is outside this workflow's approved domain scope.")
    try:
        addresses = {ipaddress.ip_address(host)}
    except ValueError:
        try:
            addresses = {
                ipaddress.ip_address(item[4][0])
                for item in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
            }
        except OSError as exc:
            raise BrowserWorkerError("The website host could not be resolved.") from exc
    if not addresses or any(not address.is_global for address in addresses):
        raise BrowserWorkerError("Private or local network destinations are blocked.")
    return url.strip()


class BrowserWorker:
    """Controls a dedicated persistent Chromium profile, never the user's default profile."""

    def __init__(self, profile_dir: str | Path | None = None, timeout_ms: int = 12_000):
        self.profile_dir = Path(profile_dir or Path.home() / ".suji-assistant" / "browser-profile")
        self.timeout_ms = timeout_ms
        self._playwright: Playwright | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._allowed_domains: list[str] = []

    @property
    def is_open(self) -> bool:
        return self._context is not None

    def start(self) -> dict:
        if self._context:
            return {"status": "ready", "url": self._page.url if self._page else "about:blank"}
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self._playwright = sync_playwright().start()
        try:
            self._context = self._playwright.chromium.launch_persistent_context(
                user_data_dir=str(self.profile_dir),
                headless=False,
                accept_downloads=False,
                timeout=self.timeout_ms,
                args=["--disable-extensions", "--disable-sync"],
            )
            self._context.set_default_timeout(self.timeout_ms)
            self._context.on("page", self._remember_page)
            self._page = self._context.pages[0] if self._context.pages else self._context.new_page()
            return {"status": "ready", "url": self._page.url}
        except Exception:
            self.close()
            raise

    def _remember_page(self, page: Page) -> None:
        self._page = page

    def _require_page(self, allowed_domains: list[str]) -> Page:
        if not self._context or not self._page:
            raise BrowserWorkerError("The controlled browser is not running.")
        if not allowed_domains or len(allowed_domains) > 10:
            raise BrowserWorkerError("A workflow must provide between 1 and 10 approved domains.")
        self._allowed_domains = allowed_domains
        current = self._page.url
        if current not in {"about:blank"}:
            validate_url(current, allowed_domains)
        return self._page

    def _guard_navigation(self, page: Page, url: str, allowed_domains: list[str]) -> None:
        def guard(route):
            request_url = route.request.url
            if request_url.startswith(("data:", "blob:")):
                return route.continue_()
            try:
                validate_url(request_url, allowed_domains)
            except BrowserWorkerError:
                return route.abort("blockedbyclient")
            return route.continue_()
        self._context.unroute("**/*")
        self._context.route("**/*", guard)
        page.goto(validate_url(url, allowed_domains), wait_until="domcontentloaded", timeout=self.timeout_ms)
        validate_url(page.url, allowed_domains)

    def navigate(self, url: str, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        try:
            self._guard_navigation(page, url, allowed_domains)
        except PlaywrightTimeoutError as exc:
            raise BrowserWorkerError("The page did not finish loading before the timeout.") from exc
        challenge = detect_challenges(page)
        return {
            "url": page.url,
            "title": page.title()[:300],
            "challenge": challenge["challenge"],
            "requires_user_action": challenge["requires_user_action"],
            "challenge_reason": challenge["reason"],
        }

    def inspect(self, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        challenge = detect_challenges(page)
        return {
            "url": page.url,
            "title": page.title()[:300],
            "visible_text": page.locator("body").inner_text(timeout=self.timeout_ms)[:20_000],
            "challenge": challenge["challenge"],
            "requires_user_action": challenge["requires_user_action"],
            "challenge_reason": challenge["reason"],
        }

    def screenshot(self, name: str | None = None, allowed_domains: list[str] | None = None) -> dict:
        domains = allowed_domains or self._allowed_domains
        page = self._require_page(domains)
        evidence_dir = Path.home() / ".suji-assistant" / "evidence"
        evidence_dir.mkdir(parents=True, exist_ok=True)
        safe_name = "".join(c for c in (name or "screenshot") if c.isalnum() or c in "-_")[:50]
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filepath = evidence_dir / f"{timestamp}_{safe_name}.png"
        try:
            page.screenshot(path=str(filepath), full_page=False)
        except Exception as exc:
            raise BrowserWorkerError("Failed to capture screenshot") from exc
        return {"path": str(filepath), "url": page.url, "title": page.title()[:300]}

    def click_text(self, text: str, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        if not text.strip() or len(text) > 200:
            raise BrowserWorkerError("Click text must contain 1–200 characters.")
        if text.strip().casefold() in {
            "apply", "apply now", "submit", "submit application", "send",
            "send message", "purchase", "buy now", "pay", "checkout",
            "delete", "remove account", "confirm deletion",
        }:
            raise BrowserWorkerError("Final submissions, payments, messages, and destructive actions require a separate explicit confirmation flow.")
        matches = page.get_by_text(text.strip(), exact=True)
        count = matches.count()
        if count != 1:
            raise BrowserWorkerError(f"Expected one exact visible match; found {count}.")
        matches.click()
        validate_url(page.url, allowed_domains)
        return {"url": page.url, "title": page.title()[:300]}

    def fill_label(self, label: str, value: str, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        if not label.strip() or len(label) > 160 or len(value) > 5_000:
            raise BrowserWorkerError("Field label or value exceeds the allowed size.")
        matches = page.get_by_label(label.strip(), exact=True)
        count = matches.count()
        if count != 1:
            raise BrowserWorkerError(f"Expected one labelled field; found {count}.")
        input_type = (matches.get_attribute("type") or "").lower()
        if input_type == "password":
            raise BrowserWorkerError("Password fields must be filled manually by the user for security.")
        matches.fill(value)
        return {"filled": True, "label": label.strip()}

    def scroll(self, direction: str, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        if direction not in {"up", "down"}:
            raise BrowserWorkerError("Scroll direction must be up or down.")
        delta = -650 if direction == "up" else 650
        page.evaluate("(delta) => window.scrollBy(0, delta)", delta)
        return {"url": page.url, "scroll": direction}

    def wait(self, milliseconds: int, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        if not 0 <= milliseconds <= 5_000:
            raise BrowserWorkerError("Wait must be between 0 and 5000 milliseconds.")
        page.wait_for_timeout(milliseconds)
        return {"url": page.url, "waited_ms": milliseconds}

    def close(self) -> None:
        if self._context:
            try:
                self._context.close()
            except Exception:
                pass
        self._context = None
        self._page = None
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
        self._playwright = None
