"""Local-only Windows-first companion bootstrap.

This service intentionally exposes status/capabilities only. It cannot execute
commands, open apps, read files, or control the browser.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

APP_NAME = "Suji Personal Assistant Companion"
TOKEN_DIR = Path(os.getenv("LOCALAPPDATA", str(Path.home()))) / "SujiAssistant"
TOKEN_PATH = TOKEN_DIR / "companion.token"


def load_or_create_token(path: Path = TOKEN_PATH) -> str:
    """Load a persistent per-user token, creating it with restrictive permissions."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        token = path.read_text(encoding="utf-8").strip()
        if len(token) >= 40:
            return token
        raise RuntimeError("Companion token file is invalid. Remove it and restart to rotate.")
    token = secrets.token_urlsafe(48)
    path.write_text(token, encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        # Windows ACLs are inherited from the user profile; chmod is best-effort.
        pass
    return token


COMPANION_TOKEN = load_or_create_token()
app = FastAPI(
    title=APP_NAME,
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def require_token(authorization: Annotated[str | None, Header()] = None) -> None:
    expected = f"Bearer {COMPANION_TOKEN}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Companion authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/health")
def health():
    return {"status": "ok", "service": "suji-assistant-companion", "execution_enabled": False}


@app.get("/v1/capabilities", dependencies=[Depends(require_token)])
def capabilities():
    return {
        "platform": "windows",
        "service": "local-companion",
        "authenticated": True,
        "capabilities": [],
        "execution_enabled": False,
        "message": "No desktop actions are available in this bootstrap.",
    }


if __name__ == "__main__":
    import uvicorn

    # Deliberately hard-coded: never expose this companion on a LAN/public interface.
    uvicorn.run(app, host="127.0.0.1", port=8765, reload=False, access_log=False)
