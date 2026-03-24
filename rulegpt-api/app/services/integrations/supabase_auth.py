"""Supabase authentication and user metadata helpers."""

from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

import httpx
from jose import jwt

from app.config import settings


_JWKS_CACHE: dict[str, dict[str, Any]] = {}


class SupabaseAuthService:
    """Authenticate Supabase JWTs and manage user billing metadata."""

    def __init__(
        self,
        supabase_url: str | None = None,
        service_role_key: str | None = None,
        issuer: str | None = None,
        jwks_url: str | None = None,
        audience: str | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.supabase_url = self._project_origin(supabase_url or settings.SUPABASE_URL or "")
        self.service_role_key = service_role_key or settings.SUPABASE_SERVICE_ROLE_KEY
        issuer_value = issuer or settings.SUPABASE_ISSUER or self._derive_issuer_from_url(
            self.supabase_url
        )
        jwks_value = jwks_url or settings.SUPABASE_JWKS_URL or self._derive_jwks_url_from_issuer(
            issuer_value or ""
        )
        if not issuer_value and jwks_value.endswith("/.well-known/jwks.json"):
            issuer_value = jwks_value[: -len("/.well-known/jwks.json")]

        self.issuer = issuer_value.rstrip("/") if issuer_value else ""
        self.jwks_url = jwks_value.rstrip("/") if jwks_value else ""
        self.audience = audience or settings.SUPABASE_JWT_AUDIENCE
        self._http_client = http_client

    @staticmethod
    def _derive_issuer_from_url(supabase_url: str) -> str:
        if not supabase_url:
            return ""

        base = SupabaseAuthService._project_origin(supabase_url)
        if supabase_url.rstrip("/").endswith("/auth/v1"):
            return supabase_url.rstrip("/")
        return f"{base}/auth/v1"

    @staticmethod
    def _derive_jwks_url_from_issuer(issuer: str) -> str:
        if not issuer:
            return ""
        return f"{issuer}/.well-known/jwks.json" if issuer else ""

    @staticmethod
    def _project_origin(url: str) -> str:
        parsed = urlsplit(url)
        if not parsed.scheme or not parsed.netloc:
            return url.rstrip("/")
        return f"{parsed.scheme}://{parsed.netloc}"

    @staticmethod
    def _tier_from_claims(claims: dict[str, Any]) -> str:
        candidates = [
            (claims.get("app_metadata") or {}).get("rulegpt_tier"),
            (claims.get("app_metadata") or {}).get("tier"),
            (claims.get("user_metadata") or {}).get("rulegpt_tier"),
            (claims.get("user_metadata") or {}).get("tier"),
            claims.get("tier"),
        ]
        for candidate in candidates:
            normalized = str(candidate or "").strip().lower()
            if normalized in {"free", "pro"}:
                return normalized
        return "free"

    @staticmethod
    def _require_uuid(value: object) -> UUID:
        try:
            return UUID(str(value))
        except (TypeError, ValueError) as exc:
            raise ValueError("Invalid Supabase sub claim.") from exc

    async def _fetch_jwks(self, jwks_url: str) -> dict[str, Any]:
        cached = _JWKS_CACHE.get(jwks_url)
        now = int(time.time())
        if cached and cached["expires_at"] > now:
            return cached["data"]

        client = self._http_client
        if client is None:
            async with httpx.AsyncClient(timeout=10) as temp_client:
                response = await temp_client.get(jwks_url)
        else:
            response = await client.get(jwks_url)

        response.raise_for_status()
        data = response.json()
        _JWKS_CACHE[jwks_url] = {"data": data, "expires_at": now + 3600}
        return data

    def _build_admin_headers(self) -> dict[str, str]:
        if not self.supabase_url or not self.service_role_key:
            raise RuntimeError("Supabase service role credentials are not configured.")
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }

    def _admin_users_url(self, user_id: UUID | str) -> str:
        if not self.supabase_url:
            raise RuntimeError("Supabase URL is not configured.")
        return f"{self.supabase_url}/auth/v1/admin/users/{user_id}"

    async def verify_jwt(self, token: str) -> dict[str, Any]:
        """Verify a Supabase JWT against the configured JWKS."""

        if not token or not token.strip():
            raise ValueError("Missing bearer token.")
        if not self.issuer or not self.jwks_url:
            raise RuntimeError("Supabase JWT verification is not configured.")

        unverified_claims = jwt.get_unverified_claims(token)
        token_issuer = str(unverified_claims.get("iss") or "").rstrip("/")
        if not token_issuer:
            raise ValueError("Missing issuer claim.")
        if token_issuer != self.issuer.rstrip("/"):
            raise ValueError("Unexpected token issuer.")

        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise ValueError("Missing signing key id.")

        jwks = await self._fetch_jwks(self.jwks_url)
        keys = jwks.get("keys") or []
        key = next((candidate for candidate in keys if candidate.get("kid") == kid), None)
        if key is None:
            raise ValueError("No matching signing key.")

        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256", "ES256"],
            audience=self.audience,
            options={
                "verify_aud": bool(self.audience),
                "verify_exp": True,
                "verify_iss": False,
            },
        )
        user_id = self._require_uuid(claims.get("sub"))
        tier = self._tier_from_claims(claims)
        return {
            "user_id": user_id,
            "tier": tier,
            "claims": claims,
            "issuer": token_issuer,
            "authenticated": True,
        }

    async def get_user_profile(self, user_id: str | UUID) -> dict[str, Any]:
        if not self.supabase_url:
            raise RuntimeError("Supabase URL is not configured.")

        url = self._admin_users_url(user_id)
        headers = self._build_admin_headers()
        client = self._http_client
        if client is None:
            async with httpx.AsyncClient(timeout=10) as temp_client:
                response = await temp_client.get(url, headers=headers)
        else:
            response = await client.get(url, headers=headers)

        response.raise_for_status()
        return response.json()

    async def update_user_metadata(
        self,
        user_id: str | UUID,
        *,
        app_metadata: dict[str, Any] | None = None,
        user_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.supabase_url:
            raise RuntimeError("Supabase URL is not configured.")

        current = await self.get_user_profile(user_id)
        current_user = current.get("user") if isinstance(current, dict) and isinstance(current.get("user"), dict) else current
        payload: dict[str, Any] = {}

        merged_app_metadata = dict((current_user or {}).get("app_metadata") or {})
        if app_metadata:
            merged_app_metadata.update(app_metadata)
        if merged_app_metadata:
            payload["app_metadata"] = merged_app_metadata

        merged_user_metadata = dict((current_user or {}).get("user_metadata") or {})
        if user_metadata:
            merged_user_metadata.update(user_metadata)
        if merged_user_metadata:
            payload["user_metadata"] = merged_user_metadata

        headers = self._build_admin_headers()
        url = self._admin_users_url(user_id)
        client = self._http_client
        if client is None:
            async with httpx.AsyncClient(timeout=10) as temp_client:
                response = await temp_client.put(url, json=payload, headers=headers)
        else:
            response = await client.put(url, json=payload, headers=headers)

        response.raise_for_status()
        return response.json()

    async def set_user_tier(self, user_id: str | UUID, tier: str) -> dict[str, Any]:
        normalized_tier = str(tier or "").strip().lower()
        if normalized_tier not in {"free", "pro"}:
            raise ValueError("Unsupported tier.")

        return await self.update_user_metadata(
            user_id,
            app_metadata={
                "rulegpt_tier": normalized_tier,
                "tier": normalized_tier,
            },
            user_metadata={
                "rulegpt_tier": normalized_tier,
                "tier": normalized_tier,
            },
        )
