"""Database engine and session configuration.

Loads local development secrets from the repository root while allowing
hosting-platform environment variables to take precedence. A configured
PostgreSQL database is never silently replaced with SQLite.
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("sujis_world.database")

# backend/app/database.py -> repository root
REPOSITORY_ROOT = Path(__file__).resolve().parents[2]

# Hosting environment variables always win (override=False). For local
# development, load root .env.local first, then backend/.env and root .env.
load_dotenv(REPOSITORY_ROOT / ".env.local", override=False)
load_dotenv(REPOSITORY_ROOT / "backend" / ".env", override=False)
load_dotenv(REPOSITORY_ROOT / ".env", override=False)

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

# Pin the driver explicitly. SQLAlchemy 2.1 defaults plain postgresql:// URLs
# to psycopg (v3), while this project installs psycopg2-binary.
if DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql+psycopg://",
        "postgresql+psycopg2://",
        1,
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1,
    )
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg2://",
        1,
    )

if not DATABASE_URL:
    if ENVIRONMENT == "production":
        raise RuntimeError(
            "DATABASE_URL is required in production; configure Neon PostgreSQL."
        )
    DATABASE_URL = f"sqlite:///{(REPOSITORY_ROOT / 'backend' / 'sujis_world.db').as_posix()}"
    logger.warning("DATABASE_URL is not set; using the local development SQLite database.")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=not DATABASE_URL.startswith("sqlite"),
)

# Fail clearly if a configured database cannot be reached. Never hide a
# PostgreSQL outage by silently switching to a different SQLite database.
try:
    with engine.connect() as connection:
        logger.info("Database connection established.")
except Exception as exc:
    engine.dispose()
    raise RuntimeError(
        "Could not connect to the configured database. Verify DATABASE_URL, "
        "network access, credentials and the installed PostgreSQL driver."
    ) from exc

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that yields one SQLAlchemy session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
