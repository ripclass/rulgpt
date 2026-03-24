from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
import stripe
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jose import jwt
from jose.utils import base64url_encode

from app.services.integrations.stripe_client import StripeClient
from app.services.integrations.supabase_auth import SupabaseAuthService


def _make_rsa_jwks():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_numbers = private_key.public_key().public_numbers()
    jwk = {
        "kty": "RSA",
        "kid": "rulegpt-test-key",
        "alg": "RS256",
        "use": "sig",
        "n": base64url_encode(
            public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, "big")
        ).decode(),
        "e": base64url_encode(
            public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, "big")
        ).decode(),
    }
    return private_pem, {"keys": [jwk]}


def _build_token(private_pem: bytes, issuer: str, subject: UUID, tier: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "iss": issuer,
        "sub": str(subject),
        "aud": "authenticated",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "email": "person@example.com",
        "app_metadata": {},
        "user_metadata": {},
    }
    if tier is not None:
        claims["app_metadata"] = {"rulegpt_tier": tier}
    return jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": "rulegpt-test-key"})


@pytest.mark.asyncio
async def test_supabase_auth_verifies_jwt_and_extracts_pro_tier(monkeypatch) -> None:
    private_pem, jwks = _make_rsa_jwks()
    issuer = "https://example.supabase.co/auth/v1"
    service = SupabaseAuthService(
        supabase_url="https://example.supabase.co",
        issuer=issuer,
        jwks_url=f"{issuer}/.well-known/jwks.json",
    )
    monkeypatch.setattr(service, "_fetch_jwks", AsyncMock(return_value=jwks))
    token = _build_token(private_pem, issuer, uuid4(), tier="pro")

    result = await service.verify_jwt(token)

    assert isinstance(result["user_id"], UUID)
    assert result["tier"] == "pro"
    assert result["claims"]["email"] == "person@example.com"


@pytest.mark.asyncio
async def test_supabase_auth_falls_back_to_free_for_authenticated_users(monkeypatch) -> None:
    private_pem, jwks = _make_rsa_jwks()
    issuer = "https://example.supabase.co/auth/v1"
    service = SupabaseAuthService(
        supabase_url="https://example.supabase.co",
        issuer=issuer,
        jwks_url=f"{issuer}/.well-known/jwks.json",
    )
    monkeypatch.setattr(service, "_fetch_jwks", AsyncMock(return_value=jwks))
    token = _build_token(private_pem, issuer, uuid4())

    result = await service.verify_jwt(token)

    assert result["tier"] == "free"


@pytest.mark.asyncio
async def test_stripe_checkout_session_is_created_for_monthly_pro(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def _fake_checkout_create(**kwargs):
        captured.update(kwargs)
        return {
            "id": "cs_test_123",
            "url": "https://stripe.test/checkout",
            "mode": kwargs["mode"],
            "status": "open",
        }

    monkeypatch.setattr(stripe.checkout.Session, "create", _fake_checkout_create)
    client = StripeClient(
        secret_key="sk_test",
        webhook_secret="whsec_test",
        monthly_price_id="price_monthly",
        annual_price_id="price_annual",
        supabase_auth=SimpleNamespace(set_user_tier=AsyncMock()),
    )

    result = await client.create_checkout_session(
        user_id=uuid4(),
        customer_email="person@example.com",
        interval="monthly",
        success_url="https://rulegpt.test/success",
        cancel_url="https://rulegpt.test/cancel",
    )

    assert result["session_id"] == "cs_test_123"
    assert result["price_id"] == "price_monthly"
    assert captured["customer_email"] == "person@example.com"
    assert captured["metadata"]["rulegpt_tier"] == "pro"
    assert captured["subscription_data"]["metadata"]["billing_interval"] == "monthly"


@pytest.mark.asyncio
async def test_stripe_webhook_upgrades_supabase_tier(monkeypatch) -> None:
    user_id = uuid4()
    supabase_auth = SimpleNamespace(set_user_tier=AsyncMock(return_value={"id": str(user_id)}))

    def _fake_construct_event(*, payload, sig_header, secret):
        assert payload == b'{"id":"evt_123"}'
        assert sig_header == "whsec_signature"
        assert secret == "whsec_test"
        return {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "metadata": {"supabase_user_id": str(user_id)},
                    "client_reference_id": str(user_id),
                }
            },
        }

    monkeypatch.setattr(stripe.Webhook, "construct_event", _fake_construct_event)
    client = StripeClient(
        secret_key="sk_test",
        webhook_secret="whsec_test",
        monthly_price_id="price_monthly",
        annual_price_id="price_annual",
        supabase_auth=supabase_auth,
    )

    result = await client.handle_webhook(b'{"id":"evt_123"}', "whsec_signature")

    assert result["action"] == "upgraded"
    assert result["tier"] == "pro"
    supabase_auth.set_user_tier.assert_awaited_once()
