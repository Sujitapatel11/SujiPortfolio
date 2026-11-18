"""add assistant workflow engine, execution events, and work profile

Revision ID: 009_assistant_workflow_engine
Revises: 008_assistant_execution_queue
Create Date: 2026-11-17
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "009_assistant_workflow_engine"
down_revision: Union[str, None] = "008_assistant_execution_queue"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assistant_workflows",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("session_id", sa.String(36), sa.ForeignKey("assistant_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("owner_username", sa.String(255), nullable=False),
        sa.Column("device_id", sa.String(36), sa.ForeignKey("assistant_devices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("allowed_domains", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
        sa.Column("current_step_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_steps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("context_data", sa.JSON(), nullable=False),
        sa.Column("waiting_reason", sa.Text(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_assistant_workflows_session_id", "assistant_workflows", ["session_id"])
    op.create_index("ix_assistant_workflows_owner_username", "assistant_workflows", ["owner_username"])
    op.create_index("ix_assistant_workflows_device_id", "assistant_workflows", ["device_id"])
    op.create_index("ix_assistant_workflows_status", "assistant_workflows", ["status"])
    op.create_index("ix_assistant_workflows_session_status", "assistant_workflows", ["session_id", "status"])

    op.create_table(
        "assistant_workflow_steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("workflow_id", sa.String(36), sa.ForeignKey("assistant_workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tool", sa.String(100), nullable=False),
        sa.Column("arguments", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending"),
        sa.Column("requires_approval", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("action_id", sa.String(36), sa.ForeignKey("assistant_actions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("evidence_url", sa.String(500), nullable=True),
        sa.Column("evidence_screenshot", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_assistant_workflow_steps_workflow_id", "assistant_workflow_steps", ["workflow_id"])
    op.create_index("ix_assistant_workflow_steps_status", "assistant_workflow_steps", ["status"])
    op.create_index("ix_assistant_workflow_steps_workflow_status", "assistant_workflow_steps", ["workflow_id", "status"])

    op.create_table(
        "workflow_execution_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("workflow_id", sa.String(36), sa.ForeignKey("assistant_workflows.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_id", sa.String(36), sa.ForeignKey("assistant_workflow_steps.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_workflow_execution_events_workflow_id", "workflow_execution_events", ["workflow_id"])
    op.create_index("ix_workflow_execution_events_step_id", "workflow_execution_events", ["step_id"])
    op.create_index("ix_workflow_execution_events_event_type", "workflow_execution_events", ["event_type"])

    op.create_table(
        "assistant_work_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_username", sa.String(255), nullable=False, unique=True),
        sa.Column("headline", sa.String(255), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("programming_languages", sa.JSON(), nullable=False),
        sa.Column("frameworks", sa.JSON(), nullable=False),
        sa.Column("projects", sa.JSON(), nullable=False),
        sa.Column("portfolio_links", sa.JSON(), nullable=False),
        sa.Column("github_url", sa.String(255), nullable=True),
        sa.Column("linkedin_url", sa.String(255), nullable=True),
        sa.Column("education", sa.JSON(), nullable=False),
        sa.Column("work_experience", sa.JSON(), nullable=False),
        sa.Column("preferred_job_categories", sa.JSON(), nullable=False),
        sa.Column("minimum_budget", sa.String(50), nullable=True),
        sa.Column("availability", sa.String(100), nullable=True),
        sa.Column("languages", sa.JSON(), nullable=False),
        sa.Column("excluded_job_categories", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_assistant_work_profiles_owner_username", "assistant_work_profiles", ["owner_username"])


def downgrade() -> None:
    op.drop_table("assistant_work_profiles")
    op.drop_table("workflow_execution_events")
    op.drop_table("assistant_workflow_steps")
    op.drop_table("assistant_workflows")
