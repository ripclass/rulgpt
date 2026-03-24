"""Billing request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AnyUrl, BaseModel, Field


BillingInterval = Literal["monthly", "annual"]


class CheckoutSessionCreateRequest(BaseModel):
    interval: BillingInterval = Field(description="Pro billing cadence.")
    success_url: AnyUrl | None = None
    cancel_url: AnyUrl | None = None
    customer_email: str | None = Field(default=None, max_length=320)


class CheckoutSessionResponse(BaseModel):
    session_id: str
    checkout_url: str | None = None
    price_id: str
    interval: BillingInterval
    tier: Literal["pro"] = "pro"


class BillingWebhookResponse(BaseModel):
    event_type: str
    action: str
    user_id: UUID | None = None
    tier: str | None = None
    supabase_user: dict | None = None


class BillingSubscriptionResponse(BaseModel):
    status: Literal["active", "inactive"]
    tier: Literal["free", "pro"]
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None
