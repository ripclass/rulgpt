"""Public query endpoint."""

from __future__ import annotations

import inspect
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.session import RuleGPTSession
from app.schemas.query import DISCLAIMER_TEXT, CitationItem, QueryRequest, QueryResponse

router = APIRouter(prefix="/api", tags=["query"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _month_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)


def _get_tier(request: Request) -> str:
    return getattr(request.state, "user_tier", "anonymous")


def _get_user_id(request: Request):
    return getattr(request.state, "user_id", None)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _find_or_create_session(db: Session, request: Request, payload: QueryRequest) -> RuleGPTSession:
    session_token = payload.session_token
    user_id = _get_user_id(request)
    tier = _get_tier(request)
    ip = _client_ip(request)

    db_session = None
    if session_token:
        db_session = db.scalar(
            select(RuleGPTSession).where(RuleGPTSession.session_token == session_token)
        )

    if db_session is None:
        db_session = RuleGPTSession(
            session_token=session_token or str(uuid.uuid4()),
            user_id=user_id,
            tier=tier,
            client_ip=ip,
            language=payload.language,
            started_at=_utc_now(),
            last_active_at=_utc_now(),
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return db_session

    db_session.last_active_at = _utc_now()
    db_session.language = payload.language
    db_session.client_ip = ip
    if user_id and db_session.user_id is None:
        db_session.user_id = user_id
    db_session.tier = tier
    db.commit()
    db.refresh(db_session)
    return db_session


def _anonymous_queries_this_month_by_ip(db: Session, client_ip: str) -> int:
    """Count queries across ALL anonymous sessions from this IP this month."""
    month_start = _month_start(_utc_now())
    total = db.scalar(
        select(func.count(RuleGPTQuery.id))
        .join(RuleGPTSession, RuleGPTQuery.session_id == RuleGPTSession.id)
        .where(
            RuleGPTSession.client_ip == client_ip,
            RuleGPTSession.tier == "anonymous",
            RuleGPTQuery.created_at >= month_start,
        )
    )
    return int(total or 0)


def _tier_monthly_limit(tier: str) -> int:
    normalized = str(tier or "").strip().lower()
    if normalized in {"anonymous", "free"}:
        return settings.FREE_TIER_MONTHLY_LIMIT
    if normalized == "starter":
        return settings.STARTER_TIER_MONTHLY_LIMIT
    if normalized == "professional":
        return settings.PROFESSIONAL_TIER_MONTHLY_LIMIT
    if normalized == "expert":
        return settings.EXPERT_TIER_MONTHLY_LIMIT
    # Legacy tier names
    if normalized == "pro":
        return settings.PROFESSIONAL_TIER_MONTHLY_LIMIT
    return settings.FREE_TIER_MONTHLY_LIMIT


def _queries_this_month(db: Session, session_obj: RuleGPTSession, tier: str) -> int:
    month_start = _month_start(_utc_now())
    normalized = str(tier or "").strip().lower()

    if normalized != "anonymous" and session_obj.user_id is not None:
        total = db.scalar(
            select(func.count(RuleGPTQuery.id)).where(
                RuleGPTQuery.user_id == session_obj.user_id,
                RuleGPTQuery.created_at >= month_start,
            )
        )
        return int(total or 0)

    # Count by IP across all anonymous sessions — prevents new-tab bypass
    ip = session_obj.client_ip
    if ip and ip != "unknown":
        return _anonymous_queries_this_month_by_ip(db, ip)
    # Fallback: count by session if IP unavailable
    total = db.scalar(
        select(func.count(RuleGPTQuery.id)).where(
            RuleGPTQuery.session_id == session_obj.id,
            RuleGPTQuery.created_at >= month_start,
        )
    )
    return int(total or 0)


def _limit_reached_message(tier: str) -> str:
    normalized = str(tier or "").strip().lower()
    if normalized == "anonymous":
        return "Anonymous monthly query limit reached. Please register to continue."
    if normalized == "free":
        return "Free monthly query limit reached. Upgrade to continue."
    if normalized == "starter":
        return "Starter monthly query limit reached. Upgrade to Pro or wait for the next cycle."
    if normalized == "pro":
        return "Pro monthly query limit reached. Contact support if you need a higher limit."
    return "Monthly query limit reached."


async def _maybe_await(result):
    if inspect.isawaitable(result):
        return await result
    return result


async def _call_rag_pipeline(query_text: str, db_session: Session, language: str, user_tier: str = "free") -> dict | None:
    try:
        from app.services.rag.pipeline import process_query
    except Exception:
        return None

    try:
        raw = await _maybe_await(process_query(query=query_text, session=db_session, language=language, user_tier=user_tier))
    except Exception:
        return None

    if raw is None:
        return None
    if isinstance(raw, dict):
        return raw
    if hasattr(raw, "model_dump"):
        return raw.model_dump()
    return {
        "answer": getattr(raw, "answer", None),
        "citations": getattr(raw, "citations", None),
        "confidence_band": getattr(raw, "confidence_band", None),
        "suggested_followups": getattr(raw, "suggested_followups", None),
        "show_trdr_cta": getattr(raw, "show_trdr_cta", None),
        "model_used": getattr(raw, "model_used", None),
        "classifier_model": getattr(raw, "classifier_model", None),
        "query_domain": getattr(raw, "query_domain", None),
        "query_jurisdiction": getattr(raw, "query_jurisdiction", None),
        "query_complexity": getattr(raw, "query_complexity", None),
        "retrieved_rule_ids": getattr(raw, "retrieved_rule_ids", None),
    }


def _coerce_citations(citations: object) -> list[CitationItem]:
    if not isinstance(citations, list):
        return []
    converted: list[CitationItem] = []
    for item in citations:
        if not isinstance(item, dict):
            continue
        try:
            converted.append(CitationItem.model_validate(item))
        except Exception:
            continue
    return converted


async def process_query_request(
    payload: QueryRequest,
    request: Request,
    db: Session,
) -> QueryResponse:
    session_obj = _find_or_create_session(db, request, payload)
    tier = session_obj.tier
    monthly_limit = _tier_monthly_limit(tier)
    used_count = _queries_this_month(db, session_obj, tier)
    if used_count >= monthly_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_limit_reached_message(tier),
        )

    started = _utc_now()
    rag = await _call_rag_pipeline(payload.query, db, payload.language, user_tier=tier)
    citations = _coerce_citations((rag or {}).get("citations"))

    answer = (rag or {}).get("answer")
    if not answer:
        if citations:
            answer = "According to the available rules, here is what applies to your question."
        else:
            answer = (
                "I don't have a specific rule covering that. "
                "Here's what related rules say: no close match was found."
            )

    confidence = (rag or {}).get("confidence_band") or ("high" if citations else "low")
    if confidence not in {"high", "medium", "low"}:
        confidence = "low"

    followups = (rag or {}).get("suggested_followups") or [
        "Which jurisdiction is this transaction under?",
        "Which document type are you reviewing?",
        "Do you want related ICC references?",
    ]

    session_obj.query_count += 1
    show_trdr_cta = False

    elapsed_ms = int((_utc_now() - started).total_seconds() * 1000)
    query_row = RuleGPTQuery(
        session_id=session_obj.id,
        user_id=session_obj.user_id,
        query_text=payload.query,
        query_domain=(rag or {}).get("query_domain"),
        query_jurisdiction=(rag or {}).get("query_jurisdiction"),
        query_complexity=(rag or {}).get("query_complexity"),
        retrieved_rule_ids=(rag or {}).get("retrieved_rule_ids") or [c.rule_id for c in citations],
        answer_text=answer,
        confidence_band=confidence,
        citations=[c.model_dump() for c in citations],
        suggested_followups=followups[:3],
        model_used=(rag or {}).get("model_used"),
        classifier_model=(rag or {}).get("classifier_model"),
        latency_ms=elapsed_ms,
        show_trdr_cta=show_trdr_cta,
        ice_training_eligible=False,
        routing_tier=(rag or {}).get("routing_tier"),
    )
    db.add(query_row)
    db.add(session_obj)
    db.commit()
    db.refresh(query_row)
    db.refresh(session_obj)

    queries_remaining = max(0, monthly_limit - _queries_this_month(db, session_obj, tier))
    return QueryResponse(
        query_id=query_row.id,
        answer=query_row.answer_text,
        citations=citations,
        confidence_band=query_row.confidence_band,  # type: ignore[arg-type]
        suggested_followups=query_row.suggested_followups or [],
        show_trdr_cta=query_row.show_trdr_cta,
        trdr_cta_text=None,
        trdr_cta_url=None,
        disclaimer=DISCLAIMER_TEXT,
        queries_remaining=queries_remaining,
        tier=tier,  # type: ignore[arg-type]
        model_used=query_row.model_used,
        routing_tier=query_row.routing_tier,
        fallback_reasons=(rag or {}).get("fallback_reasons"),
    )


@router.post("/query", response_model=QueryResponse)
async def submit_query(
    payload: QueryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    return await process_query_request(payload=payload, request=request, db=db)
