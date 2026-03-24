from __future__ import annotations

import pytest

from app.services.rag.classifier import QueryClassifier
from app.services.rag.models import ClassifierOutput
from app.services.rag.pipeline import RAGPipeline


@pytest.mark.asyncio
async def test_classifier_out_of_scope_heuristic():
    classifier = QueryClassifier(anthropic_client=None)
    result = await classifier.classify("What is Bitcoin and how do I trade it?")
    assert result.in_scope is False
    assert result.domain == "other"


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
    async def generate(self, query, retrieved_rules, classifier_output, user_tier="anonymous"):
        return {"answer": "fallback", "model_used": "fallback"}

    @staticmethod
    def suggested_followups(query: str, classifier: ClassifierOutput):
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
    assert "I don't have a specific rule covering that" in result.answer
    assert result.citations == []
    assert result.confidence_band == "low"
    assert result.retrieved_rule_ids == []

