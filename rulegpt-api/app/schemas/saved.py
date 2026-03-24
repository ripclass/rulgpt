"""Saved answer schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SaveAnswerRequest(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class SavedAnswerResponse(BaseModel):
    id: UUID
    query_id: UUID
    user_id: UUID
    note: str | None
    saved_at: datetime

