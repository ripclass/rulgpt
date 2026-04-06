"""History endpoints."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.schemas.session import HistoryItem, SessionSummary

from .deps import require_authenticated_user

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=list[SessionSummary])
async def get_history(
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[SessionSummary]:
    """Return query history grouped by session.

    Each session shows as one entry with its first query as the title,
    the query count, and the full list of queries inside it.
    """
    rows = db.scalars(
        select(RuleGPTQuery)
        .where(RuleGPTQuery.user_id == user_id)
        .order_by(asc(RuleGPTQuery.created_at))
        .limit(500)
    ).all()

    # Group by session_id
    by_session: dict[str, list[RuleGPTQuery]] = defaultdict(list)
    for row in rows:
        key = str(row.session_id) if row.session_id else f"orphan-{row.id}"
        by_session[key].append(row)

    sessions: list[SessionSummary] = []
    for session_id, queries in by_session.items():
        queries.sort(key=lambda q: q.created_at)
        items = [
            HistoryItem(
                query_id=q.id,
                query_text=q.query_text,
                answer_text=q.answer_text,
                confidence_band=q.confidence_band,  # type: ignore[arg-type]
                created_at=q.created_at,
            )
            for q in queries
        ]
        sessions.append(
            SessionSummary(
                session_id=queries[0].session_id or queries[0].id,
                first_query=queries[0].query_text,
                query_count=len(queries),
                last_active=queries[-1].created_at,
                queries=items,
            )
        )

    # Most recent sessions first
    sessions.sort(key=lambda s: s.last_active, reverse=True)
    return sessions[:50]

