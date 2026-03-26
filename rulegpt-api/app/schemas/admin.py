"""Admin and usage schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class EmbedStatusResponse(BaseModel):
    status: str
    detail: str | None = None
    report: dict[str, Any] | None = None


class AnalyticsQueriesResponse(BaseModel):
    total_queries: int
    anonymous_queries: int
    registered_queries: int
    pro_queries: int


class AnalyticsConversionResponse(BaseModel):
    total_sessions: int
    cta_shown_count: int
    cta_show_rate: float


class UsageResponse(BaseModel):
    tier: str
    api_queries_used: int
    api_queries_limit: int


class AuthStatusResponse(BaseModel):
    supabase_url_configured: bool
    issuer_configured: bool
    jwks_configured: bool
    service_role_configured: bool
    jwt_verification_ready: bool
    admin_user_sync_ready: bool
    authenticated: bool
    tier: str
    user_id: str | None = None
    auth_issuer: str | None = None
    auth_error: str | None = None
    blockers: list[str]
