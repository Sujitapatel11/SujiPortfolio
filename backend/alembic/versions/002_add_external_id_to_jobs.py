"""add external_id column to jobs table

Revision ID: 002_add_external_id_to_jobs
Revises: 001_create_jobs_and_proposals
Create Date: 2026-09-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_add_external_id_to_jobs'
down_revision: Union[str, None] = '001_create_jobs_and_proposals'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('jobs', sa.Column('external_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_jobs_external_id'), 'jobs', ['external_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_jobs_external_id'), table_name='jobs')
    op.drop_column('jobs', 'external_id')
