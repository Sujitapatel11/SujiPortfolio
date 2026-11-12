import os
import sys
from logging.config import fileConfig

from alembic import context

# Add backend root directory to sys.path so app module can be imported.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import Base, DATABASE_URL, engine
from app.models import Inquiry, Job, Proposal, KnowledgeChunk  # ensure all models are registered

config = context.config

if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations through the already-configured application engine.

    Reusing this engine avoids serializing SQLAlchemy URLs: str(engine.url)
    masks passwords, which would otherwise make Alembic authenticate with
    the literal masked password.
    """
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
