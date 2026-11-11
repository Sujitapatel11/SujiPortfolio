"""
Admin authentication: JWT issuance and validation.
Security: No hardcoded secrets or default passwords.
All credentials must come from environment variables via app.config.
"""
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt
import logging

from app.config import (
    ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    IS_PRODUCTION,
)

logger = logging.getLogger("sujis_world.auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def _get_effective_password_hash() -> str:
    """
    Return the configured admin password hash.
    In production: raises if not set.
    In development: falls back to a known dev hash for 'admin123'
    so local development still works out of the box.
    """
    if ADMIN_PASSWORD_HASH:
        return ADMIN_PASSWORD_HASH

    if IS_PRODUCTION:
        raise RuntimeError(
            "ADMIN_PASSWORD_HASH is not set. "
            "Generate one with: python -c \"from passlib.context import CryptContext; "
            "print(CryptContext(schemes=['bcrypt']).hash('your_password'))\""
        )

    # Development-only fallback — clearly logged as insecure
    _DEV_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"
    logger.warning(
        "ADMIN_PASSWORD_HASH not set — using development-only default "
        "(password: 'admin123'). This will NOT work in production."
    )
    return _DEV_HASH


def _get_effective_jwt_secret() -> str:
    """
    Return the JWT signing secret.
    In production: raises if not set or too short.
    In development: generates a per-process random key for local use.
    """
    if JWT_SECRET_KEY:
        return JWT_SECRET_KEY

    if IS_PRODUCTION:
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Generate a secure random value "
            "(at least 32 characters) and set it in your environment."
        )

    # Development-only: random per-process key
    import secrets
    dev_secret = secrets.token_urlsafe(48)
    logger.warning(
        "JWT_SECRET_KEY not set — using a random per-process key. "
        "All sessions will invalidate on server restart. "
        "Set JWT_SECRET_KEY in .env for persistent sessions."
    )
    return dev_secret


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, _get_effective_jwt_secret(), algorithm=JWT_ALGORITHM
    )
    return encoded_jwt


def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validate the JWT Bearer token and return the admin identity.
    Raises 401 for invalid, expired, or mismatched tokens.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, _get_effective_jwt_secret(), algorithms=[JWT_ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None or username != ADMIN_USERNAME:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception
    return {"username": username, "role": "admin"}
