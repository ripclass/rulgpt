"""End-to-end RAG orchestration pipeline for RuleGPT."""

from __future__ import annotations

import re
import time
from typing import Any, Dict, List, Literal

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

# ---------------------------------------------------------------------------
# Smart routing — deterministic complexity classifier (no LLM call)
# ---------------------------------------------------------------------------

RoutingTier = Literal["template", "haiku", "sonnet", "opus", "fallback", "grounded"]

_DIRECT_LOOKUP_RE = re.compile(
    r"(?:what\s+(?:does|is)|explain|show\s+me)\s+"
    r"(?:ucp\s*600|isbp\s*745|isp\s*98|urdg\s*758|urc\s*522|urr\s*725|eucp|incoterms)"
    r"\s+(?:article|paragraph|para|section)\s+\w+",
    re.IGNORECASE,
)

_FRAUD_TBML_MARKERS = (
    "tbml",
    "money laundering",
    "over invoicing",
    "under invoicing",
    "shell company",
    "beneficial owner",
    "trade based money",
    "pricing pattern",
    "market rate",
)

_TIER_ORDER: list[str] = ["template", "haiku", "sonnet", "opus"]


def _upgrade_tier(tier: str) -> str:
    idx = _TIER_ORDER.index(tier) if tier in _TIER_ORDER else 2
    return _TIER_ORDER[min(idx + 1, len(_TIER_ORDER) - 1)]


def _pre_generation_confidence(rules: List[RetrievedRule]) -> str:
    """Estimate confidence from retrieval scores only (before citations exist)."""
    if not rules:
        return "low"
    best = max(rule.rerank_score for rule in rules)
    top3 = rules[: min(3, len(rules))]
    avg = sum(rule.rerank_score for rule in top3) / len(top3)
    if best >= 0.8 and avg >= 0.6:
        return "high"
    if best >= 0.5 and avg >= 0.4:
        return "medium"
    return "low"


def _classify_complexity(
    query: str,
    intent: ClassifierOutput,
    retrieved_rules: List[RetrievedRule],
    confidence_band: str,
) -> RoutingTier:
    """Select the cheapest model tier capable of answering the query."""
    if not retrieved_rules:
        return "fallback"

    lowered = query.lower()
    rule_count = len(retrieved_rules)

    # Gate 1: Opus — fraud/TBML requires BOTH keyword match AND complex/interpretation
    has_fraud_signal = any(marker in lowered for marker in _FRAUD_TBML_MARKERS)
    is_complex_enough = intent.complexity in ("complex", "interpretation")
    if has_fraud_signal and is_complex_enough:
        return "opus"
    # Sanctions domain alone does NOT trigger opus — only fraud/TBML keywords do

    # Gate 2: Template — direct article lookup with single high-confidence rule
    if (
        _DIRECT_LOOKUP_RE.search(query)
        and rule_count == 1
        and confidence_band == "high"
    ):
        return "template"

    # Gate 3: Rule count + confidence matrix
    if rule_count == 1:
        tier: str = "template" if confidence_band == "high" else "haiku"
    elif rule_count <= 4:
        tier = "haiku"
    else:
        tier = "sonnet"

    # Gate 4: Domain/jurisdiction diversity upgrades
    unique_domains = {rule.domain for rule in retrieved_rules if rule.domain and rule.domain != "other"}
    unique_jurisdictions = {rule.jurisdiction for rule in retrieved_rules if rule.jurisdiction and rule.jurisdiction != "global"}
    if len(unique_domains) >= 2:
        tier = _upgrade_tier(tier)
    if len(unique_jurisdictions) >= 2:
        tier = _upgrade_tier(tier)

    # Gate 5: Low confidence upgrade
    if confidence_band == "low":
        tier = _upgrade_tier(tier)

    return tier  # type: ignore[return-value]
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

        # Stage 2.5: smart routing
        from app.config import settings as _settings
        if _settings.RULEGPT_ENABLE_SMART_ROUTING and retrieved_rules:
            pre_confidence = _pre_generation_confidence(retrieved_rules)
            routing_tier = _classify_complexity(query, classifier_output, retrieved_rules, pre_confidence)
        else:
            routing_tier = "sonnet"

        # Stage 3: generation
        start = time.perf_counter()
        if retrieved_rules:
            try:
                generation = await self.generator.generate(
                    query=query,
                    retrieved_rules=retrieved_rules,
                    classifier_output=classifier_output,
                    user_tier="anonymous",
                    routing_tier=routing_tier,
                )
            except TypeError:
                generation = await self.generator.generate(
                    query=query,
                    retrieved_rules=retrieved_rules,
                    classifier_output=classifier_output,
                    user_tier="anonymous",
                )
            answer = str(generation.get("answer", "")).strip() or NO_RULE_MESSAGE
            model_used = str(generation.get("model_used", "fallback"))
            partial_coverage = bool(generation.get("partial_coverage"))
            routing_tier = str(generation.get("routing_tier", routing_tier))
        else:
            answer = NO_RULE_MESSAGE
            model_used = "fallback"
            partial_coverage = True
            routing_tier = "fallback"
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
        try:
            suggested_followups = self.generator.suggested_followups(
                query,
                classifier_output,
                partial_coverage=partial_coverage,
            )
        except TypeError:
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
            routing_tier=routing_tier,
        )


async def process_query(query: str, session: Any, language: str = "en") -> QueryResult:
    """Stable backend-facing entrypoint."""
    pipeline = RAGPipeline()
    return await pipeline.process_query(query=query, session=session, language=language)
