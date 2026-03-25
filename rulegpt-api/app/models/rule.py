"""Normalized stored rule records."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RuleRecord(Base):
    __tablename__ = "rulegpt_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    rulebook: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    article: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(256), nullable=True)
    version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    document_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    conditions: Mapped[list | dict | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    deterministic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    requires_llm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    rule_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    source_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    raw_payload: Mapped[dict | None] = mapped_column("raw_payload", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
