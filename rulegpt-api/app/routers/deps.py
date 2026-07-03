"""Shared router dependencies."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entitlement import RuleGPTEntitlement


PAID_TIERS = frozenset({"professional", "enterprise"})
VALID_TIERS = frozenset({"anonymous", "free"}) | PAID_TIERS

# One-off artifact prices — surfaced in the 402 body so the frontend can
# render the paywall modal without a second round trip.
ONEOFF_PRICE_USD = {"case_note": 9, "draft": 19}
PRO_PRICE_USD = 29


def client_ip(request: Request) -> str | None:
    """Resolve the caller's real IP, trusting the rightmost X-Forwarded-For hop.

    This is the anon-quota / cost boundary (daily query and MT700 limits are
    keyed on it), so it must not be spoofable. Render's proxy APPENDS the
    real client IP to X-Forwarded-For — every entry to the left of the last
    one is attacker-controlled request data, not the leftmost as a naive
    reading of the header might suggest. Falls back to `request.client.host`
    when the header is absent.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        hops = [hop.strip() for hop in forwarded.split(",")]
        hops = [hop for hop in hops if hop]
        if hops:
            return hops[-1]
    return request.client.host if request.client else None


def get_request_tier(request: Request) -> str:
    tier = getattr(request.state, "user_tier", "anonymous")
    return tier if tier in VALID_TIERS else "anonymous"


def get_request_user_id(request: Request) -> UUID | None:
    return getattr(request.state, "user_id", None)


def require_authenticated_user(request: Request) -> UUID:
    user_id = get_request_user_id(request)
    if user_id is None or getattr(request.state, "is_authenticated", False) is not True:
        detail = getattr(request.state, "auth_error", None) or "Authentication required."
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id


def require_paid_user(request: Request) -> UUID:
    """Require a Professional or Enterprise subscription."""
    user_id = require_authenticated_user(request)
    tier = get_request_tier(request)
    if tier not in PAID_TIERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A Professional or Enterprise subscription is required.",
        )
    return user_id


def require_enterprise_user(request: Request) -> UUID:
    """Require an Enterprise subscription specifically (e.g. API key access)."""
    user_id = require_authenticated_user(request)
    tier = get_request_tier(request)
    if tier != "enterprise":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An Enterprise subscription is required.",
        )
    return user_id


def require_admin_user(request: Request):
    """Verify the caller has admin privileges.

    Security model:
    - Production with ADMIN_SECRET set: require ``Authorization: Bearer admin:<secret>``
    - Production without ADMIN_SECRET: reject all admin requests
    - Non-production with ADMIN_SECRET set: require the bearer token (same as prod)
    - Non-production without ADMIN_SECRET: fall back to ``x-admin=true`` header for dev convenience
    """
    from app.config import get_settings

    cfg = get_settings()
    is_production = cfg.ENVIRONMENT.lower() == "production"
    admin_secret = cfg.ADMIN_SECRET

    if admin_secret:
        # Secret is configured — require bearer token in all environments.
        auth_header = (request.headers.get("authorization") or "").strip()
        expected = f"Bearer admin:{admin_secret}"
        if auth_header != expected:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid admin credentials.",
            )
        return True

    if is_production:
        # Production without a secret — deny everything.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access not configured.",
        )

    # Non-production, no secret — allow legacy dev header.
    is_admin = (request.headers.get("x-admin") or "").lower() == "true"
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required.",
        )
    return True


def consume_or_require_entitlement(db: Session, user_id: str, tier: str, kind: str) -> RuleGPTEntitlement | None:
    """Pro/enterprise pass free (returns None — nothing was consumed, so
    there is nothing for a caller to release later). Otherwise consume one
    credit or raise 402. Returns the consumed row so a caller whose
    generation subsequently degrades can undo the consumption via
    `release_entitlement_credit` — the credit was paid for a synthesized
    artifact, not a citations-only degrade.
    """
    if tier in ("professional", "enterprise"):
        return None
    row = (
        db.query(RuleGPTEntitlement)
        .filter(
            RuleGPTEntitlement.user_id == user_id,
            RuleGPTEntitlement.kind == kind,
            RuleGPTEntitlement.credits > RuleGPTEntitlement.consumed,
        )
        .with_for_update()
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "payment_required",
                "kind": kind,
                "price_usd": ONEOFF_PRICE_USD.get(kind),
                "pro_price_usd": PRO_PRICE_USD,
            },
        )
    row.consumed += 1
    db.flush()
    return row


def release_entitlement_credit(db: Session, row: RuleGPTEntitlement | None) -> None:
    """Undo a consumption recorded by `consume_or_require_entitlement` when
    the generation it paid for degraded to a non-synthesized artifact.
    No-op when `row` is None (Pro/enterprise callers never consumed
    anything, so there's nothing to release).
    """
    if row is None:
        return
    row.consumed = max(0, row.consumed - 1)
    db.flush()


DbSession = Depends(get_db)
