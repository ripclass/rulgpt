"""End-to-end RAG orchestration pipeline for RuleGPT."""

from __future__ import annotations

import hashlib
import logging
import re
import time
from typing import Any, Dict, List, Literal

from .citations import build_citations, validate_citations
from .classifier import QueryClassifier
from .generator import AnswerGenerator, DISCLAIMER_TEXT
from .models import ClassifierOutput, QueryResult, RetrievedRule
from .query_intent import has_partial_coverage_language, requires_document_breadth
from .retriever import RuleRetriever
from .rulhub_retriever import RetrievalUnavailableError, get_rulhub_retriever


OUT_OF_SCOPE_MESSAGE = "I specialize in trade finance compliance rules. That question sits outside this product's scope."

NO_RULE_MESSAGE = (
    "I don't have a specific rule covering that. Here's what related rules say: "
    "no closely matching rule was found in the current ruleset."
)

RETRIEVAL_UNAVAILABLE_MESSAGE = (
    "Rule retrieval is temporarily unavailable. Your question was not counted against "
    "your quota — please try again in a few minutes."
)

# --- Cross-language retrieval ------------------------------------------------
# RulHub search is English full-text (derive_search_queries tokenizes on
# [a-z0-9]+). A non-English query — Turkish, Chinese, Spanish, ... — matches
# ~nothing, so the pipeline fails closed even though the corpus HAS the rule
# (verified 2026-07-08: identical questions pass in English, fail in-language;
# Turkish 0/10, Chinese 0/5 cited). We normalize the query to English keywords
# FOR RETRIEVAL ONLY — the original query still drives generation, so the answer
# stays in the user's language (system prompt: "Respond in their language").
# "a"/"an" deliberately excluded — they're common Romance-language words
# (Spanish/French/Portuguese "a") and would false-positive non-English queries.
_ENGLISH_MARKERS = frozenset({
    "the", "is", "are", "of", "for", "and", "what", "how", "does", "do", "can",
    "could", "under", "with", "if", "this", "that", "not", "which", "must",
    "should", "would", "will", "when", "where", "who", "you", "we", "from",
    "about", "whether", "there", "these", "those", "into",
})


def _looks_english(query: str) -> bool:
    """Cheap heuristic: no non-ASCII letters AND at least one English function
    word. Biased toward translating when unsure — a false 'non-English' only
    costs one cheap keyword-normalization call, while a false 'English' silently
    breaks retrieval."""
    if any(ord(c) > 127 and c.isalpha() for c in query):
        return False
    words = re.findall(r"[a-z']+", query.lower())
    return any(w in _ENGLISH_MARKERS for w in words)

# ---------------------------------------------------------------------------
# Smart routing — deterministic complexity classifier (no LLM call)
# ---------------------------------------------------------------------------

RoutingTier = Literal["template", "haiku", "sonnet", "opus", "fallback", "grounded"]

