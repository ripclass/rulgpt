"""Shared router dependencies."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db


def get_request_tier(request: Request) -> str:
    tier = getattr(request.state, "user_tier", "anonymous")
    return tier if tier in {"anonymous", "free", "starter", "pro"} else "anonymous"


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


def require_pro_user(request: Request) -> UUID:
    user_id = require_authenticated_user(request)
    tier = get_request_tier(request)
    if tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required.",
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


DbSession = Depends(get_db)
