"""Placeholder module for Stripe integration.

Blocked intentionally pending explicit approval to touch payments wiring.
"""

from __future__ import annotations


class StripeClient:
    """Payments integration placeholder."""

    def __init__(self, *_: object, **__: object) -> None:
        self._blocked_reason = (
            "Stripe integration is intentionally blocked pending explicit approval."
        )

    async def create_checkout_session(self, *args: object, **kwargs: object) -> dict:
        raise NotImplementedError(self._blocked_reason)

    async def handle_webhook(self, payload: bytes, signature: str) -> dict:
        raise NotImplementedError(self._blocked_reason)

