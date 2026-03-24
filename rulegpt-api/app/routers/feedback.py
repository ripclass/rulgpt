"""Feedback endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.feedback import RuleGPTFeedback
from app.models.query import RuleGPTQuery
from app.schemas.feedback import FeedbackCreateRequest, FeedbackResponse

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post("/feedback/{query_id}", response_model=FeedbackResponse)
async def submit_feedback(
    query_id: str,
    payload: FeedbackCreateRequest,
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    query = db.scalar(select(RuleGPTQuery).where(RuleGPTQuery.id == query_id))
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found.")

    row = RuleGPTFeedback(
        query_id=query.id,
        feedback_type=payload.feedback_type,
        correction_text=payload.correction_text,
    )
    db.add(row)

    # ICE eligibility rule from product brief.
    if (
        payload.feedback_type == "thumbs_up"
        and query.confidence_band == "high"
        and isinstance(query.citations, list)
        and len(query.citations) > 0
    ):
        query.ice_training_eligible = True
        db.add(query)

    db.commit()
    db.refresh(row)
    return FeedbackResponse.model_validate(row)

