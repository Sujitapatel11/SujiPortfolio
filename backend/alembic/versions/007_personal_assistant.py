"""create personal assistant persistence tables

Revision ID: 007_personal_assistant
Revises: 006_expand_job_hunter_schema
Create Date: 2026-11-14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_personal_assistant"
down_revision: Union[str, None] = "006_expand_job_hunter_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistant_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("owner_username", sa.String(255), nullable=False),
        sa.Column("device_id", sa.String(128), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("input_mode", sa.String(16), nullable=False, server_default="voice"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assistant_sessions_owner_username", "assistant_sessions", ["owner_username"])
    op.create_index("ix_assistant_sessions_status", "assistant_sessions", ["status"])

    op.create_table(
        "assistant_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("input_mode", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_assistant_messages_session_id", "assistant_messages", ["session_id"])

    op.create_table(
        "assistant_actions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tool", sa.String(100), nullable=False),
        sa.Column("arguments", sa.JSON(), nullable=False),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("risk", sa.String(16), nullable=False),
        sa.Column("payload_sha256", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="awaiting_approval"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("approved_by", sa.String(length=255), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_reason", sa.Text(), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=100), nullable=True),
    )
    op.create_index("ix_assistant_actions_session_id", "assistant_actions", ["session_id"])
    op.create_index("ix_assistant_actions_status", "assistant_actions", ["status"])
    op.create_index("ix_assistant_actions_session_status", "assistant_actions", ["session_id", "status"])

    op.create_table(
        "assistant_audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_id", sa.String(36), sa.ForeignKey("assistant_actions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("actor", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_assistant_audit_events_session_id", "assistant_audit_events", ["session_id"])
    op.create_index("ix_assistant_audit_events_action_id", "assistant_audit_events", ["action_id"])
    op.create_index("ix_assistant_audit_events_event_type", "assistant_audit_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_assistant_audit_events_event_type", table_name="assistant_audit_events")
    op.drop_index("ix_assistant_audit_events_action_id", table_name="assistant_audit_events")
    op.drop_index("ix_assistant_audit_events_session_id", table_name="assistant_audit_events")
    op.drop_table("assistant_audit_events")
    op.drop_index("ix_assistant_actions_session_status", table_name="assistant_actions")
    op.drop_index("ix_assistant_actions_status", table_name="assistant_actions")
    op.drop_index("ix_assistant_actions_session_id", table_name="assistant_actions")
    op.drop_table("assistant_actions")
    op.drop_index("ix_assistant_messages_session_id", table_name="assistant_messages")
    op.drop_table("assistant_messages")
    op.drop_index("ix_assistant_sessions_status", table_name="assistant_sessions")
    op.drop_index("ix_assistant_sessions_owner_username", table_name="assistant_sessions")
    op.drop_table("assistant_sessions")
