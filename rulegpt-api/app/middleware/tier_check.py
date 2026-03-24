"""Authentication and tier extraction middleware."""

from __future__ import annotations

from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings
from app.services.integrations.supabase_auth import SupabaseAuthService


VALID_TIERS = {"anonymous", "free", "pro"}
auth_service = SupabaseAuthService()


class TierCheckMiddleware(BaseHTTPMiddleware):
    """Resolve verified bearer auth into request state."""

    @staticmethod
    def _extract_bearer_token(request: Request) -> str | None:
        authorization = request.headers.get("authorization") or ""
        if not authorization.lower().startswith("bearer "):
            return None
        token = authorization.split(" ", 1)[1].strip()
        return token or None

    @staticmethod
    def _apply_dev_header_identity(request: Request) -> None:
        raw_tier = (request.headers.get("x-user-tier") or "anonymous").lower().strip()
        raw_user_id = request.headers.get("x-user-id")
        if not raw_user_id:
            return

        try:
            request.state.user_id = UUID(raw_user_id)
        except ValueError:
            return

        request.state.is_authenticated = True
        request.state.user_tier = raw_tier if raw_tier in VALID_TIERS else "free"
        if request.state.user_tier == "anonymous":
            request.state.user_tier = "free"
        request.state.auth_claims = {"dev_header_auth": True}
        request.state.auth_issuer = "local-dev-headers"

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.user_tier = "anonymous"
        request.state.user_id = None
        request.state.is_authenticated = False
        request.state.auth_claims = None
        request.state.auth_issuer = None
        request.state.auth_error = None

        bearer_token = self._extract_bearer_token(request)
        if bearer_token:
            try:
                auth_context = await auth_service.verify_jwt(bearer_token)
            except Exception:
                request.state.auth_error = "Invalid or expired bearer token."
            else:
                user_id = auth_context.get("user_id")
                if isinstance(user_id, UUID):
                    tier = str(auth_context.get("tier") or "free").lower().strip()
                    if tier not in VALID_TIERS:
                        tier = "free"

                    request.state.user_tier = tier
                    request.state.user_id = user_id
                    request.state.is_authenticated = True
                    request.state.auth_claims = auth_context.get("claims") or {}
                    request.state.auth_issuer = auth_context.get("issuer")
                else:
                    request.state.auth_error = "Invalid bearer token payload."

        if not request.state.is_authenticated and not settings.is_production:
            self._apply_dev_header_identity(request)

        request.state.client_fingerprint = (
            request.headers.get("x-client-fingerprint") or ""
        ).strip()
        return await call_next(request)
