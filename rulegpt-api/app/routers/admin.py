"""Admin endpoints placeholders."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.session import RuleGPTSession
from app.schemas.admin import (
    AnalyticsConversionResponse,
    AnalyticsQueriesResponse,
    EmbedStatusResponse,
)

from .deps import require_admin_user

router = APIRouter(prefix="/api", tags=["admin"])


@router.post("/embed/sync", response_model=EmbedStatusResponse)
async def sync_embeddings(_=Depends(require_admin_user)) -> EmbedStatusResponse:
    # Placeholder orchestration call. Real implementation belongs to RAG agent.
    return EmbedStatusResponse(status="queued", detail="Embedding sync queued.")


@router.get("/embed/status", response_model=EmbedStatusResponse)
async def embedding_status(_=Depends(require_admin_user)) -> EmbedStatusResponse:
    return EmbedStatusResponse(status="idle", detail="No active embedding job.")


@router.get("/analytics/queries", response_model=AnalyticsQueriesResponse)
async def analytics_queries(
    _=Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AnalyticsQueriesResponse:
    total = int(db.scalar(select(func.count(RuleGPTQuery.id))) or 0)
    anonymous = int(
        db.scalar(
            select(func.count(RuleGPTQuery.id))
            .join(RuleGPTSession, RuleGPTSession.id == RuleGPTQuery.session_id)
            .where(RuleGPTSession.tier == "anonymous")
        )
        or 0
    )
    pro = int(
        db.scalar(
            select(func.count(RuleGPTQuery.id))
            .join(RuleGPTSession, RuleGPTSession.id == RuleGPTQuery.session_id)
            .where(RuleGPTSession.tier == "pro")
        )
        or 0
    )
    registered = max(total - anonymous - pro, 0)
    return AnalyticsQueriesResponse(
        total_queries=total,
        anonymous_queries=anonymous,
        registered_queries=registered,
        pro_queries=pro,
    )


@router.get("/analytics/conversion", response_model=AnalyticsConversionResponse)
async def analytics_conversion(
    _=Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> AnalyticsConversionResponse:
    total_sessions = int(db.scalar(select(func.count(RuleGPTSession.id))) or 0)
    cta_shown = int(
        db.scalar(select(func.count(RuleGPTQuery.id)).where(RuleGPTQuery.show_trdr_cta.is_(True)))
        or 0
    )
    rate = (cta_shown / total_sessions) if total_sessions > 0 else 0.0
    return AnalyticsConversionResponse(
        total_sessions=total_sessions,
        cta_shown_count=cta_shown,
        cta_show_rate=round(rate, 4),
    )

