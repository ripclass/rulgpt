"""Case note + draft correspondence endpoints — behind Pro or one-off entitlements."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.query import RuleGPTQuery
from app.schemas.artifacts import (
    ARTIFACT_DISCLAIMER_TEXT,
    ArtifactResponse,
    CaseNoteRequest,
    DraftArtifactResponse,
    DraftRequest,
)
from app.schemas.query import CitationItem
from app.services.artifacts import generate_case_note, generate_draft
from app.services.integrations.llm_client import OpenRouterLLMClient

from .deps import (
    consume_or_require_entitlement,
    get_request_tier,
    release_entitlement_credit,
    require_authenticated_user,
)

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])

llm_client = OpenRouterLLMClient()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _load_owned_query(db: Session, query_id, user_id) -> RuleGPTQuery:
    query_row = db.scalar(select(RuleGPTQuery).where(RuleGPTQuery.id == query_id))
    if query_row is None or query_row.user_id != user_id:
        raise HTTPException(status_code=404, detail="Query not found.")
    return query_row


def _coerce_citations(citations: object) -> list[CitationItem]:
    if not isinstance(citations, list):
        return []
    out: list[CitationItem] = []
    for item in citations:
        if not isinstance(item, dict):
            continue
        try:
            out.append(CitationItem.model_validate(item))
        except Exception:
            continue
    return out


@router.post("/case-note", response_model=ArtifactResponse)
async def create_case_note(
    payload: CaseNoteRequest,
    request: Request,
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> ArtifactResponse:
    query_row = _load_owned_query(db, payload.query_id, user_id)
    tier = get_request_tier(request)
    entitlement_row = consume_or_require_entitlement(db, str(user_id), tier, "case_note")

    result = await generate_case_note(
        llm_client, query_row.query_text, query_row.answer_text, query_row.citations or []
    )
    credit_consumed = entitlement_row is not None
    if result.get("degraded") and entitlement_row is not None:
        release_entitlement_credit(db, entitlement_row)
        credit_consumed = False
    db.commit()

    return ArtifactResponse(
        title=result["title"],
        body_markdown=result["body_markdown"],
        citations=_coerce_citations(result["citations"]),
        disclaimer=ARTIFACT_DISCLAIMER_TEXT,
        generated_at=_utc_now(),
        credit_consumed=credit_consumed,
    )


@router.post("/draft", response_model=DraftArtifactResponse)
async def create_draft(
    payload: DraftRequest,
    request: Request,
    user_id=Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> DraftArtifactResponse:
    query_row = _load_owned_query(db, payload.query_id, user_id)
    tier = get_request_tier(request)
    entitlement_row = consume_or_require_entitlement(db, str(user_id), tier, "draft")

    result = await generate_draft(
        llm_client, query_row.query_text, query_row.answer_text, query_row.citations or [], payload.draft_type
    )
    credit_consumed = entitlement_row is not None
    if result.get("degraded") and entitlement_row is not None:
        release_entitlement_credit(db, entitlement_row)
        credit_consumed = False
    db.commit()

    return DraftArtifactResponse(
        title=result["title"],
        body_markdown=result["body_markdown"],
        citations=_coerce_citations(result["citations"]),
        disclaimer=ARTIFACT_DISCLAIMER_TEXT,
        generated_at=_utc_now(),
        draft_type=result["draft_type"],
        credit_consumed=credit_consumed,
    )
