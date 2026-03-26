from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.tier_check import TierCheckMiddleware, auth_service
from app.routers import api_access, billing


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(TierCheckMiddleware)
    app.include_router(api_access.router)
    app.include_router(billing.router)
    return app


@pytest.fixture
def auth_configured(monkeypatch):
    async def _fake_verify_jwt(token: str):
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
    monkeypatch.setattr(auth_service, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(auth_service, "issuer", "https://example.supabase.co/auth/v1")
    monkeypatch.setattr(auth_service, "jwks_url", "https://example.supabase.co/auth/v1/.well-known/jwks.json")
    monkeypatch.setattr(auth_service, "service_role_key", "service-role")
    yield


@pytest.fixture
def billing_configured(monkeypatch):
    monkeypatch.setattr(billing.billing_client, "secret_key", "sk_test")
    monkeypatch.setattr(billing.billing_client, "webhook_secret", "whsec_test")
    monkeypatch.setattr(billing.billing_client, "monthly_price_id", "price_monthly")
    monkeypatch.setattr(billing.billing_client, "annual_price_id", "price_annual")
    yield


def test_auth_status_reflects_verified_request_state(auth_configured):
    client = TestClient(_build_app())

    response = client.get("/api/auth/status", headers={"Authorization": "Bearer pro-token"})

    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["tier"] == "pro"
    assert data["jwt_verification_ready"] is True
    assert data["admin_user_sync_ready"] is True
    assert data["blockers"] == []


def test_auth_status_reports_missing_supabase_blockers(monkeypatch):
    monkeypatch.setattr(auth_service, "supabase_url", "")
    monkeypatch.setattr(auth_service, "issuer", "")
    monkeypatch.setattr(auth_service, "jwks_url", "")
    monkeypatch.setattr(auth_service, "service_role_key", "")

    client = TestClient(_build_app())

    response = client.get("/api/auth/status")

    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert data["jwt_verification_ready"] is False
    assert data["admin_user_sync_ready"] is False
    assert "Supabase JWT verification is not configured yet." in data["blockers"]
    assert "Supabase service role access is missing, so tier sync is disabled." in data["blockers"]


def test_billing_status_reports_checkout_and_webhook_readiness(billing_configured):
    client = TestClient(_build_app())

    response = client.get("/api/billing/status")

    assert response.status_code == 200
    data = response.json()
    assert data["stripe_configured"] is True
    assert data["checkout_ready"] is True
    assert data["webhook_ready"] is True
    assert data["blockers"] == []
    assert data["supported_intervals"] == ["monthly", "annual"]


def test_billing_status_reports_missing_stripe_blockers(monkeypatch):
    monkeypatch.setattr(billing.billing_client, "secret_key", "")
    monkeypatch.setattr(billing.billing_client, "webhook_secret", "")
    monkeypatch.setattr(billing.billing_client, "monthly_price_id", "")
    monkeypatch.setattr(billing.billing_client, "annual_price_id", "")

    client = TestClient(_build_app())

    response = client.get("/api/billing/status")

    assert response.status_code == 200
    data = response.json()
    assert data["checkout_ready"] is False
    assert data["webhook_ready"] is False
    assert "Stripe secret key is missing." in data["blockers"]
    assert "Monthly Stripe price ID is missing." in data["blockers"]
    assert "Annual Stripe price ID is missing." in data["blockers"]
    assert "Stripe webhook secret is missing." in data["blockers"]
