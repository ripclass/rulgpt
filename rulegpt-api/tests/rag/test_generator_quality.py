from __future__ import annotations

import pytest

from app.services.rag.generator import (
    AnswerGenerator,
    assess_partial_coverage,
    compose_grounded_answer,
    normalize_generated_answer,
)
from app.services.rag.models import ClassifierOutput, RetrievedRule


class _FakeAnthropicClient:
    async def generate_answer(self, prompt: str, system_prompt: str, extended_thinking: bool = False):
        return (
            "## Insurance documents under UCP600\n\n"
            "According to [UCP600 Article 18], insurance cover notes are not accepted.\n\n"
            "**Follow-up questions you might have:**\n"
            "1. Do you want more detail?\n"
            "2. Should I compare this with CIP?\n"
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
async def test_generator_rejects_unknown_article_and_uses_grounded_fallback():
    generator = AnswerGenerator(anthropic_client=_FakeAnthropicClient(), openai_client=object())
    rules = [_insurance_rule()]

    result = await generator.generate(
        query="How does UCP600 handle insurance documents?",
        retrieved_rules=rules,
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global", document_type="other"),
    )

    assert result["model_used"] == "fallback"
    assert "[UCP600 Article 28]" in result["answer"]
    assert "Article 18" not in result["answer"]


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
        "According to [UCP600 Article 28], cover notes are not accepted.\n\n"
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


def test_compose_grounded_answer_surfaces_fta_scope_before_origin_mechanics():
    answer = compose_grounded_answer(
        query="Does my garment qualify for RCEP preferential tariff from Bangladesh?",
        rules=[_rcep_scope_rule(), _rcep_origin_rule()],
        partial_coverage=False,
    )

    assert "answer is no" in answer.lower()
    assert "Bangladesh" in answer
    assert "[RCEP RCEP Agreement, Chapter 3]" in answer
    assert "What the retrieved rules clearly say:" in answer
