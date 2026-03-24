"""Pro API access endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.admin import UsageResponse
from app.schemas.query import QueryRequest, QueryResponse

from .deps import require_pro_user
from .query import process_query_request

router = APIRouter(prefix="/api", tags=["api-access"])


@router.post("/v1/query", response_model=QueryResponse)
async def api_v1_query(
    payload: QueryRequest,
    request: Request,
    _=Depends(require_pro_user),
    db: Session = Depends(get_db),
) -> QueryResponse:
    return await process_query_request(payload=payload, request=request, db=db)


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    request: Request,
    _=Depends(require_pro_user),
) -> UsageResponse:
    # Placeholder usage details until API key accounting is wired.
    return UsageResponse(
        tier="pro",
        api_queries_used=0,
        api_queries_limit=settings.PRO_TIER_API_LIMIT,
    )
