"""Suggested query endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.query import QuerySuggestion

router = APIRouter(prefix="/api", tags=["suggestions"])


@router.get("/suggestions", response_model=list[QuerySuggestion])
async def get_suggestions() -> list[QuerySuggestion]:
    return [
        QuerySuggestion(text="What documents are required for a CIF shipment under UCP600?"),
        QuerySuggestion(text="Does my garment qualify for RCEP preferential tariff from Bangladesh?"),
        QuerySuggestion(text="What are OFAC requirements for trading with UAE counterparties?"),
        QuerySuggestion(text="What is the difference between UCP600 and eUCP 2.1?"),
        QuerySuggestion(text="How does ISBP745 define a compliant bill of lading?"),
    ]

