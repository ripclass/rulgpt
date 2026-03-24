"""Rule details endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.query import RuleDetailsResponse

router = APIRouter(prefix="/api", tags=["rules"])


@router.get("/rules/{rule_id}", response_model=RuleDetailsResponse)
async def get_rule(rule_id: str) -> RuleDetailsResponse:
    # Prefer integration client if available.
    try:
        from app.services.integrations.rulhub_client import get_rulhub_client

        client = get_rulhub_client()
        rule = await client.get_rule(rule_id)
        return RuleDetailsResponse.model_validate(rule)
    except Exception:
        pass

    # Fallback message when integration layer is not wired.
    raise HTTPException(
        status_code=404,
        detail=(
            "Rule detail unavailable. Integration client is not active yet "
            "or rule was not found."
        ),
    )
