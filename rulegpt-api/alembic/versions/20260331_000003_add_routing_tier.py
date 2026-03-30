"""Add routing_tier column to rulegpt_queries.

Revision ID: 20260331_000003
Revises: 20260325_000002
Create Date: 2026-03-31 00:00:03
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260331_000003"
down_revision = "20260325_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rulegpt_queries",
        sa.Column("routing_tier", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("rulegpt_queries", "routing_tier")
