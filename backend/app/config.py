"""
Centralized application configuration.
All environment variables are read and validated here.
In production, missing required variables raise a RuntimeError at startup.
"""
import os
import logging
from typing import List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("sujis_world.config")

# ── Environment ──────────────────────────────────────────────────
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"
IS_STAGING = ENVIRONMENT == "staging"
IS_DEV = not IS_PRODUCTION and not IS_STAGING

# ── Database ────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")

# ── LLM API Keys ────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()

# ── Admin Authentication ─────────────────────────────────────────
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "suji")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24h

# ── CORS ────────────────────────────────────────────────────────
_DEFAULT_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
_raw_origins = os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS)
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in _raw_origins.split(",")
    if origin.strip() and origin.strip() != "*"
]

# ── Rate Limiting ───────────────────────────────────────────────
RATE_LIMIT_CHAT = int(os.getenv("RATE_LIMIT_CHAT", "15"))
RATE_LIMIT_INQUIRY = int(os.getenv("RATE_LIMIT_INQUIRY", "10"))
RATE_LIMIT_LOGIN = int(os.getenv("RATE_LIMIT_LOGIN", "5"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

# ── Conversation Memory ─────────────────────────────────────────
MAX_CONVERSATIONS = int(os.getenv("MAX_CONVERSATIONS", "500"))
MAX_MESSAGE_HISTORY = 10


def validate_production_config() -> None:
    """
    Validate that all required environment variables are set when running
    in production. Raises RuntimeError with a list of all missing/insecure
    values so the operator can fix everything at once.
    """
    if not IS_PRODUCTION:
        return

    errors: List[str] = []

    if not JWT_SECRET_KEY:
        errors.append("JWT_SECRET_KEY must be set to a secure random value in production.")
    elif len(JWT_SECRET_KEY) < 32:
        errors.append("JWT_SECRET_KEY should be at least 32 characters in production.")

    if not ADMIN_PASSWORD_HASH:
        errors.append(
            "ADMIN_PASSWORD_HASH must be set in production. "
            "Generate one with: python -c \"from passlib.context import CryptContext; "
            "print(CryptContext(schemes=['bcrypt']).hash('your_password'))\""
        )

    if not DATABASE_URL:
        errors.append("DATABASE_URL must be set in production.")
    elif DATABASE_URL.startswith("sqlite"):
        errors.append(
            "SQLite database is not allowed in production. "
            "Set DATABASE_URL to a PostgreSQL connection string."
        )

    if not CORS_ORIGINS:
        errors.append("CORS_ORIGINS must be set to explicit allowed origins in production.")

    if errors:
        raise RuntimeError(
            "Production configuration validation failed:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )

    logger.info("Production configuration validated successfully.")