_DIRECT_LOOKUP = re.compile(r"\b(article|paragraph|rule|field)\s+\d+[a-z]?\b", re.IGNORECASE)

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
    complexity: str | None = None,
) -> RoutingTier:
    """Select the generation tier from subscription tier + query signals.

    Tiers map to models in the generator: haiku/sonnet → RULGPT_LLM_MODEL
    (GLM-5.2), opus → RULGPT_OPUS_TIER_MODEL (Opus 4.8).

    GLM-5.2 runs the show. The opus escalation is reserved for sanctions/OFAC
    and TBML/fraud queries only — the ~5% of traffic where a wrong answer is a
    regulatory problem — and applies to EVERY tier, free included (daily quotas
    cap worst-case free spend). Every other query generates on GLM-5.2; the
    haiku/sonnet labels are analytics only and both map to RULGPT_LLM_MODEL.
    Changed 2026-07-07 (Ripon): the old num_rules / num_domains / complexity /
    fail-severity triggers fired on nearly every query (every enterprise query
    hit Opus) and were removed.
    """
    import logging
    _log = logging.getLogger("rulegpt.routing")

    if not retrieved_rules:
        _log.info("[ROUTING] 0 rules → fallback")
        return "fallback"

    from app.config import settings as _settings

    if (
        _settings.RULEGPT_TEMPLATE_ENGINE_ENABLED
        and len(retrieved_rules) == 1
        and _DIRECT_LOOKUP.search(query)
    ):
        _log.info("[ROUTING] direct lookup, 1 rule → template | query=%r", query[:80])
        return "template"

    query_lower = query.lower()
    num_rules = len(retrieved_rules)

    # --- Signals from retrieved rules ---
    # Count SUBJECT domains only. RulHub rows carry catalog buckets in
    # `domain`, and meta buckets (ICC opinions, data-quality rules about a
    # subject) are commentary on the same subject — an LC-discrepancy answer
    # citing icc + opinions + data_quality is one domain, not three.
    _SUBJECT_DOMAINS = {"icc", "fta", "sanctions", "customs", "bank_specific",
                        "tbml", "incoterms"}
    domains = set()
    for rule in retrieved_rules:
        d = (getattr(rule, "domain", "") or "").lower()
        top = d.split(".")[0] if d else ""
        if top.startswith("icc"):
            top = "icc"
        if top in _SUBJECT_DOMAINS:
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

    # --- Opus escalation: SANCTIONS / TBML ONLY (Ripon 2026-07-07) ---
    # GLM-5.2 runs the show; Opus 4.8 is reserved for the ~5% of queries with
    # real regulatory consequence. The old num_rules>=5 / num_domains>=3 /
    # complexity / fail-severity triggers fired on nearly every query (every
    # enterprise query hit Opus) and were removed.
    needs_opus_grade = is_sanctions or involves_sanctioned or is_tbml
    if needs_opus_grade:
        _log.info(
            "[ROUTING] opus escalation | tier=%s sanctions=%s tbml=%s "
            "sanctioned_jurisdiction=%s | query=%r",
            user_tier, is_sanctions, is_tbml, involves_sanctioned, query[:80],
        )
        return "opus"

    # --- Tier labels for analytics only (all map to GLM-5.2) ---
    # Sanctions/TBML already returned "opus" above; the choice below is only
    # between the haiku and sonnet analytics labels, which both generate on
    # RULGPT_LLM_MODEL (GLM-5.2) — no cost or latency difference between them.
    tier = user_tier.strip().lower() if user_tier else "free"

    if tier in ("free", "anonymous"):
        model: RoutingTier = "haiku"
    elif tier == "professional":
        model = "haiku" if (is_definition and is_simple_lookup) else "sonnet"
    elif tier == "enterprise":
        model = "haiku" if (is_definition and is_simple_lookup and not has_fail_severity) else "sonnet"
    else:
        model = "haiku"

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
    # Phrases where the USER is asking US to check/validate their documents.
    # Must NOT trigger when the user is describing what a BANK is doing
    # (e.g., "my bank is checking my documents" ≠ "can you check my documents")
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
        "validate my invoice",
        "check my documents",
        "check my document",
        "check my invoice",
    )

    if any(phrase in lowered for phrase in _DOC_VALIDATION_PHRASES):
        # Don't trigger if the user is talking about a BANK checking documents
        bank_context = any(b in lowered for b in (
            "bank is", "bank has", "bank was", "bank taking",
            "bank checking", "bank reviewed", "bank examining",
            "advising bank", "issuing bank", "nominated bank",
        ))
        return not bank_context

    return False


# Confidence thresholds — calibrated to RulHub's rank-normalized rerank scores.
# rerank = 0.7*rank_norm + 0.3*lexical, and the top candidate is always
# rank-normalized to 1.0, so `best` sits ~0.70-0.82 in practice; the old
# best>=0.8 "high" gate was effectively unreachable (0/12 high in the
# 2026-07-07 live batch, including unambiguous questions). The honest
# discriminator is `average` — a tight cluster of on-topic rules vs one lonely
# hit — plus validated citations. Recalibrated 2026-07-07 (Ripon-approved):
# solid, cited answers read HIGH; genuine gaps (partial-coverage language,
# no/failed citations, lonely weak hits) still read LOW. Trust-calibration
# logic — changes here are Ripon-gated.
_CONF_HIGH_BEST = 0.70
_CONF_HIGH_AVG = 0.45
_CONF_MED_BEST = 0.50
_CONF_MED_AVG = 0.35


