from __future__ import annotations

from types import SimpleNamespace

import httpx
import pytest

from app.services.integrations.anthropic_client import AnthropicClient
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


@pytest.mark.asyncio
async def test_anthropic_client_uses_openrouter_chat_completions(monkeypatch) -> None:
    seen_models: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = request.read().decode("utf-8")
        seen_models.append(body)
        assert request.headers["Authorization"] == "Bearer sk-or-test"
        assert request.headers["HTTP-Referer"] == "https://rulegpt.com"
        assert request.headers["X-OpenRouter-Title"] == "RuleGPT"
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": "{\"domain\":\"icc\",\"jurisdiction\":\"global\",\"document_type\":\"lc\",\"commodity\":null,\"complexity\":\"simple\",\"in_scope\":true,\"reason\":\"ok\"}"
                        }
                    }
                ]
            },
        )

    transport = httpx.MockTransport(handler)

    class _FakeAsyncClient(httpx.AsyncClient):
        def __init__(self, *args, **kwargs):
            super().__init__(transport=transport, *args, **kwargs)

    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    monkeypatch.setenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    monkeypatch.setenv("OPENROUTER_HTTP_REFERER", "https://rulegpt.com")
    monkeypatch.setenv("OPENROUTER_APP_TITLE", "RuleGPT")
    monkeypatch.setattr("app.services.integrations.anthropic_client.httpx.AsyncClient", _FakeAsyncClient)

    client = AnthropicClient()
    result = await client.classify(
        query="What does UCP600 say about transport documents?",
        system_prompt="Return JSON only",
    )

    assert "\"domain\":\"icc\"" in result
    assert any("anthropic/claude-haiku-4.5" in payload for payload in seen_models)
