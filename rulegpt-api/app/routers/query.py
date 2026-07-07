"""Public query endpoint."""

from __future__ import annotations

import inspect
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.session import RuleGPTSession
from app.routers.deps import client_ip as _resolve_client_ip
from app.schemas.query import DISCLAIMER_TEXT, CitationItem, QueryRequest, QueryResponse

router = APIRouter(prefix="/api", tags=["query"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _month_start(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, 1, tzinfo=timezone.utc)


def _window_start(window: str, dt: datetime) -> datetime:
    """Start of the counting window: UTC midnight for "day", 1st of month for "month"."""
    if window == "day":
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return _month_start(dt)


def _get_tier(request: Request) -> str:
    return getattr(request.state, "user_tier", "anonymous")


def _get_user_id(request: Request):
    return getattr(request.state, "user_id", None)


def _client_ip(request: Request) -> str:
    return _resolve_client_ip(request) or "unknown"


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


def _anonymous_queries_this_month_by_ip(db: Session, client_ip: str, window_start: datetime) -> int:
    """Count queries across ALL anonymous sessions from this IP within the window.

    Excludes routing_tier == "unavailable" — a failed-retrieval turn (RulHub
    fail-closed) doesn't count against the caller's quota. Uses
    `is_distinct_from` rather than `!=` so rows with a NULL routing_tier
    (e.g. pipeline errors unrelated to retrieval) are still counted, not
    silently dropped by SQL's three-valued NULL comparison logic. Also
    excludes routing_tier == "mt700" — MT700 interpreter calls have their own
    daily limit and must not consume the chat quota.
    """
    total = db.scalar(
        select(func.count(RuleGPTQuery.id))
        .join(RuleGPTSession, RuleGPTQuery.session_id == RuleGPTSession.id)
        .where(
            RuleGPTSession.client_ip == client_ip,
            RuleGPTSession.tier == "anonymous",
            RuleGPTQuery.created_at >= window_start,
            RuleGPTQuery.routing_tier.is_distinct_from("unavailable"),
            RuleGPTQuery.routing_tier.is_distinct_from("mt700"),
        )
    )
    return int(total or 0)


def _tier_limit(tier: str) -> tuple[int, str]:
    """Return (limit, window) for a tier. window is "day" or "month"."""
    normalized = str(tier or "").strip().lower()
    if normalized == "professional":
        return settings.PROFESSIONAL_TIER_MONTHLY_LIMIT, "month"
    if normalized == "enterprise":
        return settings.ENTERPRISE_TIER_MONTHLY_LIMIT, "month"
    if normalized == "anonymous":
        return settings.ANONYMOUS_DAILY_LIMIT, "day"
    return settings.FREE_TIER_DAILY_LIMIT, "day"


def _queries_this_month(db: Session, session_obj: RuleGPTSession, tier: str, window_start: datetime) -> int:
    """Count queries within the tier's counting window, excluding failed-retrieval
    turns and MT700 interpreter calls.

    A routing_tier of "unavailable" means RulHub failed closed and the
    pipeline returned RETRIEVAL_UNAVAILABLE_MESSAGE without answering the
    question, so it must not consume the caller's quota. See
    `_anonymous_queries_this_month_by_ip` for why `is_distinct_from` is used
    instead of `!=`.
    """
    normalized = str(tier or "").strip().lower()

    if normalized != "anonymous" and session_obj.user_id is not None:
        total = db.scalar(
            select(func.count(RuleGPTQuery.id)).where(
                RuleGPTQuery.user_id == session_obj.user_id,
                RuleGPTQuery.created_at >= window_start,
                RuleGPTQuery.routing_tier.is_distinct_from("unavailable"),
                RuleGPTQuery.routing_tier.is_distinct_from("mt700"),
            )
        )
        return int(total or 0)

    # Count by IP across all anonymous sessions — prevents new-tab bypass
    ip = session_obj.client_ip
    if ip and ip != "unknown":
        return _anonymous_queries_this_month_by_ip(db, ip, window_start)
    # Fallback: count by session if IP unavailable
    total = db.scalar(
        select(func.count(RuleGPTQuery.id)).where(
            RuleGPTQuery.session_id == session_obj.id,
            RuleGPTQuery.created_at >= window_start,
            RuleGPTQuery.routing_tier.is_distinct_from("unavailable"),
            RuleGPTQuery.routing_tier.is_distinct_from("mt700"),
        )
    )
    return int(total or 0)


def _limit_reached_message(tier: str) -> str:
    normalized = str(tier or "").strip().lower()
    if normalized == "anonymous":
        return (
            "You've used your 2 free answers for today. Create a free account for "
            "5 questions a day — no card needed."
        )
    if normalized == "free":
        return (
            "You've hit today's 5-question limit. Upgrade to Pro ($29/mo) for "
            "fair-use Q&A, case notes, and drafts."
        )
    if normalized == "professional":
        return "Professional monthly query limit reached. Upgrade to Enterprise or wait for the next cycle."
    if normalized == "enterprise":
        return "Enterprise monthly query limit reached. Contact support if you need a higher limit."
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
    monthly_limit, window = _tier_limit(tier)
    window_start = _window_start(window, _utc_now())
    used_count = _queries_this_month(db, session_obj, tier, window_start)
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

    queries_remaining = max(0, monthly_limit - _queries_this_month(db, session_obj, tier, window_start))
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


def _sse(event: str, data: dict) -> str:
    """Format one Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


def _response_to_done(resp: QueryResponse) -> dict:
    """Shape a completed QueryResponse into the SSE `done` payload (used when the
    streaming path falls back to the non-streaming pipeline)."""
    return {
        "query_id": str(resp.query_id),
        "answer": resp.answer,
        "citations": [c.model_dump() for c in resp.citations],
        "confidence_band": resp.confidence_band,
        "suggested_followups": resp.suggested_followups,
        "show_trdr_cta": resp.show_trdr_cta,
        "trdr_cta_text": resp.trdr_cta_text,
        "trdr_cta_url": resp.trdr_cta_url,
        "disclaimer": resp.disclaimer,
        "queries_remaining": resp.queries_remaining,
        "tier": resp.tier,
        "model_used": resp.model_used,
        "routing_tier": resp.routing_tier,
        "fallback_reasons": resp.fallback_reasons,
    }


@router.post("/query/stream")
async def submit_query_stream(
    payload: QueryRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Streaming sibling of POST /api/query. Returns an SSE stream:

        event: token   data: {"delta": "..."}     # incremental answer tokens
        event: done     data: {<QueryResponse>}    # finalized answer + metadata
        event: error    data: {"message","status"} # only on mid-stream failure

    Quota is enforced up front (a 429 is a normal HTTP error before the stream
    body). On any streaming failure the endpoint falls back to the proven
    non-streaming pipeline so the caller always gets an answer.
    """
    session_obj = _find_or_create_session(db, request, payload)
    tier = session_obj.tier
    limit, window = _tier_limit(tier)
    window_start = _window_start(window, _utc_now())
    used_count = _queries_this_month(db, session_obj, tier, window_start)
    if used_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_limit_reached_message(tier),
        )

    session_id = session_obj.id

    async def event_stream():
        started = _utc_now()
        final_result = None
        streamed_any = False
        try:
            from app.services.rag.pipeline import stream_query

            async for event in stream_query(payload.query, db, payload.language, user_tier=tier):
                if event.get("type") == "delta":
                    streamed_any = True
                    yield _sse("token", {"delta": event.get("text", "")})
                elif event.get("type") == "final":
                    final_result = event.get("result")
        except Exception:
            # Streaming blew up — guarantee an answer via the non-streaming path.
            try:
                resp = await process_query_request(payload, request, db)
            except HTTPException as he:
                yield _sse("error", {"message": str(he.detail), "status": he.status_code})
                return
            except Exception:
                yield _sse("error", {"message": "Request failed. Please try again.", "status": 500})
                return
            if not streamed_any:
                yield _sse("token", {"delta": resp.answer})
            yield _sse("done", _response_to_done(resp))
            return

        if final_result is None:
            # No final event (unexpected) — fall back for a correct answer.
            try:
                resp = await process_query_request(payload, request, db)
                if not streamed_any:
                    yield _sse("token", {"delta": resp.answer})
                yield _sse("done", _response_to_done(resp))
            except Exception:
                yield _sse("error", {"message": "Request failed. Please try again.", "status": 500})
            return

        # Persist the finalized answer (mirrors process_query_request).
        citations = _coerce_citations([c.model_dump() for c in final_result.citations])
        answer = final_result.answer
        confidence = final_result.confidence_band if final_result.confidence_band in {"high", "medium", "low"} else "low"
        followups = list(final_result.suggested_followups or [])[:3]
        try:
            session_obj.query_count += 1
            elapsed_ms = int((_utc_now() - started).total_seconds() * 1000)
            query_row = RuleGPTQuery(
                session_id=session_id,
                user_id=session_obj.user_id,
                query_text=payload.query,
                query_domain=getattr(final_result.classifier_output, "domain", None),
                query_jurisdiction=getattr(final_result.classifier_output, "jurisdiction", None),
                query_complexity=getattr(final_result.classifier_output, "complexity", None),
                retrieved_rule_ids=final_result.retrieved_rule_ids or [c.rule_id for c in citations],
                answer_text=answer,
                confidence_band=confidence,
                citations=[c.model_dump() for c in citations],
                suggested_followups=followups,
                model_used=final_result.model_used,
                classifier_model=final_result.classifier_model,
                latency_ms=elapsed_ms,
                show_trdr_cta=False,
                ice_training_eligible=False,
                routing_tier=final_result.routing_tier,
            )
            db.add(query_row)
            db.add(session_obj)
            db.commit()
            db.refresh(query_row)
            query_id = str(query_row.id)
            remaining = max(0, limit - _queries_this_month(db, session_obj, tier, window_start))
        except Exception:
            db.rollback()
            # Quota-neutral rows (unavailable/mt700) don't count; otherwise assume +1.
            query_id = None
            counted = final_result.routing_tier not in ("unavailable", "mt700")
            remaining = max(0, limit - (used_count + (1 if counted else 0)))

        yield _sse("done", {
            "query_id": query_id,
            "answer": answer,
            "citations": [c.model_dump() for c in citations],
            "confidence_band": confidence,
            "suggested_followups": followups,
            "show_trdr_cta": False,
            "trdr_cta_text": None,
            "trdr_cta_url": None,
            "disclaimer": DISCLAIMER_TEXT,
            "queries_remaining": remaining,
            "tier": tier,
            "model_used": final_result.model_used,
            "routing_tier": final_result.routing_tier,
            "fallback_reasons": final_result.fallback_reasons or None,
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
