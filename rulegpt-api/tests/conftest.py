"""Suite-wide pytest setup."""

from __future__ import annotations

import pytest

from app.config import get_settings


@pytest.fixture(autouse=True)
def _no_live_llm_keys(monkeypatch):
    """Null every LLM/embedding provider API key for every test, on both
    code paths that read a key:

    - `app.config.settings.OPENROUTER_API_KEY` / `.OPENAI_API_KEY` — read by
      `llm_client.OpenRouterLLMClient` and `rulhub_retriever._get_or_create_openai_client`.
    - `os.getenv("OPENROUTER_API_KEY" | "OPENAI_API_KEY" | "ANTHROPIC_API_KEY")`
      — read directly by `services.integrations.openrouter` and, through it,
      `openai_client.OpenAIClient`.

    This repo's dev shell has a real OPENROUTER_API_KEY set. Without this
    guard, any test that constructs a client with no explicit key (e.g. a
    stale `x_client=None` test double falling through to a default
    constructor) makes a real, billed network call instead of failing fast.
    One such leak was already found and fixed in the classifier tests
    (`tests/rag/test_classifier_and_pipeline.py`) — this fixture prevents
    the next one from going unnoticed.

    Tests that specifically need a key set it explicitly, after this
    fixture's setup has run — either via `monkeypatch.setattr(settings,
    "OPENROUTER_API_KEY", "sk-or-test")` / `monkeypatch.setenv(...)` in the
    test body, or by passing an explicit `api_key=...` to a client
    constructor (which bypasses the settings/env lookup entirely).
    """
    settings = get_settings()
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    yield
