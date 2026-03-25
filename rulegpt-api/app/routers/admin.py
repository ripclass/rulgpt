"""Admin endpoints placeholders."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.embedding import RuleEmbedding
from app.models.query import RuleGPTQuery
from app.models.rule import RuleRecord
from app.models.session import RuleGPTSession
from app.schemas.admin import (
    AnalyticsConversionResponse,
    AnalyticsQueriesResponse,
    EmbedStatusResponse,
)
from app.services.rag.embedder import DEFAULT_RULE_DATA_PATH, RuleEmbedder

from .deps import require_admin_user

router = APIRouter(prefix="/api", tags=["admin"])

_last_embed_status: dict[str, object] = {
    "status": "idle",
    "detail": "No active embedding job.",
    "report": None,
}


def _resolve_local_rules_path(local_path: str | None) -> Path:
    if local_path:
        return Path(local_path).expanduser()
    if settings.RULEGPT_LOCAL_RULES_ROOT:
        return Path(settings.RULEGPT_LOCAL_RULES_ROOT).expanduser()
    return DEFAULT_RULE_DATA_PATH


def _embedding_counts(db: Session) -> dict[str, int]:
    return {
        "stored_rules": int(db.scalar(select(func.count(RuleRecord.id))) or 0),
        "stored_embeddings": int(db.scalar(select(func.count(RuleEmbedding.id))) or 0),
    }


def _report_payload(
    *,
    include_api: bool,
    include_local: bool,
    local_path: Path,
    counts: dict[str, int],
    sync_report: dict[str, object] | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "include_api": include_api,
        "include_local": include_local,
        "local_rules_path": str(local_path),
        "counts": counts,
    }
    if sync_report is not None:
        payload["sync_report"] = sync_report
    return payload


@router.post("/embed/sync", response_model=EmbedStatusResponse)
async def sync_embeddings(
    include_api: bool = Query(default=True),
    include_local: bool = Query(default=True),
    local_path: str | None = Query(default=None),
    _=Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> EmbedStatusResponse:
    if not include_api and not include_local:
        raise HTTPException(status_code=400, detail="Enable at least one sync source.")

    resolved_local_path = _resolve_local_rules_path(local_path)
    if include_local and not resolved_local_path.exists() and not include_api:
        raise HTTPException(
            status_code=400,
            detail=f"Local rules path does not exist: {resolved_local_path}",
        )

    _last_embed_status.update(
        {
            "status": "running",
            "detail": "Embedding sync in progress.",
            "report": _report_payload(
                include_api=include_api,
                include_local=include_local,
                local_path=resolved_local_path,
                counts=_embedding_counts(db),
            ),
        }
    )

    try:
        report = await RuleEmbedder().sync_embeddings(
            db,
            include_api=include_api,
            include_local=include_local,
            local_data_path=resolved_local_path,
        )
    except Exception as exc:
        db.rollback()
        payload = _report_payload(
            include_api=include_api,
            include_local=include_local,
            local_path=resolved_local_path,
            counts=_embedding_counts(db),
        )
        detail = f"Embedding sync failed: {exc}"
        _last_embed_status.update({"status": "failed", "detail": detail, "report": payload})
        return EmbedStatusResponse(status="failed", detail=detail, report=payload)

    payload = _report_payload(
        include_api=include_api,
        include_local=include_local,
        local_path=resolved_local_path,
        counts=_embedding_counts(db),
        sync_report=report.model_dump(),
    )
    detail = (
        f"Embedding sync completed. processed={report.processed}, "
        f"rules_inserted={report.rules_inserted}, rules_updated={report.rules_updated}, "
        f"embedded={report.embedded}, updated={report.updated}, "
        f"skipped={report.skipped_unchanged}, failed={report.failed}."
    )
    _last_embed_status.update({"status": "completed", "detail": detail, "report": payload})
    return EmbedStatusResponse(status="completed", detail=detail, report=payload)


@router.get("/embed/status", response_model=EmbedStatusResponse)
async def embedding_status(
    _=Depends(require_admin_user),
    db: Session = Depends(get_db),
) -> EmbedStatusResponse:
    report = dict(_last_embed_status.get("report") or {})
    report["counts"] = _embedding_counts(db)
    return EmbedStatusResponse(
        status=str(_last_embed_status.get("status") or "idle"),
        detail=str(_last_embed_status.get("detail") or "No active embedding job."),
        report=report or None,
    )


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
