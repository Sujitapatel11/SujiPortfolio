"""Small, paired Windows companion for safe browser navigation."""
from __future__ import annotations

import os
import secrets
import hashlib
import json
import ipaddress
import socket
import subprocess
import sys
import urllib.error
import urllib.request
import threading
import time
from datetime import datetime, timezone
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
BACKEND_TOKEN_ACCOUNT = "backend-api-device-token"
DEVICE_ID_ACCOUNT = "backend-device-id"
API_URL_ACCOUNT = "backend-api-url"
POLL_INTERVAL_SECONDS = 2
ALLOWED_SITES = {"same-origin", "same-site", "cross-site"}
ORIGINS = sorted({
    value.strip().rstrip("/")
    for value in os.getenv(
        "ASSISTANT_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if value.strip() and value.strip() != "*"
})
ALLOWED_HOSTS = {"google.com", "www.google.com", "linkedin.com", "www.linkedin.com", "whatsapp.com", "web.whatsapp.com", "wa.me", "instagram.com", "www.instagram.com"}


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
    backend_token: str = ""
    backend_device_id: str = ""
    backend_api_url: str = ""
    worker: threading.Thread | None = None
    stop_event: threading.Event = field(default_factory=threading.Event)
    lock: threading.Lock = field(default_factory=threading.Lock)


def load_saved_value(account: str) -> str:
    try:
        return keyring.get_password(SERVICE_NAME, account) or ""
    except keyring.errors.NoKeyringError:
        return ""


STATE = Pairing(
    backend_token=load_saved_value(BACKEND_TOKEN_ACCOUNT),
    backend_device_id=load_saved_value(DEVICE_ID_ACCOUNT),
    backend_api_url=load_saved_value(API_URL_ACCOUNT),
)
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



class BackendConnectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    api_base_url: str = Field(min_length=8, max_length=300)
    device_id: str = Field(min_length=8, max_length=64)
    device_token: str = Field(min_length=40, max_length=200)




def _validate_api_base(value: str) -> str:
    parsed = urlsplit(value.strip().rstrip("/"))
    local_http = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    if (parsed.scheme != "https" and not local_http) or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise HTTPException(422, "Backend URL must be HTTPS (HTTP is allowed only for localhost development)")
    return value.strip().rstrip("/")


class _SameOriginHTTPSRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Allow only same-origin redirects and never downgrade HTTPS requests."""

    @staticmethod
    def _origin(value: str) -> tuple[str, str, int | None]:
        parsed = urlsplit(value)
        scheme = parsed.scheme.lower()
        host = (parsed.hostname or "").lower().rstrip(".")
        try:
            port = parsed.port
        except ValueError as exc:
            raise urllib.error.URLError("invalid_redirect_port") from exc
        if port is None:
            port = 443 if scheme == "https" else 80 if scheme == "http" else None
        return scheme, host, port

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        source = urlsplit(req.full_url)
        target = urlsplit(newurl)
        source_origin = self._origin(req.full_url)
        target_origin = self._origin(newurl)
        if source.scheme.lower() == "https" and target.scheme.lower() != "https":
            raise urllib.error.URLError("https_redirect_downgrade_blocked")
        if source_origin != target_origin:
            raise urllib.error.URLError("cross_origin_redirect_blocked")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _api_request(method: str, url: str, token: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"
    })
    opener = urllib.request.build_opener(_SameOriginHTTPSRedirectHandler())
    try:
        with opener.open(request, timeout=8) as response:
            body = response.read(65536)
            return json.loads(body.decode("utf-8")) if body else {}
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError("backend_request_failed") from exc


def _is_public_url(value: str) -> bool:
    parsed = urlsplit(value)
    if parsed.scheme not in {"https", "http"} or not parsed.hostname or parsed.username or parsed.password:
        return False
    host = parsed.hostname.rstrip(".").lower()
    try:
        addresses = {ipaddress.ip_address(host)}
    except ValueError:
        try:
            addresses = {ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)}
        except OSError:
            return False
    return bool(addresses) and all(item.is_global for item in addresses)


def _command_hash(command: dict) -> str:
    canonical = json.dumps(
        {"tool": command.get("tool"), "arguments": command.get("arguments")},
        sort_keys=True, separators=(",", ":")
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def execute_approved_command(command: dict) -> tuple[str, str]:
    tool, args = command.get("tool"), command.get("arguments")
    if not isinstance(args, dict):
        raise ValueError("invalid_arguments")
    if tool == "browser.open_url" and set(args) == {"url"} and isinstance(args["url"], str):
        if not _is_public_url(args["url"]):
            raise ValueError("unsafe_url")
        if not webbrowser.open(args["url"], new=2):
            raise RuntimeError("browser_open_failed")
        return "opened", "Opened the approved URL in the default browser"
    if tool == "desktop.open_application" and set(args) == {"app_id"} and args["app_id"] in {"calculator", "text_editor"}:
        if sys.platform != "win32":
            raise RuntimeError("windows_companion_required")
        executable = {"calculator": "calc.exe", "text_editor": "notepad.exe"}[args["app_id"]]
        subprocess.Popen([executable], shell=False)
        return "opened", f"Started {args['app_id']}"
    raise ValueError("tool_or_arguments_not_allowed")


def _poll_once() -> bool:
    with STATE.lock:
        api_url, token, device_id = STATE.backend_api_url, STATE.backend_token, STATE.backend_device_id
    if not (api_url and token and device_id):
        return False
    data = _api_request("GET", f"{api_url}/api/assistant/device/commands/next", token)
    command = data.get("command")
    if not command:
        return False
    if command.get("device_id") != device_id or not command.get("command_id") or not command.get("nonce"):
        raise RuntimeError("command_identity_mismatch")
    expires_at = command.get("expires_at")
    if not isinstance(expires_at, str):
        raise RuntimeError("command_expiry_missing")
    try:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise RuntimeError("command_expiry_invalid") from exc
    if expiry <= datetime.now(timezone.utc):
        raise RuntimeError("command_expired_before_execution")
    if not secrets.compare_digest(str(command.get("payload_sha256", "")), _command_hash(command)):
        raise RuntimeError("command_payload_hash_mismatch")
    try:
        result_code, message = execute_approved_command(command)
        outcome = "completed"
    except Exception as exc:
        outcome, result_code = "failed", str(exc)[:80] or "execution_failed"
        message = "The approved action could not be completed"
    result = {
        "command_id": command["command_id"], "payload_sha256": command["payload_sha256"],
        "nonce": command["nonce"], "outcome": outcome,
        "result_code": result_code, "message": message
    }
    _api_request("POST", f"{api_url}/api/assistant/device/commands/{command['command_id']}/result", token, result)
    return True


def _poll_loop() -> None:
    while not STATE.stop_event.is_set():
        try:
            _poll_once()
        except Exception:
            pass
        STATE.stop_event.wait(POLL_INTERVAL_SECONDS)


def _start_worker() -> None:
    if STATE.worker and STATE.worker.is_alive():
        return
    STATE.stop_event.clear()
    STATE.worker = threading.Thread(target=_poll_loop, name="suji-command-poller", daemon=True)
    STATE.worker.start()


@app.on_event("startup")
def resume_saved_backend_connection() -> None:
    """Resume outbound polling after restart only when all credentials were restored."""
    with STATE.lock:
        connection_ready = bool(
            STATE.backend_api_url and STATE.backend_token and STATE.backend_device_id
        )
    if connection_ready:
        _start_worker()


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
    return {"status": "ok", "paired": bool(STATE.backend_token), "execution_enabled": bool(STATE.backend_token), "device_id": STATE.backend_device_id or None}


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



@app.post("/v1/backend/connect")
def connect_backend(payload: BackendConnectRequest, request: Request):
    check_origin(request)
    api_url = _validate_api_base(payload.api_base_url)
    try:
        verified = _api_request("GET", f"{api_url}/api/assistant/device/status", payload.device_token)
    except RuntimeError as exc:
        raise HTTPException(401, "Backend rejected the device credential or is unreachable") from exc
    if verified.get("device_id") != payload.device_id:
        raise HTTPException(401, "Device ID does not match the supplied credential")
    try:
        keyring.set_password(SERVICE_NAME, BACKEND_TOKEN_ACCOUNT, payload.device_token)
        keyring.set_password(SERVICE_NAME, DEVICE_ID_ACCOUNT, payload.device_id)
        keyring.set_password(SERVICE_NAME, API_URL_ACCOUNT, api_url)
    except Exception as exc:
        raise HTTPException(503, "Windows Credential Manager could not store backend pairing") from exc
    with STATE.lock:
        STATE.backend_token = payload.device_token
        STATE.backend_device_id = payload.device_id
        STATE.backend_api_url = api_url
    _start_worker()
    return {"status": "connected", "device_id": payload.device_id, "polling": True}


@app.post("/v1/backend/disconnect")
def disconnect_backend(request: Request):
    check_origin(request)
    STATE.stop_event.set()
    with STATE.lock:
        STATE.backend_token = ""
        STATE.backend_device_id = ""
        STATE.backend_api_url = ""
    for account in (BACKEND_TOKEN_ACCOUNT, DEVICE_ID_ACCOUNT, API_URL_ACCOUNT):
        try:
            keyring.delete_password(SERVICE_NAME, account)
        except Exception:
            pass
    return {"status": "disconnected"}


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
            raise HTTPException(400, "Only Google, LinkedIn, WhatsApp, and Instagram URLs are allowed")
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
