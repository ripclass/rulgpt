"""Unit tests for the retry-once-then-citations-only degrade path in
app.services.artifacts (self-review: unknown-reference validation)."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.services import artifacts
from app.services.integrations.llm_client import LLMUnavailableError


@dataclass
class _FakeLLMResult:
    text: str
    model: str = "fake/model"
    prompt_tokens: int = 10
    completion_tokens: int = 20
    cost_usd: float | None = 0.001


class _ScriptedLLMClient:
    """Returns each queued response in order, one per `generate_answer` call."""

    def __init__(self, responses: list[str]):
        self._responses = list(responses)
        self.calls: list[dict] = []

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.calls.append({"prompt": prompt, "system_prompt": system_prompt})
        text = self._responses.pop(0) if self._responses else ""
        return _FakeLLMResult(text=text)


CITATIONS = [
    {
        "rule_id": "UCP600_14",
        "rulebook": "UCP600",
        "reference": "Article 14",
        "excerpt": "Banks must examine documents to determine on their face whether they appear to comply.",
        "confidence": "high",
    }
]

# 3+ bracketed citations that don't overlap with the one allowed citation above —
# crosses answer_mentions_unknown_references' threshold of 3 for <=5 retrieved rules.
HALLUCINATED = "This is fine under [ISBP 999 Paragraph Z9], [URDG 758 Article 99], and [ISP98 Rule 42]."
CLEAN = "This is grounded in [UCP600 Article 14] only."


@pytest.mark.asyncio
async def test_case_note_uses_clean_first_answer_without_retry():
    llm = _ScriptedLLMClient([CLEAN])
    result = await artifacts.generate_case_note(llm, "q", "a", CITATIONS)
    assert result["body_markdown"] == CLEAN
    assert len(llm.calls) == 1


@pytest.mark.asyncio
async def test_case_note_retries_once_then_uses_clean_retry_answer():
    llm = _ScriptedLLMClient([HALLUCINATED, CLEAN])
    result = await artifacts.generate_case_note(llm, "q", "a", CITATIONS)
    assert result["body_markdown"] == CLEAN
    assert len(llm.calls) == 2
    assert "STRICT CITATION MODE" in llm.calls[1]["system_prompt"]


@pytest.mark.asyncio
async def test_case_note_degrades_to_citations_only_after_persistent_hallucination():
    llm = _ScriptedLLMClient([HALLUCINATED, HALLUCINATED])
    result = await artifacts.generate_case_note(llm, "q", "a", CITATIONS)
    assert len(llm.calls) == 2
    assert "verified citations" in result["body_markdown"]
    assert "UCP600 Article 14" in result["body_markdown"]


@pytest.mark.asyncio
async def test_draft_retries_once_then_degrades_to_citations_only():
    llm = _ScriptedLLMClient([HALLUCINATED, HALLUCINATED])
    result = await artifacts.generate_draft(llm, "q", "a", CITATIONS, "bank_response")
    assert len(llm.calls) == 2
    assert result["draft_type"] == "bank_response"
    assert "verified citations" in result["body_markdown"]


@pytest.mark.asyncio
async def test_draft_uses_clean_first_answer_without_retry():
    llm = _ScriptedLLMClient([CLEAN])
    result = await artifacts.generate_draft(llm, "q", "a", CITATIONS, "waiver_request")
    assert result["body_markdown"] == CLEAN
    assert len(llm.calls) == 1


# ---------------------------------------------------------------------------
# `degraded` flag — the router uses this to decide whether a one-off credit
# should be released (see tests/routers/test_artifacts.py).
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_case_note_clean_answer_is_not_degraded():
    llm = _ScriptedLLMClient([CLEAN])
    result = await artifacts.generate_case_note(llm, "q", "a", CITATIONS)
    assert result["degraded"] is False


@pytest.mark.asyncio
async def test_case_note_persistent_hallucination_is_degraded():
    llm = _ScriptedLLMClient([HALLUCINATED, HALLUCINATED])
    result = await artifacts.generate_case_note(llm, "q", "a", CITATIONS)
    assert result["degraded"] is True


@pytest.mark.asyncio
async def test_draft_clean_retry_after_hallucination_is_not_degraded():
    llm = _ScriptedLLMClient([HALLUCINATED, CLEAN])
    result = await artifacts.generate_draft(llm, "q", "a", CITATIONS, "waiver_request")
    assert result["degraded"] is False


class _UnavailableLLMClient:
    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        raise LLMUnavailableError("all providers failed")


@pytest.mark.asyncio
async def test_draft_llm_unavailable_is_degraded():
    result = await artifacts.generate_draft(_UnavailableLLMClient(), "q", "a", CITATIONS, "waiver_request")
    assert result["degraded"] is True
