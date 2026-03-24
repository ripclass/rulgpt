from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware, _limiter
from app.middleware.tier_check import TierCheckMiddleware, auth_service


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, window_seconds=60)
    app.add_middleware(TierCheckMiddleware)

    @app.get("/limited")
    async def limited():
        return {"ok": True}

    return app


@pytest.fixture
def auth_tokens(monkeypatch):
    async def _fake_verify_jwt(token: str):
        if token == "free-token":
            return {
                "user_id": uuid4(),
                "tier": "free",
                "claims": {"email": "free@example.com"},
                "issuer": "https://example.supabase.co/auth/v1",
                "authenticated": True,
            }
        if token == "pro-token":
            return {
                "user_id": uuid4(),
                "tier": "pro",
                "claims": {"email": "pro@example.com"},
                "issuer": "https://example.supabase.co/auth/v1",
                "authenticated": True,
            }
        raise ValueError("invalid token")

    monkeypatch.setattr(auth_service, "verify_jwt", _fake_verify_jwt)
    yield


@pytest.fixture(autouse=True)
def _reset_rate_limiter(monkeypatch):
    _limiter._buckets.clear()
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MIN_ANON", 1)
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MIN_AUTH", 3)
    yield
    _limiter._buckets.clear()


def test_anonymous_requests_use_anonymous_limit(auth_tokens):
    client = TestClient(_build_app())
    assert client.get("/limited").status_code == 200
    assert client.get("/limited").status_code == 429


def test_free_requests_use_auth_limit(auth_tokens):
    client = TestClient(_build_app())
    headers = {"Authorization": "Bearer free-token"}
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 429


def test_pro_requests_use_auth_limit(auth_tokens):
    client = TestClient(_build_app())
    headers = {"Authorization": "Bearer pro-token"}
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 200
    assert client.get("/limited", headers=headers).status_code == 429
