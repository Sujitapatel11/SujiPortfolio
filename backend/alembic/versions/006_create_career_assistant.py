"""create private career assistant tables

Revision ID: 006_create_career_assistant
Revises: 005_add_inquiries_table
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "006_create_career_assistant"
down_revision: Union[str, None] = "005_add_inquiries_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "career_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_json", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "career_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_key", sa.String(500), nullable=False),
        sa.Column("source_name", sa.String(160), nullable=False),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("company", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("country", sa.String(100), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("work_mode", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("applicant_eligibility", sa.String(30), nullable=False, server_default="unknown"),
        sa.Column("salary_text", sa.String(255), nullable=True),
        sa.Column("closing_date", sa.Date(), nullable=True),
        sa.Column("job_status", sa.String(30), nullable=False, server_default="unverified"),
        sa.Column("skills", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_key", name="uq_career_jobs_source_key"),
    )
    op.create_index("ix_career_jobs_id", "career_jobs", ["id"])
    op.create_index("ix_career_jobs_title", "career_jobs", ["title"])
    op.create_index("ix_career_jobs_company", "career_jobs", ["company"])
    op.create_index("ix_career_jobs_country", "career_jobs", ["country"])
    op.create_index("ix_career_jobs_job_status", "career_jobs", ["job_status"])
    op.create_table(
        "career_applications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="saved"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_career_applications_id", "career_applications", ["id"])
    op.create_index("ix_career_applications_job_id", "career_applications", ["job_id"])

def downgrade() -> None:
    op.drop_index("ix_career_applications_job_id", table_name="career_applications")
    op.drop_index("ix_career_applications_id", table_name="career_applications")
    op.drop_table("career_applications")
    op.drop_index("ix_career_jobs_job_status", table_name="career_jobs")
    op.drop_index("ix_career_jobs_country", table_name="career_jobs")
    op.drop_index("ix_career_jobs_company", table_name="career_jobs")
    op.drop_index("ix_career_jobs_title", table_name="career_jobs")
    op.drop_index("ix_career_jobs_id", table_name="career_jobs")
    op.drop_table("career_jobs")
    op.drop_table("career_profiles")
