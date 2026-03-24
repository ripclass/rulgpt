"""Tier extraction middleware.

Real auth/JWT verification is intentionally deferred.
"""

from __future__ import annotations

from uuid import UUID

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


VALID_TIERS = {"anonymous", "free", "pro"}


class TierCheckMiddleware(BaseHTTPMiddleware):
    """Extract user and tier from request headers.

    This is a placeholder boundary until integrations/auth wiring is approved.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        raw_tier = (request.headers.get("x-user-tier") or "anonymous").lower().strip()
        request.state.user_tier = raw_tier if raw_tier in VALID_TIERS else "anonymous"

        raw_user_id = request.headers.get("x-user-id")
        request.state.user_id = None
        if raw_user_id:
            try:
                request.state.user_id = UUID(raw_user_id)
                if request.state.user_tier == "anonymous":
                    request.state.user_tier = "free"
            except ValueError:
                request.state.user_id = None

        request.state.client_fingerprint = (
            request.headers.get("x-client-fingerprint") or ""
        ).strip()
        return await call_next(request)

