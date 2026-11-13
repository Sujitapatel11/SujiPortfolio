"""expand job hunter schema

Revision ID: 005_expand_job_hunter_schema
Revises: 004_add_appointments_table
Create Date: 2026-11-14 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '005_expand_job_hunter_schema'
down_revision: Union[str, None] = '004_add_appointments_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Expand jobs table with batch_alter_table for SQLite compatibility
    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('location', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('is_remote', sa.Boolean(), nullable=True, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('job_type', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('canonical_url', sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column('salary_min', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('salary_max', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('salary_currency', sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('match_explanation', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('skills_gap', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('raw_metadata', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))
        batch_op.create_index(batch_op.f('ix_jobs_company'), ['company'], unique=False)
        batch_op.create_index(batch_op.f('ix_jobs_canonical_url'), ['canonical_url'], unique=False)

    # 2. Expand proposals table
    with op.batch_alter_table('proposals', schema=None) as batch_op:
        batch_op.add_column(sa.Column('cover_letter', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('tailored_resume_suggestions', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('interview_questions', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')))

    # 3. Create search_audit_logs table
    op.create_table(
        'search_audit_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('query_text', sa.String(length=500), nullable=False),
        sa.Column('parsed_filters', sa.JSON(), nullable=True),
        sa.Column('provider_summaries', sa.JSON(), nullable=True),
        sa.Column('total_found', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_matched', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_search_audit_logs_id'), 'search_audit_logs', ['id'], unique=False)

    # 4. Create provider_health_records table
    op.create_table(
        'provider_health_records',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('platform', sa.String(length=100), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('is_healthy', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('missing_credentials', sa.JSON(), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_provider_health_records_id'), 'provider_health_records', ['id'], unique=False)
    op.create_index(op.f('ix_provider_health_records_platform'), 'provider_health_records', ['platform'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_provider_health_records_platform'), table_name='provider_health_records')
    op.drop_index(op.f('ix_provider_health_records_id'), table_name='provider_health_records')
    op.drop_table('provider_health_records')

    op.drop_index(op.f('ix_search_audit_logs_id'), table_name='search_audit_logs')
    op.drop_table('search_audit_logs')

    with op.batch_alter_table('proposals', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('interview_questions')
        batch_op.drop_column('tailored_resume_suggestions')
        batch_op.drop_column('cover_letter')

    with op.batch_alter_table('jobs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_jobs_canonical_url'))
        batch_op.drop_index(batch_op.f('ix_jobs_company'))
        batch_op.drop_column('updated_at')
        batch_op.drop_column('raw_metadata')
        batch_op.drop_column('skills_gap')
        batch_op.drop_column('match_explanation')
        batch_op.drop_column('expires_at')
        batch_op.drop_column('salary_currency')
        batch_op.drop_column('salary_max')
        batch_op.drop_column('salary_min')
        batch_op.drop_column('canonical_url')
        batch_op.drop_column('job_type')
        batch_op.drop_column('is_remote')
        batch_op.drop_column('location')
        batch_op.drop_column('company')
