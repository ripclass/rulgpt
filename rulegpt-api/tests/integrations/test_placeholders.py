from __future__ import annotations

import pytest

from app.services.integrations.stripe_client import StripeClient
from app.services.integrations.supabase_auth import SupabaseAuthService


@pytest.mark.asyncio
async def test_supabase_auth_placeholder_is_blocked() -> None:
    service = SupabaseAuthService()
    with pytest.raises(NotImplementedError):
        await service.verify_jwt("token")


@pytest.mark.asyncio
async def test_stripe_placeholder_is_blocked() -> None:
    service = StripeClient()
    with pytest.raises(NotImplementedError):
        await service.create_checkout_session()

