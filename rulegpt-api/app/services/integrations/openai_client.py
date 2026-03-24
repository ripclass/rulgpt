"""OpenAI integration client wrappers for embeddings and fallback generation."""

from __future__ import annotations

import asyncio
import os
from typing import Any, Awaitable, Callable, Sequence

try:
    from openai import (  # type: ignore
        APIConnectionError,
        APITimeoutError,
        APIStatusError,
        AsyncOpenAI,
        RateLimitError,
    )
except ImportError:  # pragma: no cover - dependency may not exist in all environments
    APIConnectionError = Exception  # type: ignore
    APITimeoutError = Exception  # type: ignore
    APIStatusError = Exception  # type: ignore
    RateLimitError = Exception  # type: ignore
    AsyncOpenAI = None  # type: ignore


class OpenAIClientError(RuntimeError):
    """Raised for OpenAI client errors."""


class OpenAIClient:
    """Thin async wrapper around OpenAI APIs used by RuleGPT."""

    def __init__(
        self,
        api_key: str | None = None,
        embedding_model: str | None = None,
        fallback_model: str | None = None,
        timeout_seconds: float = 10.0,
        max_retries: int = 3,
        backoff_seconds: float = 0.5,
        client: Any | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.embedding_model = embedding_model or os.getenv("RULEGPT_EMBEDDING_MODEL", "text-embedding-3-small")
        self.fallback_model = fallback_model or os.getenv("RULEGPT_FALLBACK_MODEL", "gpt-4.1")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self.backoff_seconds = max(0.0, backoff_seconds)
        self._client = client

    async def embed_texts(self, texts: Sequence[str], model: str | None = None) -> list[list[float]]:
        if not texts:
            return []
        openai_client = self._get_or_create_client()
        target_model = model or self.embedding_model

        async def _op() -> Any:
            return await openai_client.embeddings.create(model=target_model, input=list(texts))

        response = await self._retry(_op)
        embeddings: list[list[float]] = []
        for item in getattr(response, "data", []):
            vector = getattr(item, "embedding", None)
            if isinstance(vector, list):
                embeddings.append(vector)
        if len(embeddings) != len(texts):
            raise OpenAIClientError(
                f"Embedding response count mismatch: expected={len(texts)} actual={len(embeddings)}"
            )
        return embeddings

    async def generate_fallback(
        self,
        prompt: str,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> str:
        openai_client = self._get_or_create_client()
        target_model = model or self.fallback_model
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async def _op() -> Any:
            return await openai_client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )

        response = await self._retry(_op)
        choices = getattr(response, "choices", [])
        if not choices:
            return ""
        message = getattr(choices[0], "message", None)
        content = getattr(message, "content", "")
        return content or ""

    def _get_or_create_client(self) -> Any:
        if self._client is not None:
            return self._client
        if AsyncOpenAI is None:
            raise OpenAIClientError("openai package is not installed")
        if not self.api_key:
            raise OpenAIClientError("OPENAI_API_KEY is not configured")
        self._client = AsyncOpenAI(api_key=self.api_key, timeout=self.timeout_seconds)
        return self._client

    async def _retry(self, operation: Callable[[], Awaitable[Any]]) -> Any:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return await operation()
            except Exception as exc:  # pragma: no cover - branch coverage depends on installed SDK
                if not self._should_retry(exc) or attempt >= self.max_retries:
                    raise OpenAIClientError(f"OpenAI request failed after {attempt} attempt(s): {exc}") from exc
                last_error = exc
                await asyncio.sleep(self.backoff_seconds * (2 ** (attempt - 1)))
        raise OpenAIClientError(f"OpenAI request failed: {last_error}") from last_error

    @staticmethod
    def _should_retry(error: Exception) -> bool:
        if isinstance(error, (RateLimitError, APIConnectionError, APITimeoutError)):
            return True
        if isinstance(error, APIStatusError):
            status_code = getattr(error, "status_code", None)
            return bool(status_code and (status_code >= 500 or status_code == 429))
        return False

