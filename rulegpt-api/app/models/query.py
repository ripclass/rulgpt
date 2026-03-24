"""Query model."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RuleGPTQuery(Base):
    __tablename__ = "rulegpt_queries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rulegpt_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    query_domain: Mapped[str | None] = mapped_column(String(64), nullable=True)
    query_jurisdiction: Mapped[str | None] = mapped_column(String(64), nullable=True)
    query_complexity: Mapped[str | None] = mapped_column(String(32), nullable=True)

    retrieved_rule_ids: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_band: Mapped[str] = mapped_column(String(16), nullable=False, default="low")
    citations: Mapped[dict | list] = mapped_column(JSONB, nullable=False, default=list)
    suggested_followups: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    model_used: Mapped[str | None] = mapped_column(String(128), nullable=True)
    classifier_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    show_trdr_cta: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ice_training_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )

    session = relationship("RuleGPTSession", back_populates="queries")
    feedback = relationship("RuleGPTFeedback", back_populates="query", cascade="all, delete-orphan")
    saved_answers = relationship(
        "RuleGPTSavedAnswer", back_populates="query", cascade="all, delete-orphan"
    )

