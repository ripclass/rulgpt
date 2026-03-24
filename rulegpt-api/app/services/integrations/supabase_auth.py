"""Placeholder module for Supabase auth integration.

Blocked intentionally pending explicit approval to touch auth wiring.
"""

from __future__ import annotations


class SupabaseAuthService:
    """Auth integration placeholder."""

    def __init__(self, *_: object, **__: object) -> None:
        self._blocked_reason = (
            "Supabase auth integration is intentionally blocked pending explicit approval."
        )

    async def verify_jwt(self, token: str) -> dict:
        raise NotImplementedError(self._blocked_reason)

    async def get_user_profile(self, user_id: str) -> dict:
        raise NotImplementedError(self._blocked_reason)

