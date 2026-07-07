"""OpenRouter-backed LLM client: config-driven model + fallback chain + cost accounting.

Replaces the Anthropic-primary/OpenAI-fallback ladder used before the 2026-07
LLM swap. Model selection is entirely config-driven (`RULGPT_LLM_MODEL`,
`RULGPT_LLM_FALLBACKS`, `RULGPT_CLASSIFIER_LLM_MODEL`); every model in the
chain is tried in order with per-model retries before the whole request is
considered unavailable.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

import httpx

from app.config import settings

from .openrouter import build_openrouter_headers, get_openrouter_base_url


@dataclass
class LLMResult:
    text: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float | None


@dataclass
class LLMStreamEvent:
    """One event from `stream_answer`. Delta events carry an incremental text
    chunk; the single terminal event (delta="") carries the finished
    `LLMResult` (full text, model, tokens, cost)."""
    delta: str = ""
    result: LLMResult | None = None


class LLMUnavailableError(Exception):
    """Raised when every model in the fallback chain fails."""


class _RetryableError(Exception):
    """Internal signal for 429/5xx/timeout responses eligible for retry."""


class OpenRouterLLMClient:
    """Thin async client for OpenRouter chat completions with fallback + cost."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
        max_retries: int = 2,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self.base_url = (base_url or get_openrouter_base_url()).rstrip("/")
        self.timeout = timeout
        self.max_retries = max(0, max_retries)
        self._client = client

    @property
    def is_available(self) -> bool:
        return bool(self.api_key)

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: str,
        model: str | None = None,
        max_tokens: int = 1200,
        temperature: float = 0.2,
    ) -> LLMResult:
        models = [model or settings.RULGPT_LLM_MODEL, *settings.llm_fallback_models()]
        # An explicit override (e.g. the opus-escalation model) still degrades
        # through the regular primary before the cheap fallbacks.
        if model and model != settings.RULGPT_LLM_MODEL:
            models.insert(1, settings.RULGPT_LLM_MODEL)
        return await self._run_chain(models, prompt, system_prompt, max_tokens, temperature)

    async def stream_answer(
        self,
        prompt: str,
        system_prompt: str,
        model: str | None = None,
        max_tokens: int = 1200,
        temperature: float = 0.2,
    ) -> AsyncIterator[LLMStreamEvent]:
        """Stream a completion token-by-token via OpenRouter SSE.

        Yields LLMStreamEvent deltas as text arrives, then a single terminal
        event carrying the finished LLMResult (full text + usage). Fallback is
        open-only: if a model fails BEFORE its first token, the next model in
        the chain is tried; once tokens have started flowing a mid-stream
        failure propagates (we can't silently swap models mid-answer). Callers
        that need a guaranteed answer fall back to the non-streaming
        `generate_answer` on any raised error.
        """
        if not self.is_available:
            raise LLMUnavailableError("OPENROUTER_API_KEY is not configured")
        models = [model or settings.RULGPT_LLM_MODEL, *settings.llm_fallback_models()]
        if model and model != settings.RULGPT_LLM_MODEL:
            models.insert(1, settings.RULGPT_LLM_MODEL)

        last_error: Exception | None = None
        for candidate_model in models:
            emitted = False
            try:
                async for event in self._stream_request(
                    candidate_model, prompt, system_prompt, max_tokens, temperature
                ):
                    emitted = True
                    yield event
                return  # stream finished cleanly
            except Exception as exc:  # noqa: BLE001 - decide by whether we already streamed
                last_error = exc
                if emitted:
                    raise  # partial output already sent — cannot switch models
                continue  # open failed before first token — try the next model
        raise LLMUnavailableError(f"All models failed to stream: {last_error}") from last_error

    async def _stream_request(
        self,
        model: str,
        user_prompt: str,
        system_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> AsyncIterator[LLMStreamEvent]:
        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
            "usage": {"include": True},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            **build_openrouter_headers(),
        }
        endpoint = f"{self.base_url}/chat/completions"

        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self.timeout)
        text_parts: list[str] = []
        final_model = model
        prompt_tokens = 0
        completion_tokens = 0
        cost: float | None = None
        try:
            try:
                async with client.stream("POST", endpoint, headers=headers, json=payload) as response:
                    if response.status_code == 429 or response.status_code >= 500:
                        raise _RetryableError(f"HTTP {response.status_code}")
                    if response.status_code >= 400:
                        await response.aread()
                        response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:"):].strip()
                        if data == "[DONE]":
                            break
                        try:
                            obj = json.loads(data)
                        except json.JSONDecodeError:
                            continue
                        choices = obj.get("choices") or []
                        if choices:
                            delta = (choices[0].get("delta") or {}).get("content")
                            if delta:
                                text_parts.append(delta)
                                yield LLMStreamEvent(delta=delta)
                        if obj.get("model"):
                            final_model = obj["model"]
                        usage = obj.get("usage")
                        if usage:
                            prompt_tokens = int(usage.get("prompt_tokens") or prompt_tokens)
                            completion_tokens = int(usage.get("completion_tokens") or completion_tokens)
                            if usage.get("cost") is not None:
                                cost = usage.get("cost")
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                raise _RetryableError(str(exc)) from exc
        finally:
            if owns_client:
                await client.aclose()

        yield LLMStreamEvent(
            result=LLMResult(
                text="".join(text_parts),
                model=final_model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_usd=cost,
            )
        )

    async def classify(
        self,
        query: str,
        system_prompt: str,
        model: str | None = None,
        max_tokens: int = 256,
        temperature: float = 0.0,
    ) -> str:
        models = [model or settings.RULGPT_CLASSIFIER_LLM_MODEL, *settings.llm_fallback_models()]
        result = await self._run_chain(models, query, system_prompt, max_tokens, temperature)
        return result.text

    async def _run_chain(
        self,
        models: list[str],
        user_prompt: str,
        system_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> LLMResult:
        if not self.is_available:
            raise LLMUnavailableError("OPENROUTER_API_KEY is not configured")

        last_error: Exception | None = None
        for candidate_model in models:
            for attempt in range(self.max_retries + 1):
                try:
                    return await self._request(
                        candidate_model, user_prompt, system_prompt, max_tokens, temperature
                    )
                except _RetryableError as exc:
                    last_error = exc
                    if attempt < self.max_retries:
                        await asyncio.sleep(0.5 * (2**attempt))
                        continue
                    break  # retries exhausted for this model — try the next one
                except Exception as exc:  # non-retryable — try the next model
                    last_error = exc
                    break

        raise LLMUnavailableError(f"All models in the chain failed: {last_error}") from last_error

    async def _request(
        self,
        model: str,
        user_prompt: str,
        system_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> LLMResult:
        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "usage": {"include": True},
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            **build_openrouter_headers(),
        }
        endpoint = f"{self.base_url}/chat/completions"

        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self.timeout)
        try:
            try:
                response = await client.post(endpoint, headers=headers, json=payload)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                raise _RetryableError(str(exc)) from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code == 429 or response.status_code >= 500:
            raise _RetryableError(f"HTTP {response.status_code}")
        response.raise_for_status()

        data = response.json()
        choices = data.get("choices") or []
        text = ""
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content")
            text = content if isinstance(content, str) else ""
        usage = data.get("usage") or {}
        return LLMResult(
            text=text,
            model=data.get("model") or model,
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            cost_usd=usage.get("cost"),
        )
