"""Small, paired Windows companion for safe browser navigation."""
from __future__ import annotations

import os
import secrets
import threading
import time
import webbrowser
import keyring
from dataclasses import dataclass, field
from typing import Annotated
from urllib.parse import quote_plus, urlsplit

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

HOST = "127.0.0.1:8765"
PAIR_TTL = 120
SERVICE_NAME = "SujiLocalCompanion"
TOKEN_ACCOUNT = "paired-device-token"
ALLOWED_SITES = {"same-origin", "same-site", "cross-site"}
ORIGINS = sorted({
    value.strip().rstrip("/")
    for value in os.getenv(
        "ASSISTANT_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if value.strip() and value.strip() != "*"
})
ALLOWED_HOSTS = {"google.com", "www.google.com", "linkedin.com", "www.linkedin.com"}


def load_saved_token() -> str:
    """Read the token from the OS credential store when a backend is available."""
    try:
        return keyring.get_password(SERVICE_NAME, TOKEN_ACCOUNT) or ""
    except keyring.errors.NoKeyringError:
        # Headless Linux CI has no OS keyring; Windows users get Credential Manager.
        return ""


@dataclass
class Pairing:
    challenge: str = field(default_factory=lambda: secrets.token_urlsafe(32))
    challenge_expires: float = field(default_factory=lambda: time.monotonic() + PAIR_TTL)
    token: str = field(default_factory=load_saved_token)
    attempts: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)


STATE = Pairing()
app = FastAPI(title="Suji Local Companion", docs_url=None, redoc_url=None, openapi_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class PairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge: str = Field(min_length=30, max_length=128)


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str = Field(pattern="^(open_url|google_search|linkedin_search)$")
    value: str = Field(min_length=1, max_length=500)


def check_origin(request: Request) -> None:
    origin = request.headers.get("origin", "")
    parts = urlsplit(origin)
    if (
        origin.rstrip("/") not in ORIGINS
        or parts.scheme not in {"http", "https"}
        or not parts.hostname
        or parts.username
        or parts.password
        or request.headers.get("host", "").lower() != HOST
    ):
        raise HTTPException(403, "Untrusted browser origin or host")
    site = request.headers.get("sec-fetch-site")
    if site and site not in ALLOWED_SITES:
        raise HTTPException(403, "Invalid browser request metadata")
    if request.method == "POST" and request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        raise HTTPException(415, "JSON required")


def require_pairing(authorization: Annotated[str | None, Header()] = None) -> None:
    with STATE.lock:
        if not STATE.token:
            raise HTTPException(401, "Device is not paired")
        if not authorization or not secrets.compare_digest(authorization, f"Bearer {STATE.token}"):
            raise HTTPException(401, "Invalid device pairing")


@app.get("/health")
def health():
    return {"status": "ok", "paired": bool(STATE.token), "execution_enabled": True}


@app.get("/v1/status", dependencies=[Depends(require_pairing)])
def pairing_status(request: Request):
    check_origin(request)
    return {"status": "paired"}


@app.post("/v1/pair")
def pair(payload: PairRequest, request: Request):
    check_origin(request)
    with STATE.lock:
        if STATE.token:
            raise HTTPException(409, "This companion is already paired. Disconnect it before pairing again.")
        if time.monotonic() >= STATE.challenge_expires or STATE.attempts >= 5:
            raise HTTPException(410, "Pairing challenge expired; restart the companion")
        STATE.attempts += 1
        if not secrets.compare_digest(payload.challenge, STATE.challenge):
            raise HTTPException(401, "Incorrect pairing challenge")
        STATE.token = secrets.token_urlsafe(32)
        try:
            keyring.set_password(SERVICE_NAME, TOKEN_ACCOUNT, STATE.token)
        except Exception as exc:
            STATE.token = ""
            raise HTTPException(503, "Windows Credential Manager could not save the pairing. Check the companion installation.") from exc
        STATE.challenge = ""
        return {"token": STATE.token, "status": "paired"}


@app.post("/v1/action", dependencies=[Depends(require_pairing)])
def run_action(payload: ActionRequest, request: Request):
    check_origin(request)
    value = payload.value.strip()
    if payload.action == "google_search":
        target = "https://www.google.com/search?q=" + quote_plus(value)
    elif payload.action == "linkedin_search":
        target = "https://www.linkedin.com/jobs/search/?keywords=" + quote_plus(value)
    else:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or (parsed.hostname or "").lower() not in ALLOWED_HOSTS
            or parsed.username
            or parsed.password
        ):
            raise HTTPException(400, "Only Google and LinkedIn URLs are allowed")
        target = value

    if not webbrowser.open(target, new=2):
        raise HTTPException(502, "Windows could not open the default browser")
    return {"status": "opened", "url": target}


@app.post("/v1/disconnect", dependencies=[Depends(require_pairing)])
def disconnect(request: Request):
    check_origin(request)
    with STATE.lock:
        STATE.token = ""
        try:
            keyring.delete_password(SERVICE_NAME, TOKEN_ACCOUNT)
        except keyring.errors.PasswordDeleteError:
            pass
    return {"status": "disconnected"}


if __name__ == "__main__":
    import uvicorn

    print("One-time pairing challenge (keep it private):")
    print(STATE.challenge)
    print(f"Expires in {PAIR_TTL} seconds. Allowed origins: {', '.join(ORIGINS)}")
    uvicorn.run(app, host="127.0.0.1", port=8765, access_log=False)
