"""Add is_active column to rulegpt_rules and rulegpt_rule_embeddings for rule versioning.

Old rule versions are archived (is_active=false) instead of deleted,
so version history is preserved and retrieval only uses active rules.

Revision ID: 20260405_000005
Revises: 20260405_000004
Create Date: 2026-04-05 00:00:05
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260405_000005"
down_revision = "20260405_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rulegpt_rules",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_rulegpt_rules_is_active", "rulegpt_rules", ["is_active"])

    op.add_column(
        "rulegpt_rule_embeddings",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_rulegpt_rule_embeddings_is_active", "rulegpt_rule_embeddings", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_rulegpt_rule_embeddings_is_active", table_name="rulegpt_rule_embeddings")
    op.drop_column("rulegpt_rule_embeddings", "is_active")
    op.drop_index("ix_rulegpt_rules_is_active", table_name="rulegpt_rules")
    op.drop_column("rulegpt_rules", "is_active")
