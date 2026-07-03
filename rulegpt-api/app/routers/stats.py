"""RulHub corpus stats proxy — powers the "N rules covered" landing number."""

from __future__ import annotations

import time

from fastapi import APIRouter

from app.services.integrations.rulhub_client import get_rulhub_client

router = APIRouter(prefix="/api", tags=["stats"])

_CACHE_TTL_SECONDS = 3600
_cache: tuple[float, dict] | None = None


@router.get("/stats")
async def get_stats() -> dict:
    global _cache
    now = time.monotonic()
    if _cache is not None and _cache[0] > now:
        return _cache[1]

    client = get_rulhub_client()
    corpus_stats = await client.get_stats()
    total_rules = None if not corpus_stats else (corpus_stats.get("active") or corpus_stats.get("total"))
    body = {"total_rules": total_rules}
    _cache = (now + _CACHE_TTL_SECONDS, body)
    return body
