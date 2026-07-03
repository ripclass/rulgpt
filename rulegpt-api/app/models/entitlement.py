"""Entitlement model — one-off credit purchases (case note / draft) redeemable
by free-tier users. Professional/enterprise users bypass entitlements entirely
(see `app.routers.deps.consume_or_require_entitlement`)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RuleGPTEntitlement(Base):
    __tablename__ = "rulegpt_entitlements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # "case_note" | "draft"
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    consumed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)  # idempotency
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
