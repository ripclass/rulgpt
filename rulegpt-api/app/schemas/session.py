"""Session and history schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


SessionTier = Literal["anonymous", "free", "starter", "professional", "expert", "pro"]
ConfidenceBand = Literal["high", "medium", "low"]


class HistoryItem(BaseModel):
    query_id: UUID
    query_text: str
    answer_text: str
    confidence_band: ConfidenceBand
    created_at: datetime


class SessionSummary(BaseModel):
    """One entry per session in the history sidebar."""
    session_id: UUID
    first_query: str
    query_count: int
    last_active: datetime
    queries: list[HistoryItem]
