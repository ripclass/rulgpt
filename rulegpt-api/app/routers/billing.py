"""Billing and subscription endpoints."""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.schemas.billing import (
    BillingConfigStatusResponse,
    BillingSubscriptionResponse,
    BillingWebhookResponse,
    CheckoutSessionCreateRequest,
    CheckoutSessionResponse,
)
from app.services.integrations.stripe_client import StripeClient

from .deps import require_authenticated_user

router = APIRouter(prefix="/api/billing", tags=["billing"])
billing_client = StripeClient()


@router.get("/status", response_model=BillingConfigStatusResponse)
async def billing_status() -> BillingConfigStatusResponse:
    stripe_configured = bool(billing_client.secret_key)
    monthly_price_configured = bool(billing_client.monthly_price_id)
    annual_price_configured = bool(billing_client.annual_price_id)
    webhook_secret_configured = bool(billing_client.webhook_secret)
    checkout_ready = stripe_configured and monthly_price_configured and annual_price_configured
    webhook_ready = stripe_configured and webhook_secret_configured

    blockers: list[str] = []
    if not stripe_configured:
        blockers.append("Stripe secret key is missing.")
    if not monthly_price_configured:
        blockers.append("Monthly Stripe price ID is missing.")
    if not annual_price_configured:
        blockers.append("Annual Stripe price ID is missing.")
    if not webhook_secret_configured:
        blockers.append("Stripe webhook secret is missing.")

    return BillingConfigStatusResponse(
        stripe_configured=stripe_configured,
        secret_key_configured=stripe_configured,
        webhook_secret_configured=webhook_secret_configured,
        monthly_price_configured=monthly_price_configured,
        annual_price_configured=annual_price_configured,
        checkout_ready=checkout_ready,
        webhook_ready=webhook_ready,
        supported_intervals=["monthly", "annual"],
        blockers=blockers,
    )


def _frontend_base_url(request: Request) -> str:
    origin = (request.headers.get("origin") or "").strip()
    if origin:
        return origin.rstrip("/")

    referer = (request.headers.get("referer") or "").strip()
    if referer:
        parts = urlsplit(referer)
        if parts.scheme and parts.netloc:
            return urlunsplit((parts.scheme, parts.netloc, "", "", "")).rstrip("/")

    return str(request.base_url).rstrip("/")


@router.post("/checkout", response_model=CheckoutSessionResponse)
@router.post("/checkout-session", response_model=CheckoutSessionResponse, include_in_schema=False)
async def create_checkout_session(
    request: Request,
    payload: CheckoutSessionCreateRequest | None = None,
    _user_id=Depends(require_authenticated_user),
) -> CheckoutSessionResponse:
    payload = payload or CheckoutSessionCreateRequest(interval="monthly")
    claims = getattr(request.state, "auth_claims", {}) or {}
    customer_email = payload.customer_email or claims.get("email")
    frontend_base = _frontend_base_url(request)
    success_url = str(payload.success_url) if payload.success_url else f"{frontend_base}/upgrade?checkout=success"
    cancel_url = str(payload.cancel_url) if payload.cancel_url else f"{frontend_base}/upgrade?checkout=cancel"

    try:
        session = await billing_client.create_checkout_session(
            user_id=request.state.user_id,
            customer_email=customer_email,
            interval=payload.interval,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return CheckoutSessionResponse.model_validate(session)


@router.get("/subscription", response_model=BillingSubscriptionResponse)
async def get_subscription(
    request: Request,
    _user_id=Depends(require_authenticated_user),
) -> BillingSubscriptionResponse:
    tier = getattr(request.state, "user_tier", "free")
    normalized_tier = "pro" if tier == "pro" else "free"
    return BillingSubscriptionResponse(
        status="active" if normalized_tier == "pro" else "inactive",
        tier=normalized_tier,
    )


@router.post("/webhook", response_model=BillingWebhookResponse)
async def stripe_webhook(request: Request) -> BillingWebhookResponse:
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe signature header.",
        )

    payload = await request.body()
    try:
        result = await billing_client.handle_webhook(payload=payload, signature=signature)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return BillingWebhookResponse.model_validate(result)
