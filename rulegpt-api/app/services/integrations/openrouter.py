"""Helpers for OpenRouter-backed provider access."""

from __future__ import annotations

import os


OPENROUTER_BASE_URL_DEFAULT = "https://openrouter.ai/api/v1"


def is_openrouter_enabled() -> bool:
    return bool((os.getenv("OPENROUTER_API_KEY") or "").strip())


def get_openrouter_api_key() -> str | None:
    value = (os.getenv("OPENROUTER_API_KEY") or "").strip()
    return value or None


def get_openrouter_base_url() -> str:
    return (os.getenv("OPENROUTER_BASE_URL") or OPENROUTER_BASE_URL_DEFAULT).rstrip("/")


def build_openrouter_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    referer = (os.getenv("OPENROUTER_HTTP_REFERER") or "").strip()
    title = (os.getenv("OPENROUTER_APP_TITLE") or "").strip()
    if referer:
        headers["HTTP-Referer"] = referer
    if title:
        headers["X-OpenRouter-Title"] = title
    return headers


def normalize_openrouter_model(model: str | None, purpose: str = "chat") -> str:
    raw = (model or "").strip()
    if not raw:
        return "openai/text-embedding-3-small" if purpose == "embedding" else "openai/gpt-4.1"
    if "/" in raw:
        return raw

    exact_map = {
        "gpt-4.1": "openai/gpt-4.1",
        "text-embedding-3-small": "openai/text-embedding-3-small",
        "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4.5",
        "claude-haiku-4.5": "anthropic/claude-haiku-4.5",
        "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
        "claude-sonnet-4.6": "anthropic/claude-sonnet-4.6",
    }
    lowered = raw.lower()
    if lowered in exact_map:
        return exact_map[lowered]
    if lowered.startswith("gpt-"):
        return f"openai/{raw}"
    if lowered.startswith("text-embedding-"):
        return f"openai/{raw}"
    if lowered.startswith("claude-"):
        return f"anthropic/{raw}"
    return raw
