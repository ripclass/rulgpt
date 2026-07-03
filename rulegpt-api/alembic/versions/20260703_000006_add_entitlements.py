"""Add rulegpt_entitlements table for one-off case-note/draft credit purchases.

Revision ID: 20260703_000006
Revises: 20260405_000005
Create Date: 2026-07-03 00:00:06
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260703_000006"
down_revision = "20260405_000005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rulegpt_entitlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("consumed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("stripe_session_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_entitlements_user_id", "rulegpt_entitlements", ["user_id"])
    op.create_index(
        "ix_rulegpt_entitlements_stripe_session_id",
        "rulegpt_entitlements",
        ["stripe_session_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_rulegpt_entitlements_stripe_session_id", table_name="rulegpt_entitlements")
    op.drop_index("ix_rulegpt_entitlements_user_id", table_name="rulegpt_entitlements")
    op.drop_table("rulegpt_entitlements")
