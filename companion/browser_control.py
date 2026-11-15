"""Isolated, allowlisted browser controls for the local Windows companion."""
from __future__ import annotations

import os
import pathlib
import threading
from urllib.parse import urlsplit, urljoin

from fastapi import HTTPException

ALLOWED_HOSTS = {
    "google.com", "www.google.com",
    "linkedin.com", "www.linkedin.com",
    "instagram.com", "www.instagram.com",
    "web.whatsapp.com",
    "github.com", "www.github.com",
}
_LOCK = threading.RLock()
_RUNTIME = None
_CONTEXT = None
_PAGE = None


def validate_url(value: str) -> str:
    parsed = urlsplit(value)
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme not in {"http", "https"} or host not in ALLOWED_HOSTS:
        raise HTTPException(400, "Browser automation is restricted to approved websites")
    if parsed.username or parsed.password or parsed.port not in (None, 80, 443):
        raise HTTPException(400, "Embedded credentials and non-standard ports are blocked")
    return value


def _page():
    global _RUNTIME, _CONTEXT, _PAGE
    if os.name != "nt":
        raise HTTPException(501, "Managed browser is supported only on Windows")
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise HTTPException(503, "Install companion requirements and run: py -m playwright install chromium") from exc
    if _CONTEXT is None:
        base = pathlib.Path(os.getenv("LOCALAPPDATA", str(pathlib.Path.home() / "AppData" / "Local")))
        profile = base / "SujiAssistant" / "BrowserProfile"
        profile.mkdir(parents=True, exist_ok=True)
        try:
            _RUNTIME = sync_playwright().start()
            _CONTEXT = _RUNTIME.chromium.launch_persistent_context(
                user_data_dir=str(profile),
                headless=False,
                args=["--disable-background-networking", "--no-first-run"],
            )
            pages = _CONTEXT.pages
            _PAGE = pages[0] if pages else _CONTEXT.new_page()
            _PAGE.set_default_timeout(5000)
        except Exception as exc:
            _CONTEXT = None
            _PAGE = None
            raise HTTPException(503, "Could not launch isolated Chromium. Run: py -m playwright install chromium") from exc
    if _PAGE is None or _PAGE.is_closed():
        _PAGE = _CONTEXT.new_page()
        _PAGE.set_default_timeout(5000)
    return _PAGE


def navigate(url: str) -> dict:
    validate_url(url)
    with _LOCK:
        page = _page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            validate_url(page.url)
            return {"status": "navigated", "url": page.url, "title": page.title()}
        except HTTPException:
            try:
                page.goto("about:blank")
            except Exception:
                pass
            raise
        except Exception as exc:
            raise HTTPException(502, "Could not navigate in managed browser") from exc


def inspect() -> dict:
    with _LOCK:
        page = _page()
        validate_url(page.url)
        try:
            text = page.locator("body").inner_text(timeout=5000)
            return {
                "status": "inspected",
                "url": page.url,
                "title": page.title()[:300],
                "text": text[:5000],
                "truncated": len(text) > 5000,
            }
        except Exception as exc:
            raise HTTPException(502, "Could not inspect current browser page") from exc


def click_link(label: str) -> dict:
    label = label.strip()
    if not label or len(label) > 120:
        raise HTTPException(400, "Provide a link label up to 120 characters")
    with _LOCK:
        page = _page()
        validate_url(page.url)
        try:
            links = page.get_by_role("link", name=label, exact=True)
            if links.count() != 1:
                raise HTTPException(409, "Unique link not found; inspect the page first")
            href = links.get_attribute("href")
            if not href:
                raise HTTPException(400, "Link has no destination")
            validate_url(urljoin(page.url, href))
            links.click()
            page.wait_for_load_state("domcontentloaded", timeout=10000)
            validate_url(page.url)
            return {"status": "clicked", "label": label, "url": page.url, "title": page.title()}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, "Could not safely click that link") from exc
