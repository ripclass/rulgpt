"""Feedback schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


FeedbackType = Literal["thumbs_up", "thumbs_down", "correction"]


class FeedbackCreateRequest(BaseModel):
    feedback_type: FeedbackType
    correction_text: str | None = Field(default=None, max_length=2000)


class FeedbackResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    query_id: UUID
    feedback_type: FeedbackType
    correction_text: str | None
    created_at: datetime

