import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("sujis_world.database")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://suji_user:suji_password@localhost:5432/sujis_world_db"
)

# Connect args special handling for SQLite vs Postgres
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # Test connection attempt
    with engine.connect() as conn:
        logger.info("Successfully connected to database.")
except Exception as e:
    logger.warning(f"Could not connect to target database at {DATABASE_URL}: {e}")
    # Fallback to local SQLite for smooth local development if primary DB is unavailable
    FALLBACK_DB = "sqlite:///./sujis_world.db"
    logger.info(f"Falling back to local SQLite database at {FALLBACK_DB}")
    engine = create_engine(FALLBACK_DB, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for providing database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
