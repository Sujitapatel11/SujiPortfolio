"""Playwright worker used by the paired companion execution queue.

Navigation is constrained by per-command domain scopes and request routing.
This is not a complete safety boundary for consequential actions: text-based
click blocking is only a heuristic, not reliable semantic confirmation. Keep
payments, submissions, messages, account changes, and destructive actions out
of automated execution until structured confirmation controls are implemented.
"""
from __future__ import annotations

import ipaddress
import socket
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
        return {"url": page.url, "title": page.title()[:300]}

    def inspect(self, allowed_domains: list[str]) -> dict:
        page = self._require_page(allowed_domains)
        return {
            "url": page.url,
            "title": page.title()[:300],
            "visible_text": page.locator("body").inner_text(timeout=self.timeout_ms)[:20_000],
        }

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
