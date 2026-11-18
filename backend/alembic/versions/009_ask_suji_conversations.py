"""persist role-scoped Ask Suji conversations

Revision ID: 009_ask_suji_conversations
Revises: 008_assistant_execution_queue
Create Date: 2026-11-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_ask_suji_conversations"
down_revision: Union[str, None] = "008_assistant_execution_queue"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("owner_username", sa.String(255), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("summary_through_message_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_conversations_scope_owner", "chat_conversations", ["scope", "owner_username"])
    op.create_index("ix_chat_conversations_expires_at", "chat_conversations", ["expires_at"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("sources", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])
    op.create_index("ix_chat_messages_conversation_created", "chat_messages", ["conversation_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_conversation_created", table_name="chat_messages")
    op.drop_index("ix_chat_messages_conversation_id", table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index("ix_chat_conversations_expires_at", table_name="chat_conversations")
    op.drop_index("ix_chat_conversations_scope_owner", table_name="chat_conversations")
    op.drop_table("chat_conversations")
