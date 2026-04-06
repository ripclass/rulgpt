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


# ---------------------------------------------------------------------------
# Tier-based model routing
# ---------------------------------------------------------------------------

_SANCTIONED_JURISDICTIONS = (
    "iran", "russia", "north korea", "dprk", "syria", "cuba",
    "venezuela", "myanmar", "crimea", "donetsk", "luhansk",
)


def select_model(
    user_tier: str,
    query: str,
    retrieved_rules: List[RetrievedRule],
) -> RoutingTier:
    """Select Claude model based on user subscription tier + query complexity.

    Tiers: free → Haiku only | starter → Haiku/Sonnet | professional →
    Haiku/Sonnet/Opus | expert → Haiku/Sonnet/Opus (lower Opus threshold).

    Before pricing tiers are live, all users default to "professional".
    """
    import logging
    _log = logging.getLogger("rulegpt.routing")

    if not retrieved_rules:
        _log.info("[ROUTING] 0 rules → fallback")
        return "fallback"

    query_lower = query.lower()
    num_rules = len(retrieved_rules)

    # --- Signals from retrieved rules ---
    domains = set()
    for rule in retrieved_rules:
        d = getattr(rule, "domain", "") or ""
        top = d.split(".")[0] if d else ""
        if top and top != "other":
            domains.add(top)
    num_domains = len(domains)

    is_sanctions = any(
        (getattr(r, "domain", "") or "").startswith("sanctions")
        for r in retrieved_rules
    )
    has_fail_severity = any(
        getattr(r, "severity", "") == "fail"
        for r in retrieved_rules
    )
    involves_sanctioned = any(c in query_lower for c in _SANCTIONED_JURISDICTIONS)
    is_tbml = any(
        (getattr(r, "domain", "") or "").startswith("tbml")
        for r in retrieved_rules
    ) or any(kw in query_lower for kw in _FRAUD_TBML_MARKERS)

    # --- Simple-query signals (Haiku candidates) ---
    is_definition = any(
        query_lower.startswith(p)
        for p in ("what is ", "what are ", "define ", "meaning of ", "explain ", "what does ")
    ) and len(query.split()) < 12
    is_simple_lookup = num_rules <= 2 and num_domains <= 1

    # --- Tier-specific routing ---
    tier = user_tier.strip().lower() if user_tier else "professional"

    if tier in ("free", "anonymous"):
        model: RoutingTier = "haiku"

    elif tier == "starter":
        # 40% Haiku / 60% Sonnet
        model = "haiku" if (is_definition and is_simple_lookup) else "sonnet"

    elif tier == "professional":
        # 30% Haiku / 60% Sonnet / 10% Opus
        if is_sanctions or involves_sanctioned or is_tbml:
            model = "opus"
        elif num_domains >= 3:
            model = "opus"
        elif is_definition and is_simple_lookup:
            model = "haiku"
        else:
            model = "sonnet"

    elif tier == "expert":
        # 20% Haiku / 60% Sonnet / 20% Opus
        if is_sanctions or is_tbml:
            model = "opus"
        elif num_domains >= 3 or num_rules >= 5:
            model = "opus"
        elif has_fail_severity and num_rules >= 3:
            model = "opus"
        elif is_definition and is_simple_lookup and not has_fail_severity:
            model = "haiku"
        else:
            model = "sonnet"

    else:
        model = "sonnet"

    _log.info(
        "[ROUTING] tier=%s model=%s | rules=%d domains=%d sanctions=%s tbml=%s "
        "sanctioned_jurisdiction=%s definition=%s simple=%s | query=%r",
        tier, model, num_rules, num_domains, is_sanctions, is_tbml,
        involves_sanctioned, is_definition, is_simple_lookup, query[:80],
    )
    return model
def _query_needs_lcopilot_redirect(query: str) -> bool:
    """Detect queries asking to validate/review actual documents.

    Must be narrow — "Is this compliant with the G7 price cap?" is a sanctions
    question, NOT a document validation request.  Only trigger when the query
    clearly asks to examine a specific LC, invoice, or document set.
    """
    lowered = query.lower()

    # Exact document-validation phrases
    _DOC_VALIDATION_PHRASES = (
        "is this lc compliant",
        "is this l/c compliant",
        "is my lc compliant",
        "are my documents compliant",
        "are these documents compliant",
        "review my lc",
        "validate my lc",
        "check my lc",
        "document validation",
        "validate this document",
        "validate my documents",
        "review my invoice",
        "review my document",
        "review my documents",
        "review invoice wording",
        "check my invoice",
        "check my documents",
        "check my document",
        "validate my invoice",
    )

    return any(phrase in lowered for phrase in _DOC_VALIDATION_PHRASES)


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

        # Document-validation redirect runs BEFORE out-of-scope check —
        # queries like "Is this LC compliant?" are trade-finance questions,
        # just ones that need a product-boundary response, not a flat rejection.
        if _query_needs_lcopilot_redirect(query):
            latency_ms = int((time.perf_counter() - start_total) * 1000)
            return QueryResult(
                answer=(
                    "I can explain the rules that apply to your situation, but I can't validate actual documents or confirm "
                    "compliance from a text description alone. If you share the specific terms or requirements you're working "
                    "with, I can walk you through what the rules say. For full document-level validation, that requires a "
                    "dedicated document-review workflow."
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

        # Stage 2.5: tier-based model routing (after retrieval)
        from app.config import settings as _settings
        if _settings.RULEGPT_ENABLE_SMART_ROUTING and retrieved_rules:
            # Default all users to "professional" tier until pricing tiers go live
            effective_tier = "professional"
            routing_tier = select_model(effective_tier, query, retrieved_rules)
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
            fallback_reasons = generation.get("fallback_reasons") or []
        else:
            answer = NO_RULE_MESSAGE
            model_used = "fallback"
            partial_coverage = True
            routing_tier = "fallback"
            fallback_reasons = ["no rules retrieved"]
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
            fallback_reasons=fallback_reasons,
        )


async def process_query(query: str, session: Any, language: str = "en") -> QueryResult:
    """Stable backend-facing entrypoint."""
    pipeline = RAGPipeline()
    return await pipeline.process_query(query=query, session=session, language=language)
