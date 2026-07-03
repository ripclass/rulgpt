from __future__ import annotations

import pytest

from app.services.integrations.llm_client import LLMResult, LLMUnavailableError
from app.services.rag.generator import (
    AnswerGenerator,
    assess_partial_coverage,
    compose_grounded_answer,
    normalize_generated_answer,
)
from app.services.rag.models import ClassifierOutput, RetrievedRule


class _HallucinatingLLMClient:
    """Always cites references not in the retrieved rules — 3+ unknown
    references trips the hallucination-rejection threshold (see
    `answer_mentions_unknown_references` in generator.py). Returns the same
    hallucinated text on every call, so a retry does not help."""

    is_available = True

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        return LLMResult(
            text=(
                "## Insurance documents under UCP600\n\n"
                "According to [UCP600 Article 18], [UCP600 Article 19], and "
                "[UCP600 Article 20], insurance cover notes are not accepted.\n\n"
                "**Follow-up questions you might have:**\n"
                "1. Do you want more detail?\n"
                "2. Should I compare this with CIP?\n"
            ),
            model="fake-hallucinating-model",
            prompt_tokens=10,
            completion_tokens=20,
            cost_usd=0.001,
        )


class _RetryThenCleanLLMClient:
    """Hallucinates on the first call, returns a clean grounded answer on
    the strict-mode retry."""

    is_available = True

    def __init__(self) -> None:
        self.calls = 0

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.calls += 1
        if self.calls == 1:
            return LLMResult(
                text=(
                    "According to [UCP600 Article 18], [UCP600 Article 19], and "
                    "[UCP600 Article 20], insurance cover notes are not accepted."
                ),
                model="fake-model",
                prompt_tokens=10,
                completion_tokens=20,
                cost_usd=0.001,
            )
        return LLMResult(
            text="Cover notes are not accepted. [UCP600 Article 28]",
            model="fake-model-retry",
            prompt_tokens=10,
            completion_tokens=15,
            cost_usd=0.0008,
        )


class _UnavailableLLMClient:
    is_available = False

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        raise LLMUnavailableError("all models in the chain failed")


class _BudgetCaptureLLMClient:
    is_available = True

    def __init__(self) -> None:
        self.max_tokens: int | None = None

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.max_tokens = max_tokens
        return LLMResult(
            text="Cover notes are not accepted. [UCP600 Article 28]",
            model="fake-budget-model",
            prompt_tokens=5,
            completion_tokens=10,
            cost_usd=0.0005,
        )


def _insurance_rule() -> RetrievedRule:
    return RetrievedRule(
        rule_id="UCP600-28",
        rulebook="UCP600",
        reference="Article 28",
        title="Insurance Document and Coverage",
        excerpt="Insurance documents must be issued and signed by an insurance company or authorized agent. Cover notes are not accepted.",
        domain="icc",
        jurisdiction="global",
        document_type="other",
        similarity_score=0.88,
        rerank_score=0.86,
    )


def _rcep_scope_rule() -> RetrievedRule:
    return RetrievedRule(
        rule_id="RCEP-SCOPE-001",
        rulebook="RCEP",
        reference="RCEP Agreement, Chapter 3",
        title="RCEP Membership and Scope",
        excerpt="RCEP includes 15 Asia-Pacific countries and trade between RCEP members may qualify for preferential treatment.",
        domain="fta",
        jurisdiction="rcep",
        document_type="other",
        similarity_score=0.87,
        rerank_score=0.85,
        metadata={
            "raw_detail": {
                "metadata": {
                    "members": [
                        {"country": "Australia", "code": "AU"},
                        {"country": "China", "code": "CN"},
                        {"country": "Japan", "code": "JP"},
                        {"country": "Vietnam", "code": "VN"},
                    ]
                }
            }
        },
    )


def _rcep_origin_rule() -> RetrievedRule:
    return RetrievedRule(
        rule_id="RCEP-ORIGIN-001",
        rulebook="RCEP",
        reference="RCEP Chapter 3, Article 3.2",
        title="RCEP Rules of Origin - General",
        excerpt="Goods qualify as originating if wholly obtained, produced exclusively from originating materials, or satisfy product-specific rules.",
        domain="fta",
        jurisdiction="rcep",
        document_type="other",
        similarity_score=0.83,
        rerank_score=0.8,
    )


@pytest.mark.asyncio
async def test_generator_degrades_to_citations_only_after_retry_still_hallucinates():
    generator = AnswerGenerator(llm_client=_HallucinatingLLMClient())
    rules = [_insurance_rule()]

    result = await generator.generate(
        query="How does UCP600 handle insurance documents?",
        retrieved_rules=rules,
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global", document_type="other"),
    )

    assert result["model_used"] == "citations-only"
    assert "Here are the relevant rules" in result["answer"]
    assert "[UCP600 Article 28]" in result["answer"]
    assert result["cost_usd"] == 0.0


@pytest.mark.asyncio
async def test_generator_uses_retry_answer_when_second_attempt_is_clean():
    client = _RetryThenCleanLLMClient()
    generator = AnswerGenerator(llm_client=client)
    rules = [_insurance_rule()]

    result = await generator.generate(
        query="How does UCP600 handle insurance documents?",
        retrieved_rules=rules,
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global", document_type="other"),
    )

    assert client.calls == 2
    assert result["model_used"] == "fake-model-retry"
    assert "[UCP600 Article 28]" in result["answer"]
    assert "Article 18" not in result["answer"]
    assert result["cost_usd"] == pytest.approx(0.0008)


