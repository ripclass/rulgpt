"""Export endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.saved import RuleGPTSavedAnswer
from app.schemas.export import ExportPayloadResponse, SessionExportPayloadResponse

from .deps import require_authenticated_user, require_pro_user

router = APIRouter(prefix="/api", tags=["export"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/export/query/{query_id}", response_model=ExportPayloadResponse)
async def export_single_query(
    query_id: str,
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> ExportPayloadResponse:
    query = db.scalar(select(RuleGPTQuery).where(RuleGPTQuery.id == query_id))
    if query is None:
        raise HTTPException(status_code=404, detail="Query not found.")

    if query.user_id not in {None, user_id}:
        raise HTTPException(status_code=403, detail="Not allowed to export this query.")

    payload = {
        "query": query.query_text,
        "answer": query.answer_text,
        "citations": query.citations,
        "confidence_band": query.confidence_band,
        "suggested_followups": query.suggested_followups or [],
        "created_at": query.created_at.isoformat(),
    }
    return ExportPayloadResponse(query_id=query.id, exported_at=_now(), format="json", payload=payload)


@router.get("/export/session/{session_id}", response_model=SessionExportPayloadResponse)
async def export_session(
    session_id: str,
    _=Depends(require_pro_user),
    db: Session = Depends(get_db),
) -> SessionExportPayloadResponse:
    queries = db.scalars(
        select(RuleGPTQuery)
        .where(RuleGPTQuery.session_id == session_id)
        .order_by(desc(RuleGPTQuery.created_at))
    ).all()
    if not queries:
        raise HTTPException(status_code=404, detail="Session not found.")
    payload = {
        "queries": [
            {
                "id": str(q.id),
                "query": q.query_text,
                "answer": q.answer_text,
                "citations": q.citations,
                "confidence_band": q.confidence_band,
                "created_at": q.created_at.isoformat(),
            }
            for q in queries
        ]
    }
    return SessionExportPayloadResponse(
        session_id=queries[0].session_id,
        exported_at=_now(),
        format="json",
        payload=payload,
    )

