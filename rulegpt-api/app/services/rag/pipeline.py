"""End-to-end RAG orchestration pipeline for RuleGPT."""

from __future__ import annotations

import time
from typing import Any, Dict, List

from .citations import build_citations, validate_citations
from .classifier import QueryClassifier
from .generator import AnswerGenerator, DISCLAIMER_TEXT
from .models import ClassifierOutput, QueryResult, RetrievedRule
from .query_intent import has_partial_coverage_language, requires_document_breadth
from .retriever import RuleRetriever


OUT_OF_SCOPE_MESSAGE = "I specialize in trade finance compliance rules. That question sits outside this product's scope."

NO_RULE_MESSAGE = (
    "I don't have a specific rule covering that. Here's what related rules say: "
    "no closely matching rule was found in the current ruleset."
)
def _query_needs_lcopilot_redirect(query: str) -> bool:
    lowered = query.lower()
    return any(
        marker in lowered
        for marker in (
            "is this lc compliant",
            "is this l/c compliant",
            "review my lc",
            "validate my lc",
            "check my lc",
            "document validation",
            "validate this document",
        )
    )


def _confidence_from_rules(
    query: str,
    rules: List[RetrievedRule],
    citation_count: int,
    partial_coverage: bool,
    answer: str,
) -> str:
    if partial_coverage or has_partial_coverage_language(answer):
        return "low"
    if not rules or citation_count == 0:
        return "low"
    best = max(rule.rerank_score for rule in rules)
    average = sum(rule.rerank_score for rule in rules[: min(3, len(rules))]) / min(3, len(rules))
    unique_references = len({rule.reference for rule in rules if rule.reference})
    if requires_document_breadth(query):
        if unique_references < 2:
            return "low"
        if best >= 0.8 and average >= 0.6 and citation_count >= min(3, unique_references):
            return "high"
        if best >= 0.6 and average >= 0.45:
            return "medium"
        return "low"
    if best >= 0.8 and average >= 0.6 and citation_count >= 1:
        return "high"
    if best >= 0.5 and average >= 0.4:
        return "medium"
    return "low"


class RAGPipeline:
    """Coordinator for classify -> retrieve -> generate -> citations."""

    def __init__(
        self,
        classifier: QueryClassifier | None = None,
        retriever: RuleRetriever | None = None,
        generator: AnswerGenerator | None = None,
    ) -> None:
        self.classifier = classifier or QueryClassifier()
        self.retriever = retriever or RuleRetriever()
        self.generator = generator or AnswerGenerator()

    async def process_query(self, query: str, session: Any, language: str = "en") -> QueryResult:
        if not query or not query.strip():
            raise ValueError("Query cannot be empty.")
        if len(query) > 500:
            raise ValueError("Query exceeds 500 characters.")

        stage_latency: Dict[str, int] = {}
        start_total = time.perf_counter()

        # Stage 1: classification
        start = time.perf_counter()
        try:
            classifier_output = await self.classifier.classify(query=query)
            reason = (classifier_output.reason or "").lower()
            classifier_model = "heuristic" if "heuristic" in reason else "claude-haiku-4-5"
        except Exception:
            classifier_output = ClassifierOutput(
                domain="other",
                jurisdiction="global",
                document_type="other",
                complexity="simple",
                in_scope=True,
                reason="classifier_fallback",
            )
            classifier_model = "heuristic"
        stage_latency["classifier"] = int((time.perf_counter() - start) * 1000)

        if not classifier_output.in_scope:
            latency_ms = int((time.perf_counter() - start_total) * 1000)
            return QueryResult(
                answer=OUT_OF_SCOPE_MESSAGE,
                citations=[],
                confidence_band="low",
                suggested_followups=[
                    "Would you like help with ICC, sanctions, FTA, or customs rules instead?",
                    "Do you want guidance on LC compliance topics?",
                    "Should I help with trade documentation requirements?",
                ],
                show_trdr_cta=False,
                disclaimer=DISCLAIMER_TEXT,
                classifier_output=classifier_output,
                retrieved_rule_ids=[],
                model_used="none",
                classifier_model=classifier_model,
                latency_ms=latency_ms,
                stage_latency_ms=stage_latency,
            )

        if _query_needs_lcopilot_redirect(query):
            latency_ms = int((time.perf_counter() - start_total) * 1000)
            return QueryResult(
                answer=(
                    "I explain published trade finance rules here, but I do not validate actual LC documents inside this chat. "
                    "If you need document-level validation, that requires a separate document-review workflow."
                ),
                citations=[],
                confidence_band="low",
                suggested_followups=[
                    "Do you want the UCP600/ISBP745 rules to review before validation?",
                    "Which document type are you checking first (BL, invoice, insurance)?",
                    "Do you want a discrepancy checklist before you review the documents?",
                ],
                show_trdr_cta=False,
                disclaimer=DISCLAIMER_TEXT,
                classifier_output=classifier_output,
                retrieved_rule_ids=[],
                model_used="none",
                classifier_model=classifier_model,
                latency_ms=latency_ms,
                stage_latency_ms=stage_latency,
            )

        # Stage 2: retrieval
        start = time.perf_counter()
        try:
            retrieved_rules = await self.retriever.retrieve(
                session=session,
                query=query,
                classification=classifier_output,
                top_k=8 if requires_document_breadth(query) else 5,
            )
        except Exception:
            retrieved_rules = []
        stage_latency["retriever"] = int((time.perf_counter() - start) * 1000)

        # Stage 3: generation
        start = time.perf_counter()
        if retrieved_rules:
            generation = await self.generator.generate(
                query=query,
                retrieved_rules=retrieved_rules,
                classifier_output=classifier_output,
                user_tier="anonymous",
            )
            answer = str(generation.get("answer", "")).strip() or NO_RULE_MESSAGE
            model_used = str(generation.get("model_used", "fallback"))
            partial_coverage = bool(generation.get("partial_coverage"))
        else:
            answer = NO_RULE_MESSAGE
            model_used = "fallback"
            partial_coverage = True
        stage_latency["generator"] = int((time.perf_counter() - start) * 1000)

        # Stage 4: citations
        start = time.perf_counter()
        citations = build_citations(answer=answer, retrieved_rules=retrieved_rules, max_items=8)
        if not validate_citations(citations, retrieved_rules):
            citations = []
        stage_latency["citations"] = int((time.perf_counter() - start) * 1000)

        confidence_band = _confidence_from_rules(
            query=query,
            rules=retrieved_rules,
            citation_count=len(citations),
            partial_coverage=partial_coverage,
            answer=answer,
        )
        suggested_followups = self.generator.suggested_followups(query, classifier_output)
        latency_ms = int((time.perf_counter() - start_total) * 1000)

        return QueryResult(
            answer=answer,
            citations=citations,
            confidence_band=confidence_band,  # type: ignore[arg-type]
            suggested_followups=suggested_followups[:3],
            show_trdr_cta=False,
            disclaimer=DISCLAIMER_TEXT,
            classifier_output=classifier_output,
            retrieved_rule_ids=[rule.rule_id for rule in retrieved_rules],
            model_used=model_used,
            classifier_model=classifier_model,
            latency_ms=latency_ms,
            stage_latency_ms=stage_latency,
        )


async def process_query(query: str, session: Any, language: str = "en") -> QueryResult:
    """Stable backend-facing entrypoint."""
    pipeline = RAGPipeline()
    return await pipeline.process_query(query=query, session=session, language=language)
