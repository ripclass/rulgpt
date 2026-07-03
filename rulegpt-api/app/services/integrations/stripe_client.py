"""Stripe billing integration."""

from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

import stripe

from app.config import settings
from app.models.entitlement import RuleGPTEntitlement

from .supabase_auth import SupabaseAuthService


class StripeClient:
    """Stripe checkout and webhook helper."""

    def __init__(
        self,
        *,
        secret_key: str | None = None,
        webhook_secret: str | None = None,
        supabase_auth: SupabaseAuthService | None = None,
    ) -> None:
        self.secret_key = secret_key or settings.STRIPE_SECRET_KEY
        self.webhook_secret = webhook_secret or settings.STRIPE_WEBHOOK_SECRET
        self.supabase_auth = supabase_auth or SupabaseAuthService()

        # Price ID → tier mapping (used by webhook to determine user tier).
        # "Pro" is only a marketing label for the $29/mo SKU — it grants the
        # same internal `professional` tier as the existing professional
        # price IDs. Internal tier vocabulary is never renamed (see CLAUDE.md
        # 2026-05-02 lesson).
        self._price_to_tier: dict[str, str] = {}
        for price_id, tier in [
            (settings.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID, "professional"),
            (settings.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID, "professional"),
            (settings.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID, "enterprise"),
            (settings.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID, "enterprise"),
            (settings.STRIPE_PRO_MONTHLY_PRICE_ID, "professional"),
        ]:
            if price_id:
                self._price_to_tier[price_id] = tier

    def _require_secret_key(self) -> str:
        if not self.secret_key:
            raise RuntimeError("Stripe secret key is not configured.")
        return self.secret_key

    def _require_webhook_secret(self) -> str:
        if not self.webhook_secret:
            raise RuntimeError("Stripe webhook secret is not configured.")
        return self.webhook_secret

    def _price_id_for_plan_and_interval(self, plan: str, interval: str) -> str:
        normalized_plan = str(plan or "").strip().lower()
        normalized = str(interval or "").strip().lower()
        price_matrix: dict[str, dict[str, str | None]] = {
            "professional": {
                "monthly": settings.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
                "annual": settings.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
            },
            "enterprise": {
                "monthly": settings.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
                "annual": settings.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
            },
            "pro": {
                "monthly": settings.STRIPE_PRO_MONTHLY_PRICE_ID,
            },
        }

        if normalized_plan not in price_matrix:
            raise ValueError(f"Unsupported billing plan: {normalized_plan}")
        if normalized not in {"monthly", "annual"}:
            raise ValueError("Unsupported billing interval.")

        price_id = price_matrix[normalized_plan].get(normalized)
        if not price_id:
            raise RuntimeError(
                f"Stripe price id for {normalized_plan} {normalized} billing is not configured."
            )
        return price_id

    async def create_checkout_session(
        self,
        *,
        user_id: UUID | str,
        customer_email: str | None,
        plan: str,
        interval: str,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        """Create a paid subscription checkout session."""

        normalized_plan = str(plan or "").strip().lower()
        price_id = self._price_id_for_plan_and_interval(normalized_plan, interval)
        stripe.api_key = self._require_secret_key()
        # "pro" is a marketing label for the $29/mo SKU only — the internal
        # tier vocabulary is never renamed (see CLAUDE.md 2026-05-02 lesson),
        # so metadata and the response's `tier` field always say "professional".
        tier_value = "professional" if normalized_plan == "pro" else normalized_plan
        metadata = {
            "supabase_user_id": str(user_id),
            "rulegpt_tier": tier_value,
            "rulegpt_plan": normalized_plan,
            "billing_interval": str(interval).strip().lower(),
        }

        payload = {
            "mode": "subscription",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": str(user_id),
            "metadata": metadata,
            "subscription_data": {"metadata": metadata},
        }
        if customer_email:
            payload["customer_email"] = customer_email

        session = await asyncio.to_thread(stripe.checkout.Session.create, **payload)
        return {
            "session_id": session["id"],
            "checkout_url": session.get("url"),
            "mode": session.get("mode"),
            "status": session.get("status"),
            "price_id": price_id,
            "plan": normalized_plan,
            "interval": str(interval).strip().lower(),
            "tier": tier_value,
        }

    async def create_oneoff_checkout(
        self,
        *,
        user_id: UUID | str,
        customer_email: str | None,
        kind: str,
        success_url: str,
        cancel_url: str,
    ) -> dict[str, Any]:
        """Create a one-off ($9 case note / $19 draft) payment-mode checkout session."""

        normalized_kind = str(kind or "").strip().lower()
        if normalized_kind not in {"case_note", "draft"}:
            raise ValueError(f"Unsupported one-off artifact kind: {normalized_kind}")

        price_id = (
            settings.STRIPE_CASE_NOTE_PRICE_ID
            if normalized_kind == "case_note"
            else settings.STRIPE_DRAFT_PRICE_ID
        )
        if not price_id:
            raise RuntimeError(f"Stripe price id for {normalized_kind} is not configured.")

        stripe.api_key = self._require_secret_key()
        metadata = {"supabase_user_id": str(user_id), "artifact_kind": normalized_kind}

        payload = {
            "mode": "payment",
            "line_items": [{"price": price_id, "quantity": 1}],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": str(user_id),
            "metadata": metadata,
        }
        if customer_email:
            payload["customer_email"] = customer_email

        session = await asyncio.to_thread(stripe.checkout.Session.create, **payload)
        return {
            "session_id": session["id"],
            "checkout_url": session.get("url"),
            "kind": normalized_kind,
            "price_id": price_id,
        }

    async def _resolve_event_user_id(self, event_object: dict[str, Any]) -> UUID:
        def _metadata_value(container: Any, key: str) -> Any:
            if isinstance(container, dict):
                return (container.get("metadata") or {}).get(key)
            return None

        candidate = (
            (event_object.get("metadata") or {}).get("supabase_user_id")
            or event_object.get("client_reference_id")
            or _metadata_value(event_object.get("subscription_details"), "supabase_user_id")
            or _metadata_value(event_object.get("subscription"), "supabase_user_id")
        )
        if not candidate:
            raise ValueError("Stripe webhook is missing a Supabase user reference.")
        return UUID(str(candidate))

    def _resolve_event_tier(self, event_object: dict[str, Any]) -> str:
        """Determine user tier from Stripe event — check price ID first, then metadata."""
        _VALID_TIERS = {"professional", "enterprise"}

        def _metadata_value(container: Any, key: str) -> Any:
            if isinstance(container, dict):
                return (container.get("metadata") or {}).get(key)
            return None

        # Try to resolve from price ID (most reliable)
        items = event_object.get("items", {}).get("data", [])
        if not items:
            lines = event_object.get("lines", {})
            items = lines.get("data", []) if isinstance(lines, dict) else []
        for item in items:
            price = item.get("price", {}) if isinstance(item, dict) else {}
            price_id = price.get("id") if isinstance(price, dict) else None
            if price_id and price_id in self._price_to_tier:
                return self._price_to_tier[price_id]

        # Fallback: check metadata
        candidates = [
            (event_object.get("metadata") or {}).get("rulegpt_tier"),
            (event_object.get("metadata") or {}).get("rulegpt_plan"),
            _metadata_value(event_object.get("subscription_details"), "rulegpt_tier"),
            _metadata_value(event_object.get("subscription"), "rulegpt_tier"),
        ]
        for candidate in candidates:
            normalized = str(candidate or "").strip().lower()
            if normalized in _VALID_TIERS:
                return normalized
        return "professional"  # default for paid users

    @staticmethod
    def _tier_for_subscription_status(status: str | None, paid_tier: str) -> str:
        if str(status or "").lower() in {"active", "trialing"}:
            return paid_tier
        return "free"

    async def _handle_oneoff_payment(self, event_object: dict[str, Any], db: Any) -> dict[str, Any]:
        """checkout.session.completed with mode="payment" — grant a one-off entitlement credit.

        Idempotent on `stripe_session_id`: a query-first check handles the
        common case (Stripe redelivering the same event); the column's
        unique constraint backstops it against races.
        """
        metadata = event_object.get("metadata") or {}
        user_id = metadata.get("supabase_user_id")
        kind = metadata.get("artifact_kind")
        session_id = event_object.get("id")
        if not user_id or not kind:
            raise ValueError("Stripe one-off checkout is missing required metadata.")

        existing = db.query(RuleGPTEntitlement).filter_by(stripe_session_id=session_id).first()
        if existing is None:
            db.add(
                RuleGPTEntitlement(
                    user_id=str(user_id),
                    kind=str(kind),
                    credits=1,
                    consumed=0,
                    stripe_session_id=session_id,
                )
            )
            db.commit()

        return {
            "event_type": "checkout.session.completed",
            "user_id": str(user_id),
            "tier": None,
            "action": "entitlement_granted",
            "kind": str(kind),
        }

    async def handle_webhook(self, payload: bytes, signature: str, db: Any = None) -> dict[str, Any]:
        """Verify a Stripe webhook and sync the Supabase tier metadata.

        `db` is a sync SQLAlchemy Session, required only for the one-off
        (payment-mode) branch — the subscription branches never touch it.
        """

        stripe.api_key = self._require_secret_key()
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=self._require_webhook_secret(),
        )

        event_type = str(event.get("type") or "")
        event_object = (event.get("data") or {}).get("object") or {}

        if event_type == "checkout.session.completed":
            if str(event_object.get("mode") or "") == "payment":
                return await self._handle_oneoff_payment(event_object, db)

            user_id = await self._resolve_event_user_id(event_object)
            tier = self._resolve_event_tier(event_object)
            updated = await self.supabase_auth.set_user_tier(user_id, tier)
            return {
                "event_type": event_type,
                "user_id": str(user_id),
                "tier": tier,
                "action": "upgraded",
                "supabase_user": updated,
            }

        if event_type in {
            "customer.subscription.created",
            "customer.subscription.updated",
            "customer.subscription.deleted",
        }:
            user_id = await self._resolve_event_user_id(event_object)
            paid_tier = self._resolve_event_tier(event_object)
            tier = self._tier_for_subscription_status(
                event_object.get("status"),
                paid_tier,
            )
            updated = await self.supabase_auth.set_user_tier(user_id, tier)
            return {
                "event_type": event_type,
                "user_id": str(user_id),
                "tier": tier,
                "action": "upgraded" if tier in {"professional", "enterprise"} else "downgraded",
                "supabase_user": updated,
            }

        if event_type == "invoice.payment_failed":
            user_id = await self._resolve_event_user_id(event_object)
            updated = await self.supabase_auth.set_user_tier(user_id, "free")
            return {
                "event_type": event_type,
                "user_id": str(user_id),
                "tier": "free",
                "action": "downgraded",
                "supabase_user": updated,
            }

        return {
            "event_type": event_type,
            "user_id": None,
            "tier": None,
            "action": "ignored",
        }
