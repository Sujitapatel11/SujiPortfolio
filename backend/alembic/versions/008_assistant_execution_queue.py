"""add paired devices and execution dispatch metadata

Revision ID: 008_assistant_execution_queue
Revises: 007_personal_assistant
Create Date: 2026-11-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "008_assistant_execution_queue"
down_revision: Union[str, None] = "007_personal_assistant"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistant_devices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_username", sa.String(255), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("token_sha256", sa.String(64), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_assistant_devices_owner_username", "assistant_devices", ["owner_username"])
    op.create_index("ix_assistant_devices_is_active", "assistant_devices", ["is_active"])

    op.add_column("assistant_actions", sa.Column("target_device_id", sa.String(36), nullable=True))
    op.add_column("assistant_actions", sa.Column("command_id", sa.String(36), nullable=True))
    op.add_column("assistant_actions", sa.Column("execution_nonce", sa.String(64), nullable=True))
    op.add_column("assistant_actions", sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assistant_actions", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_assistant_actions_target_device",
        "assistant_actions", "assistant_devices",
        ["target_device_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_assistant_actions_target_device_id", "assistant_actions", ["target_device_id"])
    op.create_unique_constraint("uq_assistant_actions_command_id", "assistant_actions", ["command_id"])
    op.create_unique_constraint("uq_assistant_actions_execution_nonce", "assistant_actions", ["execution_nonce"])


def downgrade() -> None:
    op.drop_constraint("uq_assistant_actions_execution_nonce", "assistant_actions", type_="unique")
    op.drop_constraint("uq_assistant_actions_command_id", "assistant_actions", type_="unique")
    op.drop_index("ix_assistant_actions_target_device_id", table_name="assistant_actions")
    op.drop_constraint("fk_assistant_actions_target_device", "assistant_actions", type_="foreignkey")
    op.drop_column("assistant_actions", "completed_at")
    op.drop_column("assistant_actions", "claimed_at")
    op.drop_column("assistant_actions", "execution_nonce")
    op.drop_column("assistant_actions", "command_id")
    op.drop_column("assistant_actions", "target_device_id")
    op.drop_index("ix_assistant_devices_is_active", table_name="assistant_devices")
    op.drop_index("ix_assistant_devices_owner_username", table_name="assistant_devices")
    op.drop_table("assistant_devices")
