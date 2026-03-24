"""Saved answers endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.saved import RuleGPTSavedAnswer
from app.schemas.saved import SaveAnswerRequest, SavedAnswerResponse

from .deps import require_authenticated_user

router = APIRouter(prefix="/api", tags=["saved"])


@router.post("/save/{query_id}", response_model=SavedAnswerResponse)
async def save_answer(
    query_id: str,
    payload: SaveAnswerRequest,
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> SavedAnswerResponse:
    query = db.scalar(select(RuleGPTQuery).where(RuleGPTQuery.id == query_id))
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found.")

    existing = db.scalar(
        select(RuleGPTSavedAnswer).where(
            RuleGPTSavedAnswer.user_id == user_id,
            RuleGPTSavedAnswer.query_id == query.id,
        )
    )
    if existing:
        existing.note = payload.note
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return SavedAnswerResponse.model_validate(existing)

    row = RuleGPTSavedAnswer(user_id=user_id, query_id=query.id, note=payload.note)
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedAnswerResponse.model_validate(row)


@router.get("/saved", response_model=list[SavedAnswerResponse])
async def list_saved(
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[SavedAnswerResponse]:
    rows = db.scalars(
        select(RuleGPTSavedAnswer)
        .where(RuleGPTSavedAnswer.user_id == user_id)
        .order_by(desc(RuleGPTSavedAnswer.saved_at))
    ).all()
    return [SavedAnswerResponse.model_validate(row) for row in rows]


@router.delete("/saved/{saved_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved(
    saved_id: str,
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Response:
    row = db.scalar(
        select(RuleGPTSavedAnswer).where(
            RuleGPTSavedAnswer.id == saved_id,
            RuleGPTSavedAnswer.user_id == user_id,
        )
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Saved answer not found.")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
