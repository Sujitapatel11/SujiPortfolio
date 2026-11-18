"""add idempotency keys to public Ask Suji submissions

Revision ID: 010_ask_suji_idempotency
Revises: 009_ask_suji_conversations
Create Date: 2026-11-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "010_ask_suji_idempotency"
down_revision: Union[str, None] = "009_ask_suji_conversations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("inquiries") as batch:
        batch.add_column(sa.Column("idempotency_key", sa.String(64), nullable=True))
        batch.create_unique_constraint("uq_inquiries_idempotency_key", ["idempotency_key"])
    with op.batch_alter_table("appointments") as batch:
        batch.add_column(sa.Column("idempotency_key", sa.String(64), nullable=True))
        batch.add_column(sa.Column("owner_notification_sent", sa.Boolean(), nullable=True))
        batch.create_unique_constraint("uq_appointments_idempotency_key", ["idempotency_key"])


def downgrade() -> None:
    with op.batch_alter_table("appointments") as batch:
        batch.drop_constraint("uq_appointments_idempotency_key", type_="unique")
        batch.drop_column("owner_notification_sent")
        batch.drop_column("idempotency_key")
    with op.batch_alter_table("inquiries") as batch:
        batch.drop_constraint("uq_inquiries_idempotency_key", type_="unique")
        batch.drop_column("idempotency_key")
