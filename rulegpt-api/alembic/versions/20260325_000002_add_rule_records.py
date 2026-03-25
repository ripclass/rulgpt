"""Add normalized rule records table for DB-first launch mode.

Revision ID: 20260325_000002
Revises: 20260324_000001
Create Date: 2026-03-25 00:00:02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260325_000002"
down_revision = "20260324_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rulegpt_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_id", sa.Text(), nullable=False),
        sa.Column("rulebook", sa.String(length=128), nullable=True),
        sa.Column("article", sa.String(length=128), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("reference", sa.String(length=256), nullable=True),
        sa.Column("version", sa.String(length=64), nullable=True),
        sa.Column("domain", sa.String(length=64), nullable=True),
        sa.Column("jurisdiction", sa.String(length=64), nullable=True),
        sa.Column("document_type", sa.String(length=64), nullable=True),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("conditions", sa.JSON(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("deterministic", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("requires_llm", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("source_hint", sa.Text(), nullable=True),
        sa.Column("content_hash", sa.String(length=128), nullable=True),
        sa.Column("raw_payload", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_rules_rule_id", "rulegpt_rules", ["rule_id"], unique=True)
    op.create_index("ix_rulegpt_rules_rulebook", "rulegpt_rules", ["rulebook"])
    op.create_index("ix_rulegpt_rules_domain", "rulegpt_rules", ["domain"])
    op.create_index("ix_rulegpt_rules_jurisdiction", "rulegpt_rules", ["jurisdiction"])
    op.create_index("ix_rulegpt_rules_document_type", "rulegpt_rules", ["document_type"])
    op.create_index("ix_rulegpt_rules_content_hash", "rulegpt_rules", ["content_hash"])


def downgrade() -> None:
    op.drop_index("ix_rulegpt_rules_content_hash", table_name="rulegpt_rules")
    op.drop_index("ix_rulegpt_rules_document_type", table_name="rulegpt_rules")
    op.drop_index("ix_rulegpt_rules_jurisdiction", table_name="rulegpt_rules")
    op.drop_index("ix_rulegpt_rules_domain", table_name="rulegpt_rules")
    op.drop_index("ix_rulegpt_rules_rulebook", table_name="rulegpt_rules")
    op.drop_index("ix_rulegpt_rules_rule_id", table_name="rulegpt_rules")
    op.drop_table("rulegpt_rules")
