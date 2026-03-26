"""Pro API access endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.middleware.tier_check import auth_service
from app.schemas.admin import AuthStatusResponse, UsageResponse
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


@router.get("/auth/status", response_model=AuthStatusResponse)
async def auth_status(request: Request) -> AuthStatusResponse:
    supabase_url_configured = bool(auth_service.supabase_url)
    issuer_configured = bool(auth_service.issuer)
    jwks_configured = bool(auth_service.jwks_url)
    service_role_configured = bool(auth_service.service_role_key)
    jwt_verification_ready = issuer_configured and jwks_configured
    admin_user_sync_ready = supabase_url_configured and service_role_configured

    blockers: list[str] = []
    if not jwt_verification_ready:
        blockers.append("Supabase JWT verification is not configured yet.")
    if not admin_user_sync_ready:
        blockers.append("Supabase service role access is missing, so tier sync is disabled.")

    user_id = getattr(request.state, "user_id", None)
    return AuthStatusResponse(
        supabase_url_configured=supabase_url_configured,
        issuer_configured=issuer_configured,
        jwks_configured=jwks_configured,
        service_role_configured=service_role_configured,
        jwt_verification_ready=jwt_verification_ready,
        admin_user_sync_ready=admin_user_sync_ready,
        authenticated=bool(getattr(request.state, "is_authenticated", False)),
        tier=str(getattr(request.state, "user_tier", "anonymous")),
        user_id=str(user_id) if user_id is not None else None,
        auth_issuer=getattr(request.state, "auth_issuer", None),
        auth_error=getattr(request.state, "auth_error", None),
        blockers=blockers,
    )
