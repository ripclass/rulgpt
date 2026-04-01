"""Session and history schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


SessionTier = Literal["anonymous", "free", "starter", "pro"]
ConfidenceBand = Literal["high", "medium", "low"]


class HistoryItem(BaseModel):
    query_id: UUID
    query_text: str
    answer_text: str
    confidence_band: ConfidenceBand
    created_at: datetime
