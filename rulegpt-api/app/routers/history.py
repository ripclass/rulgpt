"""History endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.schemas.session import HistoryItem

from .deps import require_authenticated_user

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=list[HistoryItem])
async def get_history(
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[HistoryItem]:
    rows = db.scalars(
        select(RuleGPTQuery)
        .where(RuleGPTQuery.user_id == user_id)
        .order_by(desc(RuleGPTQuery.created_at))
        .limit(200)
    ).all()
    return [
        HistoryItem(
            query_id=row.id,
            query_text=row.query_text,
            answer_text=row.answer_text,
            confidence_band=row.confidence_band,  # type: ignore[arg-type]
            created_at=row.created_at,
        )
        for row in rows
    ]

