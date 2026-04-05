"""Add client_ip column to rulegpt_sessions for IP-based anonymous rate limiting.

Revision ID: 20260405_000004
Revises: 20260331_000003
Create Date: 2026-04-05 00:00:04
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260405_000004"
down_revision = "20260331_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rulegpt_sessions",
        sa.Column("client_ip", sa.String(length=45), nullable=True),
    )
    op.create_index("ix_rulegpt_sessions_client_ip", "rulegpt_sessions", ["client_ip"])


def downgrade() -> None:
    op.drop_index("ix_rulegpt_sessions_client_ip", table_name="rulegpt_sessions")
    op.drop_column("rulegpt_sessions", "client_ip")
