from __future__ import annotations

from unittest.mock import ANY, AsyncMock
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
                "price_id": "price_professional_monthly",
                "plan": "professional",
                "interval": "monthly",
                "tier": "professional",
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
                "tier": "professional",
                "supabase_user": {"id": "user-123"},
            }
        ),
    )
    yield


@pytest.fixture
def oneoff_checkout_stub(monkeypatch):
    monkeypatch.setattr(
        billing.billing_client,
        "create_oneoff_checkout",
        AsyncMock(
            return_value={
                "session_id": "cs_oneoff_1",
                "checkout_url": "https://stripe.test/oneoff-checkout",
                "kind": "case_note",
                "price_id": "price_case_note",
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
        if token == "professional-token":
            return {
                "user_id": uuid4(),
                "tier": "professional",
                "claims": {"email": "professional@example.com"},
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
            "plan": "professional",
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
            "plan": "professional",
            "interval": "monthly",
            "success_url": "https://rulegpt.test/success",
            "cancel_url": "https://rulegpt.test/cancel",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "cs_test_123"
    assert data["interval"] == "monthly"
    assert data["plan"] == "professional"
    assert data["tier"] == "professional"
    billing.billing_client.create_checkout_session.assert_awaited_once()
    kwargs = billing.billing_client.create_checkout_session.await_args.kwargs
    assert kwargs["customer_email"] == "free@example.com"
    assert kwargs["plan"] == "professional"
    assert kwargs["interval"] == "monthly"
    assert kwargs["success_url"] == "https://rulegpt.test/success"
    assert kwargs["cancel_url"] == "https://rulegpt.test/cancel"


def test_subscription_endpoint_reflects_verified_request_tier(auth_stub, billing_client_stub):
    client = TestClient(_build_app())
    response = client.get(
        "/api/billing/subscription",
        headers={"Authorization": "Bearer professional-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "active",
        "tier": "professional",
        "current_period_end": None,
        "cancel_at_period_end": None,
    }


def test_subscription_endpoint_marks_enterprise_as_active(monkeypatch, billing_client_stub):
    async def _fake_verify_jwt(_token: str):
        return {
            "user_id": uuid4(),
            "tier": "enterprise",
            "claims": {"email": "enterprise@example.com"},
            "issuer": "https://example.supabase.co/auth/v1",
            "authenticated": True,
        }

    monkeypatch.setattr(auth_service, "verify_jwt", _fake_verify_jwt)
    client = TestClient(_build_app())
    response = client.get(
        "/api/billing/subscription",
        headers={"Authorization": "Bearer enterprise-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "active",
        "tier": "enterprise",
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
        db=ANY,
    )


def test_checkout_oneoff_requires_bearer_token(oneoff_checkout_stub):
    client = TestClient(_build_app())
    response = client.post("/api/billing/checkout-oneoff", json={"kind": "case_note"})

    assert response.status_code == 401


def test_checkout_oneoff_returns_url_and_passes_kind_metadata(auth_stub, oneoff_checkout_stub):
    client = TestClient(_build_app())
    response = client.post(
        "/api/billing/checkout-oneoff",
        headers={"Authorization": "Bearer free-token"},
        json={"kind": "case_note"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "cs_oneoff_1"
    assert data["checkout_url"] == "https://stripe.test/oneoff-checkout"
    assert data["kind"] == "case_note"
    billing.billing_client.create_oneoff_checkout.assert_awaited_once()
    kwargs = billing.billing_client.create_oneoff_checkout.await_args.kwargs
    assert kwargs["kind"] == "case_note"
    assert kwargs["customer_email"] == "free@example.com"


def test_checkout_oneoff_rejects_invalid_kind(auth_stub, oneoff_checkout_stub):
    client = TestClient(_build_app())
    response = client.post(
        "/api/billing/checkout-oneoff",
        headers={"Authorization": "Bearer free-token"},
        json={"kind": "not_a_real_kind"},
    )

    assert response.status_code == 422


def test_billing_status_reports_oneoff_prices_configured(monkeypatch, billing_client_stub):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_CASE_NOTE_PRICE_ID", "price_case_note")
    monkeypatch.setattr(settings, "STRIPE_DRAFT_PRICE_ID", "price_draft")
    client = TestClient(_build_app())

    response = client.get("/api/billing/status")

    assert response.status_code == 200
    assert response.json()["oneoff_prices_configured"] is True


def test_billing_status_oneoff_prices_not_configured_by_default(monkeypatch, billing_client_stub):
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_CASE_NOTE_PRICE_ID", None)
    monkeypatch.setattr(settings, "STRIPE_DRAFT_PRICE_ID", None)
    client = TestClient(_build_app())

    response = client.get("/api/billing/status")

    assert response.status_code == 200
    assert response.json()["oneoff_prices_configured"] is False
