"""Suggested query endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.query import QuerySuggestion

router = APIRouter(prefix="/api", tags=["suggestions"])


@router.get("/suggestions", response_model=list[QuerySuggestion])
async def get_suggestions() -> list[QuerySuggestion]:
    return [
        QuerySuggestion(
            text='My LC says "Cotton Woven Shirts" but my invoice says "Cotton Woven Dress Shirts". '
            "The bank rejected it. Is the word \"Dress\" really a discrepancy under UCP 600?"
        ),
        QuerySuggestion(
            text="I shipped on June 10 but the BL on-board date says June 11 because the carrier delayed "
            "the notation. The LC last shipment date is June 10. Is this late shipment?"
        ),
        QuerySuggestion(
            text="I'm exporting wooden furniture from Vietnam to Australia. The raw timber was imported "
            "from Malaysia. Does that count as originating material under RCEP cumulation rules?"
        ),
        QuerySuggestion(
            text="We received an LC for crude oil from UAE to China but the unit price is 40% below market. "
            "The beneficiary was incorporated 3 months ago. What TBML red flags should we check?"
        ),
        QuerySuggestion(
            text="I'm exporting frozen shrimp to Germany. The buyer says I need a health certificate, "
            "a catch certificate, and an IUU declaration. Which of these must the LC specifically call for?"
        ),
    ]
