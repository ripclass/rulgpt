"""Rule details endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.query import RuleDetailsResponse
from app.services.rag.rule_store import get_rule_details

router = APIRouter(prefix="/api", tags=["rules"])


@router.get("/rules/{rule_id}", response_model=RuleDetailsResponse)
async def get_rule(rule_id: str, db: Session = Depends(get_db)) -> RuleDetailsResponse:
    if settings.RETRIEVAL_BACKEND == "rulhub":
        return await _get_rule_rulhub_primary(rule_id)

    # Local rollback path (RETRIEVAL_BACKEND=local): local store first,
    # RulHub as a best-effort fallback.
    db_rule = get_rule_details(db, rule_id)
    if db_rule is not None:
        return RuleDetailsResponse.model_validate(db_rule)

    try:
        from app.services.integrations.rulhub_client import get_rulhub_client

        client = get_rulhub_client()
        rule = await client.get_rule(rule_id)
        if rule is not None:
            return RuleDetailsResponse.model_validate(rule)
    except Exception:
        pass

    raise HTTPException(
        status_code=404,
        detail=(
            "Rule detail unavailable. Integration client is not active yet "
            "or rule was not found."
        ),
    )


async def _get_rule_rulhub_primary(rule_id: str) -> RuleDetailsResponse:
    # Fail-closed like the query pipeline: never serve possibly-stale local
    # rows when RulHub is the configured backend.
    from app.services.integrations.rulhub_client import RulHubClientError, get_rulhub_client

    client = get_rulhub_client()
    try:
        rule = await client.get_rule(rule_id, allow_fallback=False)
    except RulHubClientError as exc:
        raise HTTPException(
            status_code=503,
            detail="Rule details are temporarily unavailable. Please try again shortly.",
        ) from exc

    if rule is not None:
        return RuleDetailsResponse.model_validate(rule)

    raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' was not found.")
