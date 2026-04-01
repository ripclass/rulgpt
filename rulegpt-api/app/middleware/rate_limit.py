"""Basic in-memory rate limiting middleware."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings


@dataclass
class RequestStamp:
    timestamp: float


class InMemorySlidingWindowLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[RequestStamp]] = defaultdict(deque)

    def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.time()
        bucket = self._buckets[key]
        cutoff = now - window_seconds
        while bucket and bucket[0].timestamp < cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(RequestStamp(timestamp=now))
        return True


_limiter = InMemorySlidingWindowLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple path-level rate limiter.

    This middleware provides baseline abuse protection. Product-tier monthly
    limits remain enforced in `/api/query`.
    """

    def __init__(self, app, window_seconds: int = 60):
        super().__init__(app)
        self.window_seconds = window_seconds
        self.exempt_paths = {"/health", "/docs", "/openapi.json"}

    @staticmethod
    def _resolve_tier(request: Request) -> str:
        tier = request.state.user_tier if hasattr(request.state, "user_tier") else None
        if tier in {"anonymous", "free", "starter", "pro"}:
            return tier

        raw_tier = (request.headers.get("x-user-tier") or "anonymous").lower().strip()
        if raw_tier not in {"anonymous", "free", "starter", "pro"}:
            raw_tier = "anonymous"

        # Match TierCheck placeholder behavior when a user id is present.
        raw_user_id = request.headers.get("x-user-id")
        if raw_user_id and raw_tier == "anonymous":
            return "free"
        return raw_tier

    @staticmethod
    def _resolve_fingerprint(request: Request) -> str:
        if hasattr(request.state, "client_fingerprint"):
            value = request.state.client_fingerprint
            if isinstance(value, str):
                return value
        return (request.headers.get("x-client-fingerprint") or "").strip()

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        fingerprint = self._resolve_fingerprint(request)
        tier = self._resolve_tier(request)
        identifier = f"{ip}:{fingerprint}:{tier}:{request.url.path}"
        limit = (
            settings.RATE_LIMIT_PER_MIN_AUTH
            if tier in {"free", "starter", "pro"}
            else settings.RATE_LIMIT_PER_MIN_ANON
        )
        allowed = _limiter.allow(identifier, limit=limit, window_seconds=self.window_seconds)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limited",
                    "message": "Rate limit exceeded. Please retry in a minute.",
                },
            )
        return await call_next(request)
