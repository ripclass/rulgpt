"""Task 4.3: Stripe Pro $29 plan mapping, one-off checkout, and webhook
payment-mode entitlement credits."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
import stripe

from app.services.integrations.stripe_client import StripeClient


class _FakeEntitlementDb:
    """Minimal in-memory stand-in for the sync SQLAlchemy Session methods
    `handle_webhook`'s payment-mode branch needs. No real Postgres is
    available in this environment (see tests/test_query_quota.py)."""

    def __init__(self):
        self.rows: list = []
        self._pending_filters: dict = {}
        self.commit_calls = 0

    def query(self, model):
        return self

    def filter_by(self, **kwargs):
        self._pending_filters = kwargs
        return self

    def first(self):
        for row in self.rows:
            if all(getattr(row, k) == v for k, v in self._pending_filters.items()):
                return row
        return None

    def add(self, obj):
        self.rows.append(obj)

    def commit(self):
        self.commit_calls += 1


def _client() -> StripeClient:
    return StripeClient(
        secret_key="sk_test",
        webhook_secret="whsec_test",
        supabase_auth=SimpleNamespace(set_user_tier=AsyncMock()),
    )


@pytest.mark.asyncio
async def test_pro_plan_price_resolves_and_maps_to_professional_tier(monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "STRIPE_PRO_MONTHLY_PRICE_ID", "price_pro_monthly")
    client = _client()

    assert client._price_id_for_plan_and_interval("pro", "monthly") == "price_pro_monthly"
    assert client._price_to_tier["price_pro_monthly"] == "professional"


@pytest.mark.asyncio
async def test_create_oneoff_checkout_case_note(monkeypatch) -> None:
    from app.config import settings

    captured: dict[str, object] = {}

    def _fake_checkout_create(**kwargs):
        captured.update(kwargs)
        return {"id": "cs_oneoff_1", "url": "https://stripe.test/oneoff-checkout", "mode": kwargs["mode"], "status": "open"}

    monkeypatch.setattr(stripe.checkout.Session, "create", _fake_checkout_create)
    monkeypatch.setattr(settings, "STRIPE_CASE_NOTE_PRICE_ID", "price_case_note")
    monkeypatch.setattr(settings, "STRIPE_DRAFT_PRICE_ID", "price_draft")
    client = _client()
    user_id = uuid4()

    result = await client.create_oneoff_checkout(
        user_id=user_id,
        customer_email="person@example.com",
        kind="case_note",
        success_url="https://rulgpt.test/success",
        cancel_url="https://rulgpt.test/cancel",
    )

    assert result["session_id"] == "cs_oneoff_1"
    assert result["checkout_url"] == "https://stripe.test/oneoff-checkout"
    assert captured["mode"] == "payment"
    assert captured["line_items"][0]["price"] == "price_case_note"
    assert captured["metadata"]["supabase_user_id"] == str(user_id)
    assert captured["metadata"]["artifact_kind"] == "case_note"


@pytest.mark.asyncio
async def test_create_oneoff_checkout_draft_uses_draft_price(monkeypatch) -> None:
    from app.config import settings

    captured: dict[str, object] = {}

    def _fake_checkout_create(**kwargs):
        captured.update(kwargs)
        return {"id": "cs_oneoff_2", "url": "https://stripe.test/oneoff-checkout-2", "mode": kwargs["mode"], "status": "open"}

    monkeypatch.setattr(stripe.checkout.Session, "create", _fake_checkout_create)
    monkeypatch.setattr(settings, "STRIPE_CASE_NOTE_PRICE_ID", "price_case_note")
    monkeypatch.setattr(settings, "STRIPE_DRAFT_PRICE_ID", "price_draft")
    client = _client()

    result = await client.create_oneoff_checkout(
        user_id=uuid4(),
        customer_email=None,
        kind="draft",
        success_url="https://rulgpt.test/success",
        cancel_url="https://rulgpt.test/cancel",
    )

    assert result["session_id"] == "cs_oneoff_2"
    assert captured["line_items"][0]["price"] == "price_draft"
    assert captured["metadata"]["artifact_kind"] == "draft"


@pytest.mark.asyncio
async def test_webhook_payment_mode_creates_entitlement_row(monkeypatch) -> None:
    user_id = uuid4()

    def _fake_construct_event(*, payload, sig_header, secret):
        return {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_oneoff_123",
                    "mode": "payment",
                    "metadata": {"supabase_user_id": str(user_id), "artifact_kind": "case_note"},
                }
            },
        }

    monkeypatch.setattr(stripe.Webhook, "construct_event", _fake_construct_event)
    client = _client()
    db = _FakeEntitlementDb()

    result = await client.handle_webhook(b'{"id":"evt_oneoff"}', "whsec_signature", db)

    assert result["action"] == "entitlement_granted"
    assert result["kind"] == "case_note"
    assert len(db.rows) == 1
    assert db.rows[0].stripe_session_id == "cs_oneoff_123"
    assert db.rows[0].user_id == str(user_id)
    assert db.rows[0].kind == "case_note"
    assert db.rows[0].credits == 1
    assert db.rows[0].consumed == 0
    assert db.commit_calls == 1


@pytest.mark.asyncio
async def test_webhook_payment_mode_is_idempotent_on_duplicate_event(monkeypatch) -> None:
    user_id = uuid4()

    def _fake_construct_event(*, payload, sig_header, secret):
        return {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_oneoff_dup",
                    "mode": "payment",
                    "metadata": {"supabase_user_id": str(user_id), "artifact_kind": "draft"},
                }
            },
        }

    monkeypatch.setattr(stripe.Webhook, "construct_event", _fake_construct_event)
    client = _client()
    db = _FakeEntitlementDb()

    await client.handle_webhook(b'{"id":"evt_1"}', "whsec_signature", db)
    await client.handle_webhook(b'{"id":"evt_1"}', "whsec_signature", db)

    assert len(db.rows) == 1


@pytest.mark.asyncio
async def test_webhook_subscription_mode_still_works_without_db(monkeypatch) -> None:
    """Existing subscription checkout flow must not require a db session."""
    user_id = uuid4()
    supabase_auth = SimpleNamespace(set_user_tier=AsyncMock(return_value={"id": str(user_id)}))

    def _fake_construct_event(*, payload, sig_header, secret):
        return {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "mode": "subscription",
                    "metadata": {"supabase_user_id": str(user_id)},
                    "subscription_details": {"metadata": {"rulegpt_tier": "professional"}},
                    "client_reference_id": str(user_id),
                }
            },
        }

    monkeypatch.setattr(stripe.Webhook, "construct_event", _fake_construct_event)
    client = StripeClient(secret_key="sk_test", webhook_secret="whsec_test", supabase_auth=supabase_auth)

    result = await client.handle_webhook(b'{"id":"evt_sub"}', "whsec_signature", None)

    assert result["action"] == "upgraded"
    assert result["tier"] == "professional"
