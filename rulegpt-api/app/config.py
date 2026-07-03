"""Application configuration."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-backed settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "RuleGPT API"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/rulegpt"
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    API_PREFIX: str = "/api"
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "https://www.rulgpt.com",
            "https://rulgpt.com",
            "https://www.tfrules.com",   # legacy domain kept during 301 transition
            "https://tfrules.com",
        ]
    )
    CORS_ORIGIN_REGEX: str | None = (
        r"^https://([a-z0-9-]+\.)*vercel\.app$"
        r"|^https://([a-z0-9-]+\.)?rulgpt\.com$"
        r"|^https://([a-z0-9-]+\.)?tfrules\.com$"
    )

    FREE_TIER_MONTHLY_LIMIT: int = 5
    PROFESSIONAL_TIER_MONTHLY_LIMIT: int = 500
    ENTERPRISE_TIER_MONTHLY_LIMIT: int = 2000

    RATE_LIMIT_PER_MIN_ANON: int = 30
    RATE_LIMIT_PER_MIN_AUTH: int = 120

    ANTHROPIC_API_KEY: str | None = None
    # Legacy Claude model fields — harmless, unused after the 2026-07 OpenRouter
    # LLM swap (see RULGPT_LLM_MODEL below). Kept for now; remove in a later
    # cleanup once the swap is confirmed stable.
    RULEGPT_CLASSIFIER_MODEL: str = "claude-haiku-4-5-20251001"
    RULEGPT_GENERATOR_MODEL: str = "claude-sonnet-4-6"
    RULEGPT_COMPLEX_MODEL: str = "claude-sonnet-4-6"

    RULEGPT_ENABLE_SMART_ROUTING: bool = True
    RULEGPT_TEMPLATE_ENGINE_ENABLED: bool = True
    RULEGPT_HAIKU_MODEL: str = "claude-haiku-4-5-20251001"
    RULEGPT_OPUS_MODEL: str = "claude-opus-4-6"

    # OpenRouter-routed generation/classification models (2026-07 LLM swap).
    RULGPT_LLM_MODEL: str = "z-ai/glm-5"  # primary — verified live 2026-07-03: $0.60/$1.92 per 1M, 202k ctx
    RULGPT_LLM_FALLBACKS: str = "deepseek/deepseek-v4-pro,qwen/qwen3.7-plus"  # $0.435/$0.87 and $0.32/$1.28 per 1M
    RULGPT_CLASSIFIER_LLM_MODEL: str = "z-ai/glm-4.7-flash"  # heuristic-first; LLM assist — $0.06/$0.40 per 1M

    OPENAI_API_KEY: str | None = None
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_HTTP_REFERER: str | None = None
    OPENROUTER_APP_TITLE: str | None = None
    RULEGPT_EMBEDDING_MODEL: str = "text-embedding-3-small"
    RULEGPT_FALLBACK_MODEL: str = "gpt-4.1"

    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_ISSUER: str | None = None
    SUPABASE_JWKS_URL: str | None = None
    SUPABASE_JWT_AUDIENCE: str | None = None

    RULHUB_API_URL: str = "https://api.rulhub.com"
    RULHUB_API_KEY: str | None = None
    RULEGPT_LOCAL_RULES_ROOT: str | None = None

    RETRIEVAL_BACKEND: str = "rulhub"          # "rulhub" | "local" (rollback switch)
    RULGPT_RETRIEVAL_CACHE_TTL: int = 1800     # seconds, in-process retrieval cache
    RULGPT_RERANK_EMBEDDINGS: bool = True      # embed-rerank RulHub candidates when OPENAI key present

    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID: str = "price_1TJQ0SBG8gnvAJXaWxLicmkA"
    STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID: str = "price_1TJQ1IBG8gnvAJXaBTtfnuA6"
    STRIPE_ENTERPRISE_MONTHLY_PRICE_ID: str = "price_1TJQ1LBG8gnvAJXafcNqUOOv"
    STRIPE_ENTERPRISE_ANNUAL_PRICE_ID: str = "price_1TJQ1NBG8gnvAJXaZZlHHCmh"

    ADMIN_SECRET: str | None = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> List[str]:
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("[") and raw.endswith("]"):
                # Allow JSON-style array passed as env.
                try:
                    import json

                    decoded = json.loads(raw)
                    if isinstance(decoded, list):
                        return [str(v).strip() for v in decoded if str(v).strip()]
                except Exception:
                    pass
            return [part.strip() for part in raw.split(",") if part.strip()]
        return []

    @model_validator(mode="after")
    def validate_required_production_values(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            missing = []
            if not self.DATABASE_URL:
                missing.append("DATABASE_URL")
            if self.SECRET_KEY == "dev-secret-key-change-in-production":
                missing.append("SECRET_KEY")
            if missing:
                raise ValueError(
                    "Missing required production environment variables: "
                    + ", ".join(missing)
                )
        return self

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    def llm_fallback_models(self) -> List[str]:
        return [m.strip() for m in self.RULGPT_LLM_FALLBACKS.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    # Keep this tiny hook so tests can clear cache and override env.
    return Settings()


settings = get_settings()