@pytest.mark.asyncio
async def test_generator_falls_back_to_grounded_when_llm_unavailable():
    generator = AnswerGenerator(llm_client=_UnavailableLLMClient())
    rules = [_insurance_rule()]

    result = await generator.generate(
        query="How does UCP600 handle insurance documents?",
        retrieved_rules=rules,
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global", document_type="other"),
    )

    assert result["model_used"] == "grounded-fallback"
    assert "[UCP600 Article 28]" in result["answer"]
    assert result["cost_usd"] == 0.0


def test_compose_grounded_answer_for_partial_cif_query_is_explicit():
    rules = [_insurance_rule()]

    answer = compose_grounded_answer(
        query="What documents are required for a CIF shipment under UCP600?",
        rules=rules,
        partial_coverage=assess_partial_coverage(
            "What documents are required for a CIF shipment under UCP600?",
            rules,
        ),
    )

    assert "only confirm part of the document set" in answer
    assert "[UCP600 Article 28]" in answer
    assert "does not clearly cover" in answer


def test_normalize_generated_answer_strips_markdown_and_followup_block():
    raw = (
        "## Heading\n\n"
        "Based on the retrieved rules, cover notes are not accepted. [UCP600 Article 28]\n\n"
        "---\n\n"
        "Follow-up questions you might have:\n"
        "1. Do you want more detail?\n"
        "2. Should I compare this with CIP?\n"
    )

    normalized = normalize_generated_answer(raw)

    assert "##" not in normalized
    assert "Follow-up questions" not in normalized
    assert "Do you want more detail?" not in normalized
    assert "[UCP600 Article 28]" in normalized
    assert not normalized.startswith("Based on the retrieved rules")


def test_compose_grounded_answer_surfaces_fta_scope_before_origin_mechanics():
    answer = compose_grounded_answer(
        query="Does my garment qualify for RCEP preferential tariff from Bangladesh?",
        rules=[_rcep_scope_rule(), _rcep_origin_rule()],
        partial_coverage=False,
    )

    assert answer.startswith("No.")
    assert "Bangladesh" in answer
    assert "[RCEP RCEP Agreement, Chapter 3]" in answer
    assert "- Scope:" in answer


@pytest.mark.asyncio
async def test_generator_uses_baseline_token_budget_for_simple_queries():
    client = _BudgetCaptureLLMClient()
    generator = AnswerGenerator(llm_client=client)

    result = await generator.generate(
        query="How does UCP600 handle insurance documents?",
        retrieved_rules=[_insurance_rule()],
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global", document_type="other", complexity="simple"),
    )

    assert result["answer"]
    # Single-question, single-rule, single-domain ICC query → bare base budget.
    assert client.max_tokens == 600


@pytest.mark.asyncio
async def test_generator_allows_longer_budget_when_query_needs_more_detail():
    client = _BudgetCaptureLLMClient()
    generator = AnswerGenerator(llm_client=client)

    # Mix domains so multi-domain bonus (+300) is added on top of 5+ rules (+200) + sanctions (+300).
    icc_rule = _insurance_rule()
    sanctions_rule = RetrievedRule(
        rule_id="OFAC-IRAN-1", rulebook="OFAC", reference="50 CFR 560",
        title="Iran Transactions", excerpt="US persons may not engage in transactions with Iran.",
        domain="sanctions", jurisdiction="us", document_type="other",
        similarity_score=0.8, rerank_score=0.78,
    )
    fta_rule = RetrievedRule(
        rule_id="RCEP-1", rulebook="RCEP", reference="Article 3",
        title="RCEP origin", excerpt="Goods qualify if wholly obtained.",
        domain="fta", jurisdiction="rcep", document_type="other",
        similarity_score=0.7, rerank_score=0.7,
    )

    result = await generator.generate(
        query="What are OFAC requirements for trading with UAE counterparties?",
        retrieved_rules=[icc_rule, sanctions_rule, fta_rule, sanctions_rule, sanctions_rule, sanctions_rule],
        classifier_output=ClassifierOutput(domain="sanctions", jurisdiction="global", document_type="other", complexity="simple"),
    )

    assert result["answer"]
    # base 600 + 5+ rules (+200) + sanctions (+300) + 3 domains (+300) = 1400
    assert client.max_tokens == 1400


def test_static_followups_default_to_one_for_simple_queries():
    # `suggested_followups` is now async + LLM-backed (3 contextual followups).
    # Length-based behavior moved to `_static_followups` (the offline fallback).
    followups = AnswerGenerator._static_followups(
        "How does UCP600 handle insurance documents?",
        ClassifierOutput(domain="icc", jurisdiction="global", document_type="other", complexity="simple"),
    )

    assert len(followups) == 1


def test_static_followups_expand_for_fta_queries():
    followups = AnswerGenerator._static_followups(
        "Does my garment qualify for RCEP preferential tariff from Bangladesh?",
        ClassifierOutput(domain="fta", jurisdiction="rcep", document_type="other", complexity="simple"),
    )

    assert len(followups) == 2
