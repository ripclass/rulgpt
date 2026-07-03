"""MT700 interpreter request/response schemas."""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

from app.schemas.query import CitationItem

MT700_DISCLAIMER_TEXT = "Advisory only — not legal advice."
MT700_CTA_TEXT = "Need the full document check? → LCopilot"
MT700_CTA_URL = "https://trdrhub.com/lcopilot"


class MT700InterpretRequest(BaseModel):
    text: str = Field(min_length=50, max_length=20000)


class MT700Field(BaseModel):
    tag: str
    name: str
    content: str


class MT700Flag(BaseModel):
    tag: str
    name: str
    note: str


class InterpretResponse(BaseModel):
    fields: List[MT700Field]
    flags: List[MT700Flag]
    answer: str
    citations: List[CitationItem]
    disclaimer: str = MT700_DISCLAIMER_TEXT
    cta_text: str = MT700_CTA_TEXT
    cta_url: str = MT700_CTA_URL
