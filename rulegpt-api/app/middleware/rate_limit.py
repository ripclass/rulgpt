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

    async def dispatch(self, request: Request, call_next) -> Response:
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        fingerprint = request.state.client_fingerprint if hasattr(request.state, "client_fingerprint") else ""
        tier = request.state.user_tier if hasattr(request.state, "user_tier") else "anonymous"
        identifier = f"{ip}:{fingerprint}:{tier}:{request.url.path}"
        limit = (
            settings.RATE_LIMIT_PER_MIN_AUTH
            if tier in {"free", "pro"}
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

