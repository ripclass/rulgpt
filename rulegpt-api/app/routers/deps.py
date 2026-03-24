"""Shared router dependencies."""

from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db


def get_request_tier(request: Request) -> str:
    tier = getattr(request.state, "user_tier", "anonymous")
    return tier if tier in {"anonymous", "free", "pro"} else "anonymous"


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
    # Placeholder check: x-admin=true header only.
    # Real RBAC/JWT should be wired via integrations layer once approved.
    is_admin = (request.headers.get("x-admin") or "").lower() == "true"
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin permission required.",
        )
    return True


DbSession = Depends(get_db)
