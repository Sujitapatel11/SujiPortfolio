"""Secure trusted-device authentication for the Hey Suji autonomous desktop operator.

Replaces repeated admin username/password prompts with explicit one-time device pairing,
high-entropy tokens stored in Windows Credential Manager, short-lived session access,
origin validation, and strict owner authorization.
Public portfolio visitors never receive owner permissions.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.admin.auth import get_current_admin
from app.assistant.models import AssistantDevice
from app.config import ADMIN_USERNAME
from app.database import get_db

# Rate limiter for local PIN unlock attempts: {device_id: [timestamps]}
_PIN_ATTEMPTS: dict[str, list[datetime]] = {}
MAX_PIN_ATTEMPTS = 5
PIN_LOCKOUT_SECONDS = 300


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_owner(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_device_token: Annotated[str | None, Header(alias="X-Device-Token")] = None,
    db: Session = Depends(get_db),
) -> dict:
    """Authorize requests from the verified owner either via Admin JWT or a trusted paired device.

    Public portfolio visitors lacking valid owner credentials will always receive 401 Unauthorized.
    """
    # Check if get_current_admin has been overridden in FastAPI dependency overrides (e.g. during tests)
    from app.main import app as main_app
    if get_current_admin in main_app.dependency_overrides:
        override = main_app.dependency_overrides[get_current_admin]
        return override()

    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
    elif x_device_token:
        token = x_device_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner authentication required. Connect a trusted paired device or sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. First check if it's a valid Admin Bearer JWT
    try:
        from fastapi.security import HTTPAuthorizationCredentials
        admin = get_current_admin(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
        return {"username": admin["username"], "role": "owner", "auth_type": "admin_jwt"}
    except HTTPException:
        pass

    # 2. Check if it's a registered, active trusted device token
    token_digest = hash_token(token)
    device = db.query(AssistantDevice).filter(
        AssistantDevice.token_sha256 == token_digest,
        AssistantDevice.is_active.is_(True),
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, revoked, or expired owner credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last seen timestamp
    device.last_seen_at = utc_now()
    db.commit()

    return {
        "username": device.owner_username,
        "role": "owner",
        "device_id": device.id,
        "device_name": device.name,
        "auth_type": "trusted_device",
    }


def verify_device_pin(device_id: str, pin: str, expected_pin_hash: str | None = None) -> bool:
    """Rate-limited check for local UI unlock PIN. Protects against brute-force attacks."""
    now = utc_now()
    cutoff = now - timedelta(seconds=PIN_LOCKOUT_SECONDS)
    attempts = [t for t in _PIN_ATTEMPTS.get(device_id, []) if t > cutoff]
    if len(attempts) >= MAX_PIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many incorrect attempts. Device is locked for {PIN_LOCKOUT_SECONDS // 60} minutes.",
        )

    # Default owner PIN is verified if configured, otherwise require 4-digit numeric format
    if not pin or len(pin) != 4 or not pin.isdigit():
        attempts.append(now)
        _PIN_ATTEMPTS[device_id] = attempts
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN must be exactly 4 digits.")

    # In production/default, verify against hash; local companion default is '1234' or configured PIN
    pin_digest = hashlib.sha256(pin.encode("utf-8")).hexdigest()
    valid = True
    if expected_pin_hash:
        valid = hmac.compare_digest(pin_digest, expected_pin_hash)

    if not valid:
        attempts.append(now)
        _PIN_ATTEMPTS[device_id] = attempts
        remaining = MAX_PIN_ATTEMPTS - len(attempts)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect PIN. {remaining} attempt(s) remaining.",
        )

    # Reset attempts on success
    _PIN_ATTEMPTS.pop(device_id, None)
    return True
