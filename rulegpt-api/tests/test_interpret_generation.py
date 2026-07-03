"""Unit tests for the retry-once-then-citations-only degrade path in
app.routers.interpret._generate_mt700_answer (self-review: unknown-reference
validation for the MT700 interpreter, mirroring the artifacts generator)."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.routers import interpret
from app.services.mt700 import flag_soft_clauses, parse_mt700
from app.services.rag.models import RetrievedRule

SAMPLE_MT700 = ":20:LC0012345\n:31D:260930LONDON\n:32B:USD500000,00 ABOUT USD 500,000\n"


@dataclass
class _FakeLLMResult:
    text: str
    model: str = "fake/model"
    prompt_tokens: int = 10
    completion_tokens: int = 20
    cost_usd: float | None = 0.001


class _ScriptedLLMClient:
    def __init__(self, responses: list[str]):
        self._responses = list(responses)
        self.calls: list[dict] = []

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.calls.append({"prompt": prompt, "system_prompt": system_prompt})
        text = self._responses.pop(0) if self._responses else ""
        return _FakeLLMResult(text=text)


def _rules() -> list[RetrievedRule]:
    return [
        RetrievedRule(
            rule_id="UCP600_30",
            rulebook="UCP600",
            reference="Article 30",
            title="Tolerance in credit amount",
            excerpt="The words 'about' or 'approximately' allow a tolerance not exceeding 10% more or less.",
        )
    ]


HALLUCINATED = "This is fine under [ISBP 999 Paragraph Z9], [URDG 758 Article 99], and [ISP98 Rule 42]."
CLEAN = "This is grounded in [UCP600 Article 30] only."


@pytest.mark.asyncio
async def test_generate_mt700_answer_uses_clean_first_answer_without_retry(monkeypatch):
    llm = _ScriptedLLMClient([CLEAN])
    monkeypatch.setattr(interpret, "llm_client", llm)

    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    answer = await interpret._generate_mt700_answer(fields, flags, _rules())

    assert answer == CLEAN
    assert len(llm.calls) == 1


@pytest.mark.asyncio
async def test_generate_mt700_answer_retries_once_then_uses_clean_retry(monkeypatch):
    llm = _ScriptedLLMClient([HALLUCINATED, CLEAN])
    monkeypatch.setattr(interpret, "llm_client", llm)

    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    answer = await interpret._generate_mt700_answer(fields, flags, _rules())

    assert answer == CLEAN
    assert len(llm.calls) == 2
    assert "STRICT CITATION MODE" in llm.calls[1]["system_prompt"]


@pytest.mark.asyncio
async def test_generate_mt700_answer_degrades_to_citations_only_after_persistent_hallucination(monkeypatch):
    llm = _ScriptedLLMClient([HALLUCINATED, HALLUCINATED])
    monkeypatch.setattr(interpret, "llm_client", llm)

    fields = parse_mt700(SAMPLE_MT700)
    flags = flag_soft_clauses(fields)
    answer = await interpret._generate_mt700_answer(fields, flags, _rules())

    assert len(llm.calls) == 2
    assert "verified citations" in answer
    assert "UCP600 Article 30" in answer
