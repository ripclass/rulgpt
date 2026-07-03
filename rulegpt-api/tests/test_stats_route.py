from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import stats

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_stats_cache():
    """The route caches for an hour in-process — reset between tests so one
    test's monkeypatched client doesn't leak into the next."""
    stats._cache = None
    yield
    stats._cache = None


def test_stats_returns_total_rules_from_active_count(monkeypatch):
    class _FakeClient:
        async def get_stats(self):
            return {"active": 15234}

    monkeypatch.setattr(stats, "get_rulhub_client", lambda: _FakeClient())

    response = client.get("/api/stats")

    assert response.status_code == 200
    assert response.json() == {"total_rules": 15234}


def test_stats_returns_null_total_rules_when_stats_unavailable(monkeypatch):
    class _FakeClient:
        async def get_stats(self):
            return None

    monkeypatch.setattr(stats, "get_rulhub_client", lambda: _FakeClient())

    response = client.get("/api/stats")

    assert response.status_code == 200
    assert response.json() == {"total_rules": None}


def test_stats_caches_within_ttl(monkeypatch):
    calls = {"count": 0}

    class _FakeClient:
        async def get_stats(self):
            calls["count"] += 1
            return {"active": 100}

    monkeypatch.setattr(stats, "get_rulhub_client", lambda: _FakeClient())

    first = client.get("/api/stats")
    second = client.get("/api/stats")

    assert first.json() == {"total_rules": 100}
    assert second.json() == {"total_rules": 100}
    assert calls["count"] == 1
