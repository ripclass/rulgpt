"""Anthropic integration client wrappers for classification and generation."""

from __future__ import annotations

import asyncio
import os
from typing import Any, Awaitable, Callable

try:
    from anthropic import (  # type: ignore
        APIConnectionError,
        APIStatusError,
        APITimeoutError,
        AsyncAnthropic,
        RateLimitError,
    )
except ImportError:  # pragma: no cover - dependency may not exist in all environments
    APIConnectionError = Exception  # type: ignore
    APIStatusError = Exception  # type: ignore
    APITimeoutError = Exception  # type: ignore
    RateLimitError = Exception  # type: ignore
    AsyncAnthropic = None  # type: ignore


class AnthropicClientError(RuntimeError):
    """Raised for Anthropic client errors."""


class AnthropicClient:
    """Thin async wrapper around Anthropic APIs used by RuleGPT."""

    def __init__(
        self,
        api_key: str | None = None,
        classifier_model: str | None = None,
        generator_model: str | None = None,
        complex_model: str | None = None,
        timeout_seconds: float = 10.0,
        max_retries: int = 3,
        backoff_seconds: float = 0.5,
        client: Any | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.classifier_model = classifier_model or os.getenv("RULEGPT_CLASSIFIER_MODEL", "claude-haiku-4-5-20251001")
        self.generator_model = generator_model or os.getenv("RULEGPT_GENERATOR_MODEL", "claude-sonnet-4-6")
        self.complex_model = complex_model or os.getenv("RULEGPT_COMPLEX_MODEL", "claude-sonnet-4-6")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self.backoff_seconds = max(0.0, backoff_seconds)
        self._client = client

    async def classify(
        self,
        query: str,
        system_prompt: str,
        model: str | None = None,
        max_tokens: int = 256,
        temperature: float = 0.0,
    ) -> str:
        target_model = model or self.classifier_model
        response = await self._messages_create(
            model=target_model,
            system_prompt=system_prompt,
            user_prompt=query,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return _extract_text(response)

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: str,
        model: str | None = None,
        max_tokens: int = 1200,
        temperature: float = 0.2,
        extended_thinking: bool = False,
    ) -> str:
        target_model = model or (self.complex_model if extended_thinking else self.generator_model)
        token_budget = max_tokens if not extended_thinking else max(max_tokens, 2200)
        response = await self._messages_create(
            model=target_model,
            system_prompt=system_prompt,
            user_prompt=prompt,
            max_tokens=token_budget,
            temperature=temperature,
        )
        return _extract_text(response)

    async def _messages_create(
        self,
        model: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float,
    ) -> Any:
        client = self._get_or_create_client()

        async def _op() -> Any:
            return await client.messages.create(
                model=model,
                system=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": user_prompt}],
            )

        return await self._retry(_op)

    def _get_or_create_client(self) -> Any:
        if self._client is not None:
            return self._client
        if AsyncAnthropic is None:
            raise AnthropicClientError("anthropic package is not installed")
        if not self.api_key:
            raise AnthropicClientError("ANTHROPIC_API_KEY is not configured")
        self._client = AsyncAnthropic(api_key=self.api_key, timeout=self.timeout_seconds)
        return self._client

    async def _retry(self, operation: Callable[[], Awaitable[Any]]) -> Any:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return await operation()
            except Exception as exc:  # pragma: no cover - branch coverage depends on installed SDK
                if not self._should_retry(exc) or attempt >= self.max_retries:
                    raise AnthropicClientError(
                        f"Anthropic request failed after {attempt} attempt(s): {exc}"
                    ) from exc
                last_error = exc
                await asyncio.sleep(self.backoff_seconds * (2 ** (attempt - 1)))
        raise AnthropicClientError(f"Anthropic request failed: {last_error}") from last_error

    @staticmethod
    def _should_retry(error: Exception) -> bool:
        if isinstance(error, (RateLimitError, APIConnectionError, APITimeoutError)):
            return True
        if isinstance(error, APIStatusError):
            status_code = getattr(error, "status_code", None)
            return bool(status_code and (status_code >= 500 or status_code == 429))
        return False


def _extract_text(response: Any) -> str:
    parts: list[str] = []
    for item in getattr(response, "content", []):
        if getattr(item, "type", None) == "text":
            text = getattr(item, "text", None)
            if text:
                parts.append(text)
    return "\n".join(parts).strip()

