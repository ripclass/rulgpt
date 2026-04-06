"""Query request/response schemas."""

from __future__ import annotations

from typing import List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.session import ConfidenceBand, SessionTier


DISCLAIMER_TEXT = (
    "Based on published trade finance rules and standards. Not legal advice. "
    "Consult a qualified trade finance professional for your specific transaction."
)

TRDR_CTA_TEXT = (
    "Need to validate an actual LC document? LCopilot on TRDR Hub validates in 47 seconds. "
    "Your first 5 validations are free. ->"
)
TRDR_CTA_URL = "https://trdrhub.com"


class CitationItem(BaseModel):
    rule_id: str
    rulebook: str
    reference: str
    excerpt: str
    confidence: ConfidenceBand


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    session_token: str | None = Field(default=None, max_length=256)
    language: Literal["en", "bn", "hi"] = "en"

    @field_validator("query")
    @classmethod
    def clean_query(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Query must not be empty.")
        return cleaned


class QueryResponse(BaseModel):
    query_id: UUID
    answer: str
    citations: List[CitationItem]
    confidence_band: ConfidenceBand
    suggested_followups: List[str] = Field(default_factory=list)
    show_trdr_cta: bool = False
    trdr_cta_text: str | None = None
    trdr_cta_url: str | None = None
    disclaimer: str = DISCLAIMER_TEXT
    queries_remaining: int
    tier: SessionTier
    model_used: str | None = None
    routing_tier: str | None = None
    fallback_reasons: List[str] | None = None


class QuerySuggestion(BaseModel):
    text: str


class RuleDetailsResponse(BaseModel):
    rule_id: str
    rulebook: str | None = None
    reference: str | None = None
    title: str | None = None
    text: str | None = None
    domain: str | None = None
    jurisdiction: str | None = None
    document_type: str | None = None
    metadata: dict | None = None

