"""Database engine configuration.

Development may use a local SQLite fallback when its configured database is down.
Production must fail closed: silently switching databases would split or lose data.
"""
import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

logger = logging.getLogger("sujis_world.database")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://suji_user:suji_password@localhost:5432/sujis_world_db"
)
IS_DEPLOYED = os.getenv("ENVIRONMENT", "development").lower() in {"production", "staging"}


def _make_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


try:
    engine = _make_engine(DATABASE_URL)
    with engine.connect():
        logger.info("Successfully connected to configured database.")
except Exception as exc:
    if IS_DEPLOYED:
        # Do not log DATABASE_URL: it may contain credentials.
        logger.critical("Deployed database connection failed; refusing SQLite fallback.")
        raise RuntimeError("Configured deployment database is unavailable; startup aborted.") from exc

    logger.warning("Configured development database unavailable; using local SQLite fallback.")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    fallback_path = os.path.join(base_dir, "sujis_world.db").replace("\\", "/")
    engine = _make_engine(f"sqlite:///{fallback_path}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for providing a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
