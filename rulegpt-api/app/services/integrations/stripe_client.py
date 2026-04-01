"""Stripe billing integration."""

from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

import stripe

from app.config import settings

from .supabase_auth import SupabaseAuthService


class StripeClient:
    """Stripe checkout and webhook helper."""

    def __init__(
        self,
        *,
        secret_key: str | None = None,
        webhook_secret: str | None = None,
        starter_monthly_price_id: str | None = None,
        starter_annual_price_id: str | None = None,
        pro_monthly_price_id: str | None = None,
        pro_annual_price_id: str | None = None,
        supabase_auth: SupabaseAuthService | None = None,
    ) -> None:
        self.secret_key = secret_key or settings.STRIPE_SECRET_KEY
        self.webhook_secret = webhook_secret or settings.STRIPE_WEBHOOK_SECRET
        self.starter_monthly_price_id = (
            starter_monthly_price_id or settings.STRIPE_STARTER_MONTHLY_PRICE_ID
        )
        self.starter_annual_price_id = (
            starter_annual_price_id or settings.STRIPE_STARTER_ANNUAL_PRICE_ID
        )
        self.pro_monthly_price_id = pro_monthly_price_id or settings.STRIPE_PRO_MONTHLY_PRICE_ID
        self.pro_annual_price_id = pro_annual_price_id or settings.STRIPE_PRO_ANNUAL_PRICE_ID
        self.supabase_auth = supabase_auth or SupabaseAuthService()

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
        price_matrix = {
            "starter": {
                "monthly": self.starter_monthly_price_id,
                "annual": self.starter_annual_price_id,
            },
            "pro": {
                "monthly": self.pro_monthly_price_id,
                "annual": self.pro_annual_price_id,
            },
        }

        if normalized_plan not in price_matrix:
            raise ValueError("Unsupported billing plan.")
        if normalized not in {"monthly", "annual"}:
            raise ValueError("Unsupported billing interval.")

        price_id = price_matrix[normalized_plan][normalized]
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
        metadata = {
            "supabase_user_id": str(user_id),
            "rulegpt_tier": normalized_plan,
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
            "tier": normalized_plan,
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

    @staticmethod
    def _resolve_event_tier(event_object: dict[str, Any]) -> str:
        def _metadata_value(container: Any, key: str) -> Any:
            if isinstance(container, dict):
                return (container.get("metadata") or {}).get(key)
            return None

        candidates = [
            (event_object.get("metadata") or {}).get("rulegpt_tier"),
            (event_object.get("metadata") or {}).get("rulegpt_plan"),
            _metadata_value(event_object.get("subscription_details"), "rulegpt_tier"),
            _metadata_value(event_object.get("subscription_details"), "rulegpt_plan"),
            _metadata_value(event_object.get("subscription"), "rulegpt_tier"),
            _metadata_value(event_object.get("subscription"), "rulegpt_plan"),
            _metadata_value(event_object.get("lines"), "rulegpt_tier"),
            _metadata_value(event_object.get("lines"), "rulegpt_plan"),
        ]
        for candidate in candidates:
            normalized = str(candidate or "").strip().lower()
            if normalized in {"starter", "pro"}:
                return normalized
        return "pro"

    @staticmethod
    def _tier_for_subscription_status(status: str | None, paid_tier: str) -> str:
        if str(status or "").lower() in {"active", "trialing"}:
            return paid_tier
        return "free"

    async def handle_webhook(self, payload: bytes, signature: str) -> dict[str, Any]:
        """Verify a Stripe webhook and sync the Supabase tier metadata."""

        stripe.api_key = self._require_secret_key()
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=self._require_webhook_secret(),
        )

        event_type = str(event.get("type") or "")
        event_object = (event.get("data") or {}).get("object") or {}

        if event_type == "checkout.session.completed":
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
                "action": "upgraded" if tier == "pro" else "downgraded",
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