def _confidence_from_rules(
    query: str,
    rules: List[RetrievedRule],
    citation_count: int,
    partial_coverage: bool,
    answer: str,
) -> str:
    # Genuine-gap guards stay first: a hedged answer, or one with no validated
    # citation, is LOW regardless of retrieval scores.
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
        if best >= _CONF_HIGH_BEST and average >= _CONF_HIGH_AVG and citation_count >= min(3, unique_references):
            return "high"
        if best >= _CONF_MED_BEST and average >= _CONF_MED_AVG:
            return "medium"
        return "low"
    if best >= _CONF_HIGH_BEST and average >= _CONF_HIGH_AVG and citation_count >= 1:
        return "high"
    if best >= _CONF_MED_BEST and average >= _CONF_MED_AVG:
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
        if retriever is not None:
            self.retriever = retriever
        else:
            from app.config import settings as _settings
            # get_rulhub_retriever() is a process-wide singleton — RAGPipeline is
            # built fresh per query, so a bare RulHubRetriever() here would give
            # every request its own empty TTL cache and the cache would never hit.
            self.retriever = RuleRetriever() if _settings.RETRIEVAL_BACKEND == "local" else get_rulhub_retriever()
        self.generator = generator or AnswerGenerator()

    async def _retrieval_query(self, query: str) -> str:
        """English query text to search RulHub with. Non-English queries are
        normalized to English trade-finance keywords via the cheap classifier
        model; the original query is untouched so generation stays in-language.
        Any failure (no LLM key, error) falls back to the original query — this
        can only improve retrieval, never break it."""
        _log = logging.getLogger("rulegpt.retrieval")
        if _looks_english(query):
            return query
        get_client = getattr(self.generator, "_get_llm_client", None)
        if get_client is None:
            _log.warning("[XLANG] no llm client on generator; using raw query")
            return query
        try:
            client = get_client()
            if not getattr(client, "is_available", False):
                _log.warning("[XLANG] llm client not available; using raw query")
                return query
            from app.config import settings as _s
            res = await client.generate_answer(
                prompt=(
                    "Trade-finance question (may be in any language):\n"
                    f"{query}\n\n"
                    "Rewrite it as a short ENGLISH search query of the key "
                    "trade-finance terms only (rulebook names, article numbers, "
                    "concepts). Output ONLY the keywords, no explanation."
                ),
                system_prompt=(
                    "You normalize trade-finance questions into concise English "
                    "search keywords for a rules database. Output only English keywords."
                ),
                model=_s.RULGPT_CLASSIFIER_LLM_MODEL,
                max_tokens=60,
                temperature=0.0,
            )
            english = (res.text or "").strip()
            # WARNING so it survives prod's log level (INFO is filtered out).
            _log.warning("[XLANG] %r -> %r (model=%s)", query[:60], english[:80], res.model)
            if english:
                return english
        except Exception as exc:
            _log.warning("[XLANG] translation failed (%s: %s); using raw query",
                         type(exc).__name__, str(exc)[:200])
        return query

    async def process_query(self, query: str, session: Any, language: str = "en", user_tier: str = "free") -> QueryResult:
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
                    "Do you want the UCP600/ISBP 821 rules to review before validation?",
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

        # Cross-language: search RulHub in English; the original query still
        # drives generation, so the answer comes back in the user's language.
        search_query = await self._retrieval_query(query)

        # Stage 2: retrieval
        start = time.perf_counter()
        try:
            retrieved_rules = await self.retriever.retrieve(
                session=session,
                query=search_query,
                classification=classifier_output,
                top_k=8 if requires_document_breadth(query) else 5,
            )
        except RetrievalUnavailableError:
            stage_latency["retriever"] = int((time.perf_counter() - start) * 1000)
            latency_ms = int((time.perf_counter() - start_total) * 1000)
            return QueryResult(
                answer=RETRIEVAL_UNAVAILABLE_MESSAGE,
                citations=[],
                confidence_band="low",
                suggested_followups=[],
                show_trdr_cta=False,
                disclaimer=DISCLAIMER_TEXT,
                classifier_output=classifier_output,
                retrieved_rule_ids=[],
                model_used="unavailable",
                classifier_model=classifier_model,
                latency_ms=latency_ms,
                stage_latency_ms=stage_latency,
                routing_tier="unavailable",
                fallback_reasons=["retrieval_unavailable"],
            )
        except Exception:
            retrieved_rules = []
        stage_latency["retriever"] = int((time.perf_counter() - start) * 1000)

        # Stage 2.5: tier-based model routing (after retrieval)
        from app.config import settings as _settings
        if _settings.RULEGPT_ENABLE_SMART_ROUTING and retrieved_rules:
            routing_tier = select_model(
                user_tier, query, retrieved_rules,
                complexity=classifier_output.complexity,
            )
        else:
            routing_tier = "sonnet"

        # Stage 3: generation
        start = time.perf_counter()
        generation: Dict[str, Any] = {}
        if retrieved_rules:
            try:
                generation = await self.generator.generate(
                    query=query,
                    retrieved_rules=retrieved_rules,
                    classifier_output=classifier_output,
                    user_tier=user_tier,
                    routing_tier=routing_tier,
                )
            except TypeError:
                generation = await self.generator.generate(
                    query=query,
                    retrieved_rules=retrieved_rules,
                    classifier_output=classifier_output,
                    user_tier=user_tier,
                )
            answer = str(generation.get("answer", "")).strip() or NO_RULE_MESSAGE
            model_used = str(generation.get("model_used", "fallback"))
            partial_coverage = bool(generation.get("partial_coverage"))
            routing_tier = str(generation.get("routing_tier", routing_tier))
            fallback_reasons = generation.get("fallback_reasons") or []
        else:
            # No rules retrieved — retrieval succeeded but found nothing usable.
            # Fail closed: refuse rather than answer from the model's general
            # knowledge. Never call the LLM here (see CLAUDE.md "Empty result
            # handling") — $0 cost, static message only.
            answer = NO_RULE_MESSAGE
            model_used = "fallback"
            partial_coverage = True
            routing_tier = "fallback"
            fallback_reasons = ["no rules retrieved"]
        stage_latency["generator"] = int((time.perf_counter() - start) * 1000)

        tokens = generation.get("tokens") or (0, 0)
        prompt_toks, completion_toks = tokens if isinstance(tokens, (tuple, list)) and len(tokens) == 2 else (0, 0)
        _cost_log = logging.getLogger("rulegpt.cost")
        _cost_log.info(
            "llm_cost query_hash=%s tier=%s model=%s prompt_toks=%s completion_toks=%s cost_usd=%s",
            hashlib.sha1(query.encode()).hexdigest()[:10],
            routing_tier,
            generation.get("generation_model"),
            prompt_toks,
            completion_toks,
            f"{generation.get('cost_usd') or 0:.6f}",
        )

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
            suggested_followups = await self.generator.suggested_followups(
                query=query,
                answer=answer,
                classifier=classifier_output,
                partial_coverage=partial_coverage,
            )
        except Exception:
            suggested_followups = self.generator._static_followups(query, classifier_output, partial_coverage)
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


    async def process_query_stream(
        self, query: str, session: Any, language: str = "en", user_tier: str = "free"
    ):
        """Streaming variant of process_query. Async-generates event dicts:

            {"type": "delta", "text": str}            # incremental answer tokens
            {"type": "final", "result": QueryResult}  # finalized answer + metadata

        Only the happy-path LLM generation is streamed. Every static/edge case
        (document-validation redirect, out-of-scope, retrieval-unavailable,
        no-rules fallback, and the $0 template tier) is delegated to the proven
        non-streaming process_query and emitted as a single delta — those paths
        are instant, so there is nothing to stream. The gated logic (routing,
        citations, confidence) is REUSED here, never reimplemented, and
        process_query itself is left completely untouched.
        """
        if not query or not query.strip():
            raise ValueError("Query cannot be empty.")
        if len(query) > 500:
            raise ValueError("Query exceeds 500 characters.")

        async def _delegate_once():
            result = await self.process_query(
                query=query, session=session, language=language, user_tier=user_tier
            )
            return result

        # Stage 1: classification (mirror process_query's fallback)
        try:
            classifier_output = await self.classifier.classify(query=query)
            reason = (classifier_output.reason or "").lower()
            classifier_model = "heuristic" if "heuristic" in reason else "claude-haiku-4-5"
        except Exception:
            classifier_output = ClassifierOutput(
                domain="other", jurisdiction="global", document_type="other",
                complexity="simple", in_scope=True, reason="classifier_fallback",
            )
            classifier_model = "heuristic"

        # Static paths (redirect / out-of-scope) → delegate, emit once.
        if _query_needs_lcopilot_redirect(query) or not classifier_output.in_scope:
            result = await _delegate_once()
            yield {"type": "delta", "text": result.answer}
            yield {"type": "final", "result": result}
            return

        # Stage 2: retrieval (search in English; generation stays in-language)
        search_query = await self._retrieval_query(query)
        try:
            retrieved_rules = await self.retriever.retrieve(
                session=session, query=search_query, classification=classifier_output,
                top_k=8 if requires_document_breadth(query) else 5,
            )
        except RetrievalUnavailableError:
            result = await _delegate_once()  # quota-neutral "unavailable" message
            yield {"type": "delta", "text": result.answer}
            yield {"type": "final", "result": result}
            return
        except Exception:
            retrieved_rules = []

        # Stage 2.5: routing
        from app.config import settings as _settings
        if _settings.RULEGPT_ENABLE_SMART_ROUTING and retrieved_rules:
            routing_tier = select_model(
                user_tier, query, retrieved_rules, complexity=classifier_output.complexity,
            )
        else:
            routing_tier = "sonnet"

        # Non-LLM tiers (no rules → fallback, or $0 template) → delegate, emit once.
        if (not retrieved_rules) or routing_tier in ("template", "fallback"):
            result = await _delegate_once()
            yield {"type": "delta", "text": result.answer}
            yield {"type": "final", "result": result}
            return

        # ---- Happy path: stream the generation ----
        start_total = time.perf_counter()
        gen_final: Dict[str, Any] = {}
        try:
            async for kind, payload in self.generator.generate_stream(
                query=query, retrieved_rules=retrieved_rules,
                classifier_output=classifier_output, user_tier=user_tier,
                routing_tier=routing_tier,
            ):
                if kind == "delta":
                    yield {"type": "delta", "text": payload}
                else:
                    gen_final = payload
        except Exception:
            # Never leave the user hanging — fall back to the proven path.
            result = await _delegate_once()
            yield {"type": "delta", "text": result.answer}
            yield {"type": "final", "result": result}
            return

        answer = str(gen_final.get("answer", "")).strip() or NO_RULE_MESSAGE
        model_used = str(gen_final.get("model_used", "fallback"))
        partial_coverage = bool(gen_final.get("partial_coverage"))
        routing_tier = str(gen_final.get("routing_tier", routing_tier))
        fallback_reasons = gen_final.get("fallback_reasons") or []

        tokens = gen_final.get("tokens") or (0, 0)
        prompt_toks, completion_toks = tokens if isinstance(tokens, (tuple, list)) and len(tokens) == 2 else (0, 0)
        logging.getLogger("rulegpt.cost").info(
            "llm_cost query_hash=%s tier=%s model=%s prompt_toks=%s completion_toks=%s cost_usd=%s stream=1",
            hashlib.sha1(query.encode()).hexdigest()[:10], routing_tier,
            gen_final.get("generation_model"), prompt_toks, completion_toks,
            f"{gen_final.get('cost_usd') or 0:.6f}",
        )

        # Stage 4: citations + confidence — REUSE the gated helpers verbatim.
        citations = build_citations(answer=answer, retrieved_rules=retrieved_rules, max_items=8)
        if not validate_citations(citations, retrieved_rules):
            citations = []
        confidence_band = _confidence_from_rules(
            query=query, rules=retrieved_rules, citation_count=len(citations),
            partial_coverage=partial_coverage, answer=answer,
        )
        try:
            suggested_followups = await self.generator.suggested_followups(
                query=query, answer=answer, classifier=classifier_output,
                partial_coverage=partial_coverage,
            )
        except Exception:
            suggested_followups = self.generator._static_followups(query, classifier_output, partial_coverage)
        latency_ms = int((time.perf_counter() - start_total) * 1000)

        result = QueryResult(
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
            stage_latency_ms={},
            routing_tier=routing_tier,
            fallback_reasons=fallback_reasons,
        )
        yield {"type": "final", "result": result}


async def process_query(query: str, session: Any, language: str = "en", user_tier: str = "free") -> QueryResult:
    """Stable backend-facing entrypoint."""
    pipeline = RAGPipeline()
    return await pipeline.process_query(query=query, session=session, language=language, user_tier=user_tier)


def stream_query(query: str, session: Any, language: str = "en", user_tier: str = "free"):
    """Stable backend-facing streaming entrypoint — returns an async generator
    of {"type": "delta"|"final", ...} events. See RAGPipeline.process_query_stream."""
    pipeline = RAGPipeline()
    return pipeline.process_query_stream(query=query, session=session, language=language, user_tier=user_tier)
