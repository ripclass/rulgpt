"""Initial RuleGPT schema.

Revision ID: 20260324_000001
Revises:
Create Date: 2026-03-24 00:00:01
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260324_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "rulegpt_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("session_token", sa.Text(), nullable=False),
        sa.Column("tier", sa.String(length=32), nullable=False, server_default="anonymous"),
        sa.Column("query_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("language", sa.String(length=8), nullable=False, server_default="en"),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "last_active_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_sessions_user_id", "rulegpt_sessions", ["user_id"])
    op.create_index("ix_rulegpt_sessions_session_token", "rulegpt_sessions", ["session_token"], unique=True)

    op.create_table(
        "rulegpt_queries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("query_domain", sa.String(length=64), nullable=True),
        sa.Column("query_jurisdiction", sa.String(length=64), nullable=True),
        sa.Column("query_complexity", sa.String(length=32), nullable=True),
        sa.Column("retrieved_rule_ids", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("answer_text", sa.Text(), nullable=False),
        sa.Column("confidence_band", sa.String(length=16), nullable=False),
        sa.Column(
            "citations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("suggested_followups", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("model_used", sa.String(length=128), nullable=True),
        sa.Column("classifier_model", sa.String(length=128), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("show_trdr_cta", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("ice_training_eligible", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["session_id"], ["rulegpt_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_queries_session_id", "rulegpt_queries", ["session_id"])
    op.create_index("ix_rulegpt_queries_user_id", "rulegpt_queries", ["user_id"])
    op.create_index("ix_rulegpt_queries_created_at", "rulegpt_queries", ["created_at"])

    op.create_table(
        "rulegpt_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("query_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("feedback_type", sa.String(length=32), nullable=False),
        sa.Column("correction_text", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["query_id"], ["rulegpt_queries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_feedback_query_id", "rulegpt_feedback", ["query_id"])

    op.create_table(
        "rulegpt_rule_embeddings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rule_id", sa.Text(), nullable=False),
        sa.Column("rulebook", sa.String(length=64), nullable=True),
        sa.Column("jurisdiction", sa.String(length=64), nullable=True),
        sa.Column("document_type", sa.String(length=64), nullable=True),
        sa.Column("domain", sa.String(length=64), nullable=True),
        sa.Column("embedding", Vector(1536), nullable=True),
        sa.Column("content_hash", sa.String(length=128), nullable=True),
        sa.Column(
            "embedded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_rule_embeddings_rule_id", "rulegpt_rule_embeddings", ["rule_id"])
    op.create_index(
        "ix_rulegpt_rule_embeddings_jurisdiction",
        "rulegpt_rule_embeddings",
        ["jurisdiction"],
    )
    op.create_index(
        "ix_rulegpt_rule_embeddings_document_type",
        "rulegpt_rule_embeddings",
        ["document_type"],
    )
    op.create_index("ix_rulegpt_rule_embeddings_domain", "rulegpt_rule_embeddings", ["domain"])
    op.create_index(
        "ix_rulegpt_rule_embeddings_content_hash",
        "rulegpt_rule_embeddings",
        ["content_hash"],
    )

    op.create_table(
        "rulegpt_saved_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("query_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "saved_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["query_id"], ["rulegpt_queries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rulegpt_saved_answers_user_id", "rulegpt_saved_answers", ["user_id"])
    op.create_index("ix_rulegpt_saved_answers_query_id", "rulegpt_saved_answers", ["query_id"])


def downgrade() -> None:
    op.drop_index("ix_rulegpt_saved_answers_query_id", table_name="rulegpt_saved_answers")
    op.drop_index("ix_rulegpt_saved_answers_user_id", table_name="rulegpt_saved_answers")
    op.drop_table("rulegpt_saved_answers")

    op.drop_index("ix_rulegpt_rule_embeddings_content_hash", table_name="rulegpt_rule_embeddings")
    op.drop_index("ix_rulegpt_rule_embeddings_domain", table_name="rulegpt_rule_embeddings")
    op.drop_index("ix_rulegpt_rule_embeddings_document_type", table_name="rulegpt_rule_embeddings")
    op.drop_index("ix_rulegpt_rule_embeddings_jurisdiction", table_name="rulegpt_rule_embeddings")
    op.drop_index("ix_rulegpt_rule_embeddings_rule_id", table_name="rulegpt_rule_embeddings")
    op.drop_table("rulegpt_rule_embeddings")

    op.drop_index("ix_rulegpt_feedback_query_id", table_name="rulegpt_feedback")
    op.drop_table("rulegpt_feedback")

    op.drop_index("ix_rulegpt_queries_created_at", table_name="rulegpt_queries")
    op.drop_index("ix_rulegpt_queries_user_id", table_name="rulegpt_queries")
    op.drop_index("ix_rulegpt_queries_session_id", table_name="rulegpt_queries")
    op.drop_table("rulegpt_queries")

    op.drop_index("ix_rulegpt_sessions_session_token", table_name="rulegpt_sessions")
    op.drop_index("ix_rulegpt_sessions_user_id", table_name="rulegpt_sessions")
    op.drop_table("rulegpt_sessions")
