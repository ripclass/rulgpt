"""Billing request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AnyUrl, BaseModel, Field


BillingInterval = Literal["monthly", "annual"]
BillingPlan = Literal["professional", "enterprise"]


class CheckoutSessionCreateRequest(BaseModel):
    plan: BillingPlan = Field(description="Paid plan to purchase.")
    interval: BillingInterval = Field(description="Billing cadence for the selected plan.")
    success_url: AnyUrl | None = None
    cancel_url: AnyUrl | None = None
    customer_email: str | None = Field(default=None, max_length=320)


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str | None = None
    price_id: str
    plan: BillingPlan
    interval: BillingInterval
    tier: BillingPlan


class BillingWebhookResponse(BaseModel):
    event_type: str
    action: str
    user_id: UUID | None = None
    tier: str | None = None
    supabase_user: dict | None = None


class BillingSubscriptionResponse(BaseModel):
    status: Literal["active", "inactive"]
    tier: Literal["free", "professional", "enterprise"]
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None


class BillingConfigStatusResponse(BaseModel):
    stripe_configured: bool
    secret_key_configured: bool
    webhook_secret_configured: bool
    professional_monthly_price_configured: bool
    professional_annual_price_configured: bool
    enterprise_monthly_price_configured: bool
    enterprise_annual_price_configured: bool
    checkout_ready: bool
    webhook_ready: bool
    supported_plans: list[BillingPlan]
    supported_intervals: list[BillingInterval]
    blockers: list[str]
