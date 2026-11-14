"""Local-only Windows-first companion with short-lived browser pairing.

Pairing grants access to status/capabilities only. Desktop execution is not
implemented and is explicitly disabled.
"""
from __future__ import annotations

import os
import secrets
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

APP_NAME = "Suji Personal Assistant Companion"
PAIRING_TTL_SECONDS = 120
SESSION_TTL_SECONDS = 15 * 60
MAX_PAIRING_ATTEMPTS = 5
EXPECTED_HOST = "127.0.0.1:8765"
ALLOWED_FETCH_SITES = {"same-origin", "same-site", "cross-site"}

# Explicit exact origins only. Configure the real deployed portfolio origin
# through ASSISTANT_ALLOWED_ORIGINS before running the companion.
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ALLOWED_ORIGINS = frozenset(
    item.strip().rstrip("/")
    for item in os.getenv("ASSISTANT_ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if item.strip() and item.strip() != "*"
)


def _valid_origin(value: str | None) -> bool:
    if not value or value == "null":
        return False
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False
        if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
            return False
        normalized = value.rstrip("/")
        return normalized in ALLOWED_ORIGINS
    except ValueError:
        return False


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
    def fresh(cls) -> "PairingState":
        return cls(
            challenge=secrets.token_urlsafe(32),
            challenge_expires_at=time.monotonic() + PAIRING_TTL_SECONDS,
            lock=threading.Lock(),
        )

    def clear_session(self) -> None:
        self.device_id = None
        self.session_token = None
        self.session_expires_at = 0.0


STATE = PairingState.fresh()
app = FastAPI(
    title=APP_NAME,
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=300,
)


class PairingCompleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge: str = Field(min_length=30, max_length=128)


def validate_browser_request(request: Request) -> None:
    origin = request.headers.get("origin")
    if not _valid_origin(origin):
        raise HTTPException(status_code=403, detail="Untrusted or missing Origin")
    if request.headers.get("host", "").lower() != EXPECTED_HOST:
        raise HTTPException(status_code=403, detail="Unexpected Host")
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and content_type != "application/json":
        raise HTTPException(status_code=415, detail="application/json is required")
    fetch_site = request.headers.get("sec-fetch-site")
    if fetch_site is not None and fetch_site not in ALLOWED_FETCH_SITES:
        raise HTTPException(status_code=403, detail="Invalid Sec-Fetch-Site")


def require_session(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    now = time.monotonic()
    with STATE.lock:
        token = STATE.session_token
        expires = STATE.session_expires_at
        if not token or now >= expires:
            STATE.clear_session()
            raise HTTPException(status_code=401, detail="Pairing session missing or expired")
        expected = f"Bearer {token}"
        if not authorization or not secrets.compare_digest(authorization, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Valid paired-device credential required",
                headers={"WWW-Authenticate": "Bearer"},
            )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "suji-assistant-companion",
        "execution_enabled": False,
    }


@app.post("/v1/pairing/complete")
def complete_pairing(payload: PairingCompleteRequest, request: Request):
    validate_browser_request(request)
    now = time.monotonic()
    with STATE.lock:
        if STATE.challenge_consumed or now >= STATE.challenge_expires_at:
            raise HTTPException(status_code=410, detail="Pairing challenge expired or already used")
        if STATE.attempts >= MAX_PAIRING_ATTEMPTS:
            STATE.challenge_consumed = True
            raise HTTPException(status_code=429, detail="Pairing attempt limit reached")
        STATE.attempts += 1
        if not secrets.compare_digest(payload.challenge, STATE.challenge):
            if STATE.attempts >= MAX_PAIRING_ATTEMPTS:
                STATE.challenge_consumed = True
            raise HTTPException(status_code=401, detail="Invalid pairing challenge")

        STATE.challenge_consumed = True
        STATE.session_token = secrets.token_urlsafe(32)
        STATE.session_expires_at = now + SESSION_TTL_SECONDS
        STATE.device_id = secrets.token_urlsafe(12)
        return {
            "device_id": STATE.device_id,
            "session_token": STATE.session_token,
            "expires_at": datetime.fromtimestamp(
                time.time() + SESSION_TTL_SECONDS, tz=timezone.utc
            ).isoformat(),
        }


@app.get("/v1/capabilities", dependencies=[Depends(require_session)])
def capabilities():
    return {
        "platform": "windows",
        "service": "local-companion",
        "authenticated": True,
        "device_id": STATE.device_id,
        "capabilities": [],
        "execution_enabled": False,
        "message": "No desktop actions are available in this pairing phase.",
    }


@app.post("/v1/pairing/disconnect", dependencies=[Depends(require_session)])
def disconnect_pairing(request: Request):
    validate_browser_request(request)
    with STATE.lock:
        STATE.clear_session()
    return {"status": "disconnected", "execution_enabled": False}


if __name__ == "__main__":
    import uvicorn

    print("Pairing challenge (enter this manually in the authenticated assistant UI):")
    print(STATE.challenge)
    print("Challenge expires in 120 seconds. Do not share it or place it in a URL.")
    print(f"Allowed website origins: {', '.join(sorted(ALLOWED_ORIGINS)) or '(none configured)'}")
    uvicorn.run(app, host="127.0.0.1", port=8765, reload=False, access_log=False)
