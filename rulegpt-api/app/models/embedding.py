"""Rule embedding model."""

from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RuleEmbedding(Base):
    __tablename__ = "rulegpt_rule_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    rulebook: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    document_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    domain: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true", index=True)
    embedded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

