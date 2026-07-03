"""Daily/monthly quota window tests for the query router.

The quota-counting helpers (`_queries_this_month`,
`_anonymous_queries_this_month_by_ip`) run real SQL against
`rulegpt_queries`/`rulegpt_sessions`, so these tests monkeypatch them
directly rather than standing up a Postgres instance — consistent with the
rest of this suite (see `tests/rag/test_db_first_launch.py`,
`tests/test_billing_routes.py`) which avoids real DB connections entirely.
The 429-triggering paths exercised here short-circuit `process_query_request`
before any DB write happens, so no fake `db` session is needed for them.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.config import settings
from app.routers import query as query_router


def _fake_session(tier: str, client_ip: str = "203.0.113.5"):
    return SimpleNamespace(
        id=uuid4(),
        tier=tier,
        client_ip=client_ip,
        user_id=None,
        query_count=0,
    )


def _fake_request(tier: str):
    return SimpleNamespace(
        state=SimpleNamespace(user_tier=tier, user_id=None),
        headers={},
        client=None,
    )


class _FakePayload:
    def __init__(self, query: str = "What is UCP600 article 14?"):
        self.query = query
        self.session_token = None
        self.language = "en"


# ---------------------------------------------------------------------------
# Pure function unit tests
# ---------------------------------------------------------------------------


def test_tier_limit_anonymous_is_daily():
    assert query_router._tier_limit("anonymous") == (settings.ANONYMOUS_DAILY_LIMIT, "day")


def test_tier_limit_free_is_daily():
    assert query_router._tier_limit("free") == (settings.FREE_TIER_DAILY_LIMIT, "day")


def test_tier_limit_professional_stays_monthly():
    assert query_router._tier_limit("professional") == (
        settings.PROFESSIONAL_TIER_MONTHLY_LIMIT,
        "month",
    )


def test_tier_limit_enterprise_stays_monthly():
    assert query_router._tier_limit("enterprise") == (
        settings.ENTERPRISE_TIER_MONTHLY_LIMIT,
        "month",
    )


def test_window_start_day_truncates_to_utc_midnight():
    now = datetime(2026, 7, 3, 14, 32, 9, 500000, tzinfo=timezone.utc)
    assert query_router._window_start("day", now) == datetime(2026, 7, 3, 0, 0, 0, 0, tzinfo=timezone.utc)


def test_window_start_month_truncates_to_first_of_month():
    now = datetime(2026, 7, 3, 14, 32, 9, 500000, tzinfo=timezone.utc)
    assert query_router._window_start("month", now) == datetime(2026, 7, 1, 0, 0, 0, 0, tzinfo=timezone.utc)


def test_limit_reached_message_anonymous_exact_copy():
    assert query_router._limit_reached_message("anonymous") == (
        "You've used your 2 free answers for today. Create a free account for 5 questions a day — no card needed."
    )


def test_limit_reached_message_free_exact_copy():
    assert query_router._limit_reached_message("free") == (
        "You've hit today's 5-question limit. Upgrade to Pro ($29/mo) for fair-use Q&A, case notes, and drafts."
    )


# ---------------------------------------------------------------------------
# Endpoint-level 429 boundary tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_anonymous_third_query_same_day_returns_429(monkeypatch):
    monkeypatch.setattr(
        query_router, "_find_or_create_session",
        lambda db, request, payload: _fake_session("anonymous"),
    )
    monkeypatch.setattr(
        query_router, "_queries_this_month",
        lambda db, session_obj, tier, window_start: settings.ANONYMOUS_DAILY_LIMIT,
    )

    with pytest.raises(HTTPException) as exc_info:
        await query_router.process_query_request(
            payload=_FakePayload(), request=_fake_request("anonymous"), db=None
        )

    assert exc_info.value.status_code == 429
    assert exc_info.value.detail == query_router._limit_reached_message("anonymous")


@pytest.mark.asyncio
async def test_free_sixth_query_same_day_returns_429(monkeypatch):
    monkeypatch.setattr(
        query_router, "_find_or_create_session",
        lambda db, request, payload: _fake_session("free"),
    )
    monkeypatch.setattr(
        query_router, "_queries_this_month",
        lambda db, session_obj, tier, window_start: settings.FREE_TIER_DAILY_LIMIT,
    )

    with pytest.raises(HTTPException) as exc_info:
        await query_router.process_query_request(
            payload=_FakePayload(), request=_fake_request("free"), db=None
        )

    assert exc_info.value.status_code == 429
    assert exc_info.value.detail == query_router._limit_reached_message("free")


@pytest.mark.asyncio
async def test_professional_under_daily_count_but_over_old_limit_not_blocked_by_day_window(monkeypatch):
    """Professional must never be gated by a *daily* count — only monthly."""
    monkeypatch.setattr(
        query_router, "_find_or_create_session",
        lambda db, request, payload: _fake_session("professional"),
    )
    calls = []

    def _fake_count(db, session_obj, tier, window_start):
        calls.append(window_start)
        # Below the monthly limit, but well above what any daily anon/free limit would allow.
        return 50

    monkeypatch.setattr(query_router, "_queries_this_month", _fake_count)

    async def _fake_rag(*a, **k):
        return {"answer": "ok", "citations": [], "confidence_band": "high", "routing_tier": "sonnet"}

    monkeypatch.setattr(query_router, "_call_rag_pipeline", _fake_rag)

    class _FakeDb:
        def add(self, *a, **k):
            pass

        def commit(self):
            pass

        def refresh(self, obj):
            if not hasattr(obj, "id") or obj.id is None:
                obj.id = uuid4()
            if not hasattr(obj, "answer_text"):
                obj.answer_text = "ok"
            if not hasattr(obj, "confidence_band"):
                obj.confidence_band = "high"
            if not hasattr(obj, "suggested_followups"):
                obj.suggested_followups = []
            if not hasattr(obj, "show_trdr_cta"):
                obj.show_trdr_cta = False
            if not hasattr(obj, "model_used"):
                obj.model_used = "sonnet"
            if not hasattr(obj, "routing_tier"):
                obj.routing_tier = "sonnet"

    result = await query_router.process_query_request(
        payload=_FakePayload(), request=_fake_request("professional"), db=_FakeDb()
    )

    assert result.tier == "professional"
    # The window_start passed to the counting helper must be a month boundary, not a day boundary.
    assert calls[0].day == 1
    assert calls[0].hour == 0
