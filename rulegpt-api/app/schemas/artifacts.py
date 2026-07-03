"""Case note / draft artifact request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.query import CitationItem

ARTIFACT_DISCLAIMER_TEXT = "Advisory only — not legal advice."

DraftType = Literal[
    "bank_response", "buyer_email", "waiver_request", "amendment_request", "discrepancy_explanation"
]


class CaseNoteRequest(BaseModel):
    query_id: UUID


class DraftRequest(BaseModel):
    query_id: UUID
    draft_type: DraftType


class ArtifactResponse(BaseModel):
    title: str
    body_markdown: str
    citations: List[CitationItem]
    disclaimer: str = ARTIFACT_DISCLAIMER_TEXT
    generated_at: datetime
    # True only when a one-off credit was actually consumed for this
    # generation (clean synthesis, non-Pro/enterprise tier). Always False
    # for subscription tiers (they never consume credits) and for degraded
    # (citations-only) generations, where the consumption is released.
    credit_consumed: bool = False


class DraftArtifactResponse(ArtifactResponse):
    draft_type: DraftType
