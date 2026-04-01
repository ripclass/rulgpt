from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.tier_check import TierCheckMiddleware, auth_service
from app.routers import billing


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(TierCheckMiddleware)
    app.include_router(billing.router)
    return app


@pytest.fixture
def billing_client_stub(monkeypatch):
    monkeypatch.setattr(
        billing.billing_client,
        "create_checkout_session",
        AsyncMock(
            return_value={
                "session_id": "cs_test_123",
                "checkout_url": "https://stripe.test/checkout",
                "price_id": "price_starter_monthly",
                "plan": "starter",
                "interval": "monthly",
                "tier": "starter",
            }
        ),
    )
    monkeypatch.setattr(
        billing.billing_client,
        "handle_webhook",
        AsyncMock(
            return_value={
                "event_type": "checkout.session.completed",
                "action": "upgraded",
                "user_id": str(uuid4()),
                "tier": "pro",
                "supabase_user": {"id": "user-123"},
            }
        ),
    )
    yield


@pytest.fixture
def auth_stub(monkeypatch):
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


def test_checkout_session_requires_bearer_token(auth_stub, billing_client_stub):
    client = TestClient(_build_app())
    response = client.post(
        "/api/billing/checkout",
        json={
            "plan": "starter",
            "interval": "monthly",
            "success_url": "https://rulegpt.test/success",
            "cancel_url": "https://rulegpt.test/cancel",
        },
    )

    assert response.status_code == 401


def test_checkout_session_succeeds_for_authenticated_user(auth_stub, billing_client_stub):
    client = TestClient(_build_app())
    response = client.post(
        "/api/billing/checkout",
        headers={"Authorization": "Bearer free-token"},
        json={
            "plan": "starter",
            "interval": "monthly",
            "success_url": "https://rulegpt.test/success",
            "cancel_url": "https://rulegpt.test/cancel",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "cs_test_123"
    assert data["interval"] == "monthly"
    assert data["plan"] == "starter"
    assert data["tier"] == "starter"
    billing.billing_client.create_checkout_session.assert_awaited_once()
    kwargs = billing.billing_client.create_checkout_session.await_args.kwargs
    assert kwargs["customer_email"] == "free@example.com"
    assert kwargs["plan"] == "starter"
    assert kwargs["interval"] == "monthly"
    assert kwargs["success_url"] == "https://rulegpt.test/success"
    assert kwargs["cancel_url"] == "https://rulegpt.test/cancel"


def test_subscription_endpoint_reflects_verified_request_tier(auth_stub, billing_client_stub):
    client = TestClient(_build_app())
    response = client.get(
        "/api/billing/subscription",
        headers={"Authorization": "Bearer pro-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "active",
        "tier": "pro",
        "current_period_end": None,
        "cancel_at_period_end": None,
    }


def test_subscription_endpoint_marks_starter_as_active(monkeypatch, billing_client_stub):
    async def _fake_verify_jwt(_token: str):
        return {
            "user_id": uuid4(),
            "tier": "starter",
            "claims": {"email": "starter@example.com"},
            "issuer": "https://example.supabase.co/auth/v1",
            "authenticated": True,
        }

    monkeypatch.setattr(auth_service, "verify_jwt", _fake_verify_jwt)
    client = TestClient(_build_app())
    response = client.get(
        "/api/billing/subscription",
        headers={"Authorization": "Bearer starter-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "active",
        "tier": "starter",
        "current_period_end": None,
        "cancel_at_period_end": None,
    }


def test_webhook_endpoint_verifies_signature_and_returns_result(auth_stub, billing_client_stub):
    client = TestClient(_build_app())
    response = client.post(
        "/api/billing/webhook",
        content=b'{"id":"evt_123"}',
        headers={"Stripe-Signature": "whsec_signature"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["action"] == "upgraded"
    billing.billing_client.handle_webhook.assert_awaited_once_with(
        payload=b'{"id":"evt_123"}',
        signature="whsec_signature",
    )
