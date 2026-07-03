from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services.integrations.openai_client import OpenAIClient


@pytest.mark.asyncio
async def test_openai_client_uses_openrouter_base_url_and_headers(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class _FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.embeddings = SimpleNamespace(create=None)
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=None))

    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    monkeypatch.setenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("OPENROUTER_HTTP_REFERER", "https://rulegpt.com")
    monkeypatch.setenv("OPENROUTER_APP_TITLE", "RuleGPT")
    monkeypatch.setattr("app.services.integrations.openai_client.AsyncOpenAI", _FakeAsyncOpenAI)

    client = OpenAIClient()
    client._get_or_create_client()

    assert captured["api_key"] == "sk-or-test"
    assert captured["base_url"] == "https://openrouter.ai/api/v1"
    assert captured["default_headers"] == {
        "HTTP-Referer": "https://rulegpt.com",
        "X-OpenRouter-Title": "RuleGPT",
    }
