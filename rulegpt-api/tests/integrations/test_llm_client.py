from __future__ import annotations

import json

import httpx
import pytest

from app.services.integrations.llm_client import (
    LLMStreamEvent,
    LLMUnavailableError,
    OpenRouterLLMClient,
)


def _sse(*chunks: str) -> bytes:
    return "".join(f"data: {c}\n\n" for c in chunks).encode()


def make_llm_client(handler, max_retries: int = 2) -> OpenRouterLLMClient:
    transport = httpx.MockTransport(handler)
    async_client = httpx.AsyncClient(transport=transport)
    return OpenRouterLLMClient(api_key="sk-or-test", client=async_client, max_retries=max_retries)


@pytest.mark.asyncio
async def test_generate_answer_returns_cost():
    def handler(request):
        body = json.loads(request.content)
        assert body["usage"] == {"include": True}
        return httpx.Response(200, json={"choices": [{"message": {"content": "UCP 600 Article 20 answer"}}],
                                         "usage": {"prompt_tokens": 900, "completion_tokens": 180, "cost": 0.00042},
                                         "model": body["model"]})
    c = make_llm_client(handler)
    res = await c.generate_answer("q", "system")
    assert res.text.startswith("UCP 600") and res.cost_usd == pytest.approx(0.00042)


@pytest.mark.asyncio
async def test_fallback_chain_on_5xx():
    models_tried = []
    def handler(request):
        m = json.loads(request.content)["model"]; models_tried.append(m)
        if len(models_tried) < 3:  # primary retries exhausted then fallback-1 succeeds
            return httpx.Response(503)
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}],
                                         "usage": {"prompt_tokens": 1, "completion_tokens": 1}, "model": m})
    c = make_llm_client(handler, max_retries=1)
    res = await c.generate_answer("q", "s")
    assert res.text == "ok" and len(set(models_tried)) >= 2


@pytest.mark.asyncio
async def test_all_models_fail_raises_llm_unavailable():
    def handler(request): return httpx.Response(503)
    c = make_llm_client(handler, max_retries=0)
    with pytest.raises(LLMUnavailableError):
        await c.generate_answer("q", "s")


@pytest.mark.asyncio
async def test_generate_answer_uses_configured_primary_model_by_default():
    seen_models = []

    def handler(request):
        body = json.loads(request.content)
        seen_models.append(body["model"])
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}],
                                         "usage": {"prompt_tokens": 1, "completion_tokens": 1}, "model": body["model"]})

    c = make_llm_client(handler)
    from app.config import settings
    await c.generate_answer("q", "s")
    assert seen_models[0] == settings.RULGPT_LLM_MODEL


@pytest.mark.asyncio
async def test_classify_uses_classifier_model_by_default():
    seen_models = []

    def handler(request):
        body = json.loads(request.content)
        seen_models.append(body["model"])
        return httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}],
                                         "usage": {"prompt_tokens": 1, "completion_tokens": 1}, "model": body["model"]})

    c = make_llm_client(handler)
    from app.config import settings
    result = await c.classify("q", "s")
    assert result == "{}"
    assert seen_models[0] == settings.RULGPT_CLASSIFIER_LLM_MODEL


def test_is_available_false_without_api_key(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    c = OpenRouterLLMClient()
    assert c.is_available is False


def test_is_available_true_with_api_key():
    c = OpenRouterLLMClient(api_key="sk-or-test")
    assert c.is_available is True


@pytest.mark.asyncio
async def test_raises_immediately_when_no_api_key_configured(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    c = OpenRouterLLMClient()
    with pytest.raises(LLMUnavailableError):
        await c.generate_answer("q", "s")


@pytest.mark.asyncio
async def test_model_override_degrades_through_primary_before_fallbacks():
    """An opus-escalation override that fails must fall back to the regular
    primary (RULGPT_LLM_MODEL) before the cheap fallback list."""
    models_tried = []

    def handler(request):
        m = json.loads(request.content)["model"]
        models_tried.append(m)
        if m == "anthropic/claude-opus-4.8":
            return httpx.Response(503)
        return httpx.Response(200, json={
            "choices": [{"message": {"content": "ok"}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1},
            "model": m,
        })

    c = make_llm_client(handler, max_retries=0)
    res = await c.generate_answer("q", "s", model="anthropic/claude-opus-4.8")
    assert res.text == "ok"
    from app.config import settings
    assert models_tried[0] == "anthropic/claude-opus-4.8"
    assert models_tried[1] == settings.RULGPT_LLM_MODEL


@pytest.mark.asyncio
async def test_stream_answer_yields_deltas_then_result():
    def handler(request):
        body = json.loads(request.content)
        assert body["stream"] is True
        return httpx.Response(200, content=_sse(
            json.dumps({"choices": [{"delta": {"content": "Under UCP600"}}], "model": body["model"]}),
            json.dumps({"choices": [{"delta": {"content": " Article 14"}}]}),
            json.dumps({"choices": [], "usage": {"prompt_tokens": 50, "completion_tokens": 7, "cost": 0.0003},
                        "model": body["model"]}),
            "[DONE]",
        ))
    c = make_llm_client(handler)
    deltas, result = [], None
    async for ev in c.stream_answer("q", "system"):
        if ev.result is not None:
            result = ev.result
        elif ev.delta:
            deltas.append(ev.delta)
    assert deltas == ["Under UCP600", " Article 14"]
    assert result is not None
    assert result.text == "Under UCP600 Article 14"
    assert result.completion_tokens == 7 and result.cost_usd == pytest.approx(0.0003)


@pytest.mark.asyncio
async def test_stream_answer_falls_to_next_model_on_open_5xx():
    tried = []
    def handler(request):
        m = json.loads(request.content)["model"]; tried.append(m)
        if len(tried) == 1:
            return httpx.Response(503)
        return httpx.Response(200, content=_sse(
            json.dumps({"choices": [{"delta": {"content": "ok"}}], "model": m}), "[DONE]"))
    c = make_llm_client(handler, max_retries=0)
    text = "".join(ev.delta for ev in [e async for e in c.stream_answer("q", "s")] if ev.delta)
    assert text == "ok" and len(tried) >= 2


@pytest.mark.asyncio
async def test_stream_answer_all_models_fail_raises():
    def handler(request): return httpx.Response(503)
    c = make_llm_client(handler, max_retries=0)
    with pytest.raises(LLMUnavailableError):
        async for _ in c.stream_answer("q", "s"):
            pass
