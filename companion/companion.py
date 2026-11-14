"""Local Windows companion: paired, allowlisted visible-browser control.

Only explicit browser navigation/search actions are exposed. No shell, file,
message, payment, form-submit, or destructive automation is available.
"""
from __future__ import annotations
import os, secrets, threading, time, re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlsplit, quote_plus
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

APP_NAME = "Suji Personal Assistant Companion"
PAIRING_TTL_SECONDS = 120
SESSION_TTL_SECONDS = 15 * 60
MAX_PAIRING_ATTEMPTS = 5
EXPECTED_HOST = "127.0.0.1:8765"
ALLOWED_FETCH_SITES = {"same-origin", "same-site", "cross-site"}
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = frozenset(x.strip().rstrip("/") for x in os.getenv("ASSISTANT_ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if x.strip() and x.strip() != "*")

def _valid_origin(value):
    if not value or value == "null": return False
    try:
        p = urlsplit(value)
        return p.scheme in {"http","https"} and bool(p.hostname) and not (p.username or p.password or p.path or p.query or p.fragment) and value.rstrip("/") in ALLOWED_ORIGINS
    except ValueError: return False

@dataclass
class PairingState:
    challenge: str
    challenge_expires_at: float
    attempts: int = 0
    challenge_consumed: bool = False
    device_id: str | None = None
    session_token: str | None = None
    session_expires_at: float = 0.0
    lock: threading.Lock = field(default_factory=threading.Lock)
    @classmethod
    def fresh(cls):
        return cls(secrets.token_urlsafe(32), time.monotonic() + PAIRING_TTL_SECONDS)
    def clear_session(self):
        self.device_id = None; self.session_token = None; self.session_expires_at = 0.0

STATE = PairingState.fresh()
app = FastAPI(title=APP_NAME, version="0.3.0", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(CORSMiddleware, allow_origins=sorted(ALLOWED_ORIGINS), allow_credentials=False, allow_methods=["GET","POST","OPTIONS"], allow_headers=["Authorization","Content-Type"], max_age=300)

class PairingCompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge: str = Field(min_length=30, max_length=128)

class BrowserActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str = Field(pattern="^(open_url|google_search)$")
    value: str = Field(min_length=1, max_length=2000)

def validate_browser_request(request: Request):
    if not _valid_origin(request.headers.get("origin")): raise HTTPException(403, "Untrusted or missing Origin")
    if request.headers.get("host","").lower() != EXPECTED_HOST: raise HTTPException(403, "Unexpected Host")
    if request.method in {"POST","PUT","PATCH","DELETE"} and request.headers.get("content-type","").split(";",1)[0].strip().lower() != "application/json": raise HTTPException(415, "application/json is required")
    site = request.headers.get("sec-fetch-site")
    if site is not None and site not in ALLOWED_FETCH_SITES: raise HTTPException(403, "Invalid Sec-Fetch-Site")

def require_session(authorization: Annotated[str | None, Header()] = None):
    with STATE.lock:
        if not STATE.session_token or time.monotonic() >= STATE.session_expires_at:
            STATE.clear_session(); raise HTTPException(401, "Pairing session missing or expired")
        if not authorization or not secrets.compare_digest(authorization, f"Bearer {STATE.session_token}"):
            raise HTTPException(401, "Valid paired-device credential required", headers={"WWW-Authenticate":"Bearer"})

@app.get("/health")
def health():
    return {"status":"ok","service":"suji-assistant-companion","execution_enabled":True}

@app.post("/v1/pairing/complete")
def complete_pairing(payload: PairingCompleteRequest, request: Request):
    validate_browser_request(request); now=time.monotonic()
    with STATE.lock:
        if STATE.challenge_consumed or now >= STATE.challenge_expires_at: raise HTTPException(410,"Pairing challenge expired or already used")
        if STATE.attempts >= MAX_PAIRING_ATTEMPTS: STATE.challenge_consumed=True; raise HTTPException(429,"Pairing attempt limit reached")
        STATE.attempts += 1
        if not secrets.compare_digest(payload.challenge,STATE.challenge):
            if STATE.attempts >= MAX_PAIRING_ATTEMPTS: STATE.challenge_consumed=True
            raise HTTPException(401,"Invalid pairing challenge")
        STATE.challenge_consumed=True; STATE.session_token=secrets.token_urlsafe(32); STATE.session_expires_at=now+SESSION_TTL_SECONDS; STATE.device_id=secrets.token_urlsafe(12)
        return {"device_id":STATE.device_id,"session_token":STATE.session_token,"expires_at":datetime.fromtimestamp(time.time()+SESSION_TTL_SECONDS,tz=timezone.utc).isoformat()}

@app.get("/v1/capabilities", dependencies=[Depends(require_session)])
def capabilities():
    return {"platform":"windows","service":"local-companion","authenticated":True,"device_id":STATE.device_id,"capabilities":["browser.open_url","browser.google_search"],"execution_enabled":True}

def _browser():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError: raise HTTPException(503,"Browser automation is not installed. Run: pip install -r companion/requirements.txt")
    global _PLAYWRIGHT, _BROWSER
    try:
        if _BROWSER is None or not _BROWSER.is_connected():
            _PLAYWRIGHT = sync_playwright().start()
            _BROWSER = _PLAYWRIGHT.chromium.launch(channel="chrome", headless=False)
        return _BROWSER
    except Exception as exc:
        raise HTTPException(503, f"Could not launch Chrome. Install Google Chrome and Playwright: {type(exc).__name__}")

_PLAYWRIGHT = None
_BROWSER = None
_BROWSER_LOCK = threading.Lock()

@app.post("/v1/actions/browser", dependencies=[Depends(require_session)])
def browser_action(payload: BrowserActionRequest, request: Request):
    validate_browser_request(request)
    if payload.action == "google_search":
        target = "https://www.google.com/search?q=" + quote_plus(payload.value.strip())
    else:
        target = payload.value.strip()
        parsed = urlsplit(target)
        if parsed.scheme not in {"http","https"} or not parsed.hostname or parsed.username or parsed.password:
            raise HTTPException(400,"Only valid public HTTP(S) URLs are allowed")
        if parsed.hostname.lower() in {"localhost","127.0.0.1","0.0.0.0","::1"}:
            raise HTTPException(400,"Local/private destinations are not allowed")
    with _BROWSER_LOCK:
        browser = _browser()
        try:
            pages = [p for context in browser.contexts for p in context.pages]
            if pages:
                page = pages[0]
            else:
                context = browser.new_context()
                page = context.new_page()
            page.goto(target, wait_until="domcontentloaded", timeout=30000)
            return {"status":"opened","url":page.url,"title":page.title(),"action":payload.action}
        except Exception as exc:
            raise HTTPException(502,f"Browser navigation failed: {type(exc).__name__}")

@app.post("/v1/pairing/disconnect", dependencies=[Depends(require_session)])
def disconnect_pairing(request: Request):
    validate_browser_request(request)
    with STATE.lock: STATE.clear_session()
    return {"status":"disconnected","execution_enabled":False}

if __name__ == "__main__":
    import uvicorn
    print("One-time pairing challenge (keep private):"); print(STATE.challenge)
    print("Expires in 120 seconds. Allowed origins:",", ".join(sorted(ALLOWED_ORIGINS)))
    uvicorn.run(app,host="127.0.0.1",port=8765,reload=False,access_log=False)
