from __future__ import annotations

import pytest

from app.services.rag.classifier import QueryClassifier
from app.services.rag.models import ClassifierOutput, RetrievedRule
from app.services.rag.pipeline import RAGPipeline


@pytest.mark.asyncio
async def test_classifier_out_of_scope_heuristic():
    classifier = QueryClassifier(anthropic_client=None)
    # Note: a query like "How do I trade Bitcoin?" is intentionally kept
    # in-scope because "trade" overlaps with trade-finance context. We use
    # a query with no trade-context overlap so the heuristic flags it.
    result = await classifier.classify("What's the best recipe for chocolate cake?")
    assert result.in_scope is False
    assert result.domain == "other"


@pytest.mark.asyncio
async def test_classifier_marks_general_tax_filing_out_of_scope():
    classifier = QueryClassifier(anthropic_client=None)
    result = await classifier.classify("How do I file my taxes?")
    assert result.in_scope is False


class _OutOfScopeAnthropicClassifier:
    async def classify(self, query: str, system_prompt: str, max_tokens: int = 256, temperature: float = 0.0):
        return (
            '{"domain":"other","jurisdiction":"global","document_type":"other","commodity":null,'
            '"complexity":"simple","in_scope":false,"reason":"generic"}'
        )


@pytest.mark.asyncio
async def test_classifier_overrides_llm_out_of_scope_for_trade_followup_question():
    classifier = QueryClassifier(anthropic_client=_OutOfScopeAnthropicClassifier())
    result = await classifier.classify("Which country pair and HS classification are you testing under this FTA?")
    assert result.in_scope is True
    assert result.domain in {"fta", "customs"}


class _FakeClassifier:
    async def classify(self, query: str) -> ClassifierOutput:
        return ClassifierOutput(
            domain="icc",
            jurisdiction="global",
            document_type="lc",
            complexity="simple",
            in_scope=True,
        )


class _FakeRetriever:
    async def retrieve(self, session, query, classification, top_k=5):
        return []


class _FakeGenerator:
    async def generate(self, query, retrieved_rules, classifier_output, user_tier="anonymous", routing_tier="sonnet"):
        return {"answer": "fallback", "model_used": "fallback", "partial_coverage": False}

    async def suggested_followups(self, query: str, answer: str, classifier: ClassifierOutput, partial_coverage: bool = False):
        return ["f1", "f2", "f3"]

    @staticmethod
    def _static_followups(query: str, classifier: ClassifierOutput, partial_coverage: bool = False):
        return ["f1", "f2", "f3"]


@pytest.mark.asyncio
async def test_pipeline_no_rules_graceful_empty_result():
    pipeline = RAGPipeline(
        classifier=_FakeClassifier(),
        retriever=_FakeRetriever(),
        generator=_FakeGenerator(),
    )
    result = await pipeline.process_query(
        query="What does UCP600 say about transport documents?",
        session=None,
        language="en",
    )
    # No-rules path now sends to LLM with empty context. With our fake
    # generator returning model_used="fallback", we verify the flow stays
    # graceful (low confidence, empty citations, empty retrieved IDs).
    assert result.citations == []
    assert result.confidence_band == "low"
    assert result.retrieved_rule_ids == []
    assert result.model_used == "fallback"


@pytest.mark.asyncio
async def test_pipeline_lc_compliance_query_stays_product_neutral():
    pipeline = RAGPipeline(
        classifier=_FakeClassifier(),
        retriever=_FakeRetriever(),
        generator=_FakeGenerator(),
    )
    result = await pipeline.process_query(
        query="Is this LC compliant?",
        session=None,
        language="en",
    )
    assert "can't validate actual documents" in result.answer
    assert "document-review workflow" in result.answer
    assert result.show_trdr_cta is False
    assert result.retrieved_rule_ids == []


@pytest.mark.asyncio
async def test_pipeline_discrepancy_query_does_not_show_brand_cta():
    pipeline = RAGPipeline(
        classifier=_FakeClassifier(),
        retriever=_FakeRetriever(),
        generator=_FakeGenerator(),
    )
    result = await pipeline.process_query(
        query="How does UCP600 handle discrepancies?",
        session=None,
        language="en",
    )
    assert result.show_trdr_cta is False


class _PartialCoverageRetriever:
    async def retrieve(self, session, query, classification, top_k=5):
        return [
            RetrievedRule(
                rule_id="UCP600-28",
                rulebook="UCP600",
                reference="Article 28",
                title="Insurance Document and Coverage",
                excerpt="Insurance documents must be issued and signed by an insurance company or authorized agent.",
                domain="icc",
                jurisdiction="global",
                document_type="other",
                similarity_score=0.84,
                rerank_score=0.82,
            )
        ]


class _PartialCoverageGenerator:
    async def generate(self, query, retrieved_rules, classifier_output, user_tier="anonymous", routing_tier="sonnet"):
        return {
            "answer": "Based on the retrieved rules, I can only confirm part of the document set.\n\n- Insurance document: [UCP600 Article 28] Insurance documents must be issued and signed by an insurance company or authorized agent.",
            "model_used": "grounded_fallback",
            "partial_coverage": True,
        }

    async def suggested_followups(self, query: str, answer: str, classifier: ClassifierOutput, partial_coverage: bool = False):
        return ["f1", "f2", "f3"]

    @staticmethod
    def _static_followups(query: str, classifier: ClassifierOutput, partial_coverage: bool = False):
        return ["f1", "f2", "f3"]


@pytest.mark.asyncio
async def test_pipeline_document_set_query_downgrades_partial_coverage_to_low():
    pipeline = RAGPipeline(
        classifier=_FakeClassifier(),
        retriever=_PartialCoverageRetriever(),
        generator=_PartialCoverageGenerator(),
    )
    result = await pipeline.process_query(
        query="What documents are required for a CIF shipment under UCP600?",
        session=None,
        language="en",
    )
    assert result.confidence_band == "low"
    assert result.citations
    assert result.suggested_followups == ["f1", "f2", "f3"]
