"""RulHub-native retriever. Fail-closed: no local corpus, no filesystem fallback."""
from __future__ import annotations

import asyncio
import logging
import math
import re
import time
from typing import List, Sequence

import httpx

from app.config import get_settings
from app.services.integrations.rulhub_client import (RulHubClient, RulHubClientError,
    get_rulhub_client, normalize_rule)
from app.services.rag.anchors import ANCHOR_RULES, ANCHOR_TRIGGERS
from app.services.rag.models import ClassifierOutput, RetrievedRule

logger = logging.getLogger(__name__)


class RetrievalUnavailableError(Exception):
    """RulHub unreachable — pipeline must fail closed, never answer from memory."""


_STOPWORDS = {"the","a","an","is","are","was","be","of","to","in","on","for","and","or",
              "can","do","does","what","when","under","my","our","with","by","it","that",
              "if","how","why","who","which","this","these","those","there","from","at",
              "as","its","his","her","their","will","would","should","could","has","have",
              "had","not","no","yes","any","all","some","also","still","then","than","but"}
_EXPANSIONS = {"lc": "letter of credit", "bl": "bill of lading", "mt700": "documentary credit issuance",
               "coo": "certificate of origin", "dc": "documentary credit"}
_SOURCE_PATTERN = re.compile(r"\b(ucp\s*600|isbp\s*821|urdg\s*758|isp\s*98|urc\s*522|eucp)\b", re.I)
_DOMAIN_FILTERS = {"icc": {"domain": "icc_core"}, "sanctions": {"domain": "sanctions"},
                   "fta": {"domain": "fta"}, "customs": {"domain": "customs"},
                   "bank_specific": {"sub_domain": "trade_finance"}}

# RulHub's /v1/rules/search is PostgreSQL full-text search that ANDs every
# token (verified live 2026-07-06: a full natural-language question matched 0
# rows; "transhipment credit" matched 11; "transhipment" matched 59). The
# bridge from NL questions to keyword search is therefore a RELAXATION
# LADDER: rank the query's tokens by domain signal, then search with the top
# 3, top 2, and finally the single strongest term until enough rows come
# back. Tokens in this lexicon outrank everything else in the query.
_DOMAIN_TERMS = {
    "transhipment", "transshipment", "shipment", "shipments", "presentation",
    "discrepancy", "discrepancies", "document", "documents", "documentary",
    "invoice", "invoices", "insurance", "bill", "lading", "credit", "credits",
    "guarantee", "guarantees", "demand", "expiry", "tolerance", "origin",
    "tariff", "customs", "sanction", "sanctions", "embargo", "beneficiary",
    "applicant", "confirmation", "negotiation", "waiver", "amendment",
    "incoterms", "cif", "fob", "cfr", "fca", "exw", "ucp", "isbp", "urdg",
    "isp98", "urc", "eucp", "partial", "transferable", "standby", "ofac",
    "rcep", "cptpp", "usmca", "certificate", "packing", "weight", "charter",
    "deferred", "acceptance", "honour", "honor", "reimbursement", "nomination",
    "complying", "examination", "article", "paragraph", "field", "clause",
    "draft", "drafts", "goods", "freight", "port", "loading", "discharge",
    "inspection", "cumulation", "preferential", "tbml", "aml",
}


def _content_tokens(query: str) -> list[str]:
    """Expanded, stopword-free tokens in query order (deduped)."""
    tokens = re.findall(r"[a-z0-9]+", query.lower())
    out: list[str] = []
    for tok in tokens:
        expanded = _EXPANSIONS.get(tok, tok)
        for part in expanded.split():
            if part in _STOPWORDS or len(part) < 2 or part in out:
                continue
            out.append(part)
    return out


def _ranked_terms(content: list[str]) -> list[str]:
    """Domain-lexicon terms first (query order), then 3-4 digit publication
    numbers (600/758/821…), then remaining tokens longest-first."""
    domain = [t for t in content if t in _DOMAIN_TERMS]
    numbers = [t for t in content if t.isdigit() and 3 <= len(t) <= 4 and t not in domain]
    rest = sorted((t for t in content if t not in domain and t not in numbers),
                  key=len, reverse=True)
    return domain + numbers + rest


def derive_search_queries(query: str, classification: ClassifierOutput) -> list[str]:
    """Keyword-relaxation ladder for RulHub's AND-token full-text search.

    Most specific first so the retrieve loop can stop early: the full
    content-token set (only when short enough to plausibly AND-match),
    top-3 ranked terms, a source-anchored variant, top-2, then the single
    strongest term. Never returns an empty list.
    """
    content = _content_tokens(query)
    ranked = _ranked_terms(content)
    out: list[str] = []

    def _push(candidate: str) -> None:
        candidate = candidate.strip()[:500]
        if candidate and candidate not in out:
            out.append(candidate)

    if 2 <= len(content) <= 4:
        _push(" ".join(content))
    if len(ranked) >= 3:
        _push(" ".join(ranked[:3]))
    m = _SOURCE_PATTERN.search(query)
    if m:
        source_tokens = _content_tokens(m.group(0))
        extra = [t for t in ranked if t not in source_tokens][:2]
        _push(" ".join(source_tokens + extra))
    if len(ranked) >= 2:
        _push(" ".join(ranked[:2]))
    if ranked:
        _push(ranked[0])
    if not out:
        _push(query)
    return out[:5]


def _tokenize(value: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", value.lower()) if len(t) > 2}


def _lexical_overlap(query: str, candidate: str) -> float:
    q_tokens = _tokenize(query)
    c_tokens = _tokenize(candidate)
    if not q_tokens or not c_tokens:
        return 0.0
    return len(q_tokens & c_tokens) / max(1, len(q_tokens))


def _cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


class _TTLCache:
    def __init__(self, max_size: int = 256, ttl: float = 1800.0):
        self.max_size, self.ttl, self._d = max_size, ttl, {}
    def get(self, key):
        hit = self._d.get(key)
        if not hit: return None
        exp, val = hit
        if time.monotonic() > exp:
            self._d.pop(key, None); return None
        return val
    def set(self, key, val):
        if len(self._d) >= self.max_size:
            self._d.pop(next(iter(self._d)), None)
        self._d[key] = (time.monotonic() + self.ttl, val)


class RulHubRetriever:
    def __init__(self, rulhub_client: RulHubClient | None = None, openai_client=None):
        settings = get_settings()
        self.client = rulhub_client or get_rulhub_client()
        self.openai_client = openai_client
        self._cache = _TTLCache(ttl=float(settings.RULGPT_RETRIEVAL_CACHE_TTL))

    async def retrieve(self, session, query: str, classification: ClassifierOutput,
                       top_k: int = 5) -> List[RetrievedRule]:
        top_k = max(3, min(top_k, 8))
        key = self._cache_key(query, classification, top_k)
        cached = self._cache.get(key)
        if cached is not None:
            return list(cached)
        rows, errors, attempts = {}, [], 0
        filters = dict(_DOMAIN_FILTERS.get(classification.domain, {}))
        if classification.jurisdiction and classification.jurisdiction != "global":
            filters["jurisdiction"] = classification.jurisdiction
        for i, q in enumerate(derive_search_queries(query, classification)):
            for f in ([filters, {}] if (i == 0 and filters) else [{}]):
                attempts += 1
                try:
                    results = await self.client.search_rules(q, filters=f or None,
                                                             limit=top_k * 2, allow_fallback=False)
                except (RulHubClientError, httpx.HTTPError) as exc:
                    status_code = getattr(exc, "status_code", None)
                    if status_code is not None and 400 <= status_code < 500:
                        # 4xx means the request itself is malformed against the RulHub
                        # contract — a persistent bug, not a transient outage. Flag it
                        # distinctly so it doesn't read as "RulHub is just down" in logs.
                        logger.warning(
                            "RulHub search returned %s for query=%r filters=%r — "
                            "likely a request-contract violation, not an outage",
                            status_code, q, f or None,
                        )
                    errors.append(exc); continue
                for raw in results:
                    rule = normalize_rule(raw)
                    rid = rule.get("rule_id") or rule.get("id")
                    if not rid: continue
                    rank = float(raw.get("rank") or 0.0)
                    if rid not in rows or rank > rows[rid][1]:
                        rows[rid] = (rule, rank)
                if rows and len(rows) >= top_k * 2:
                    break
            if rows and len(rows) >= top_k * 2:
                break
        if not rows and errors and len(errors) == attempts:
            raise RetrievalUnavailableError(str(errors[-1]))
        if not rows:
            return []
        candidates = self._score(query, rows)
        candidates = await self._maybe_embed_rerank(query, candidates)
        selected = sorted(candidates, key=lambda r: r.rerank_score, reverse=True)[: top_k * 2]
        await self._hydrate(selected)
        selected = await self._inject_anchors(query, classification, selected)
        final = sorted(selected, key=lambda r: r.rerank_score, reverse=True)[:top_k]
        self._cache.set(key, list(final))
        return final

    def _cache_key(self, query: str, classification: ClassifierOutput, top_k: int) -> tuple:
        return (
            query.strip().lower(),
            classification.domain,
            classification.jurisdiction,
            classification.document_type,
            top_k,
        )

    def _score(self, query: str, rows: dict) -> List[RetrievedRule]:
        if not rows:
            return []
        max_rank = max((rank for _, rank in rows.values()), default=0.0)
        candidates: List[RetrievedRule] = []
        for rid, (rule, rank) in rows.items():
            similarity = max(0.0, min(1.0, rank / max_rank)) if max_rank else 0.0
            text = str(rule.get("text") or rule.get("description") or "")
            title = str(rule.get("title") or rid)
            article = rule.get("article")
            reference = f"Article {article}" if article else rid
            lexical = _lexical_overlap(query, f"{title} {text[:300]}")
            rerank = (similarity * 0.7) + (lexical * 0.3)
            candidates.append(
                RetrievedRule(
                    rule_id=rid,
                    rulebook=str(rule.get("rulebook") or rule.get("source") or "unknown"),
                    reference=reference,
                    title=title,
                    excerpt=text[:500],
                    domain=str(rule.get("domain") or "other"),
                    jurisdiction=str(rule.get("jurisdiction") or "global"),
                    document_type=str(rule.get("document_type") or "other"),
                    similarity_score=similarity,
                    rerank_score=rerank,
                    metadata={"_source": "rulhub_api", "rank": rank},
                )
            )
        return candidates

    def _get_or_create_openai_client(self):
        """Lazily wire a real OpenAIClient when rerank is enabled and a key is configured.

        Mirrors `RuleRetriever._get_openai_client`. Returns None (graceful skip —
        candidates keep their lexical scores) when no OpenAI/OpenRouter key is
        present. Never raises: a missing key is an expected, common state, not
        a failure worth logging.
        """
        if self.openai_client is not None:
            return self.openai_client
        settings = get_settings()
        if not (settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY):
            return None
        from app.services.integrations.openai_client import OpenAIClient  # type: ignore

        self.openai_client = OpenAIClient()
        return self.openai_client

    async def _maybe_embed_rerank(self, query: str, candidates: List[RetrievedRule]) -> List[RetrievedRule]:
        settings = get_settings()
        if not settings.RULGPT_RERANK_EMBEDDINGS or not candidates:
            return candidates
        client = self._get_or_create_openai_client()
        if client is None:
            return candidates
        try:
            texts = [query] + [f"{c.title} {c.excerpt[:300]}" for c in candidates]
            vectors = await client.embed_texts(texts)
            query_vec = vectors[0]
            for candidate, vector in zip(candidates, vectors[1:]):
                similarity = _cosine_similarity(query_vec, vector)
                lexical = _lexical_overlap(query, f"{candidate.title} {candidate.excerpt[:300]}")
                candidate.similarity_score = similarity
                candidate.rerank_score = (similarity * 0.7) + (lexical * 0.3)
        except Exception:
            logger.warning("RulHub embed-rerank failed; keeping lexical scores", exc_info=True)
        return candidates

    async def _hydrate(self, selected: List[RetrievedRule]) -> None:
        if not selected:
            return

        async def _fetch(rule: RetrievedRule):
            try:
                return await self.client.get_rule(rule.rule_id, allow_fallback=False)
            except Exception:
                return None

        details = await asyncio.gather(*(_fetch(rule) for rule in selected), return_exceptions=True)
        for rule, detail in zip(selected, details):
            if isinstance(detail, BaseException) or not detail:
                continue
            text = str(detail.get("text") or detail.get("description") or "")
            if text:
                rule.excerpt = text[:1200]
            rule.metadata["raw_detail"] = detail

    async def _inject_anchors(self, query: str, classification: ClassifierOutput,
                              selected: List[RetrievedRule]) -> List[RetrievedRule]:
        if classification.domain != "icc":
            return selected
        query_lower = query.lower()
        triggered_ids = {
            rid for rid, triggers in ANCHOR_TRIGGERS.items()
            if any(trigger in query_lower for trigger in triggers)
        }
        if not triggered_ids:
            return selected
        anchor_ids = set(ANCHOR_RULES.get("icc", []))
        present_ids = {rule.rule_id for rule in selected}
        missing_ids = [rid for rid in (triggered_ids & anchor_ids) if rid not in present_ids]
        if not missing_ids:
            return selected
        try:
            rows = await self.client.lookup_rules(source="ucp600", per_page=50, allow_fallback=True)
        except Exception:
            return selected

        floor = (min((rule.rerank_score for rule in selected), default=0.5) - 0.01) if selected else 0.49
        floor = max(0.0, floor)
        by_id: dict[str, dict] = {}
        for raw in rows:
            normalized = normalize_rule(raw)
            rid = normalized.get("rule_id")
            if rid:
                by_id[rid] = normalized

        for rid in missing_ids:
            rule = by_id.get(rid)
            if not rule:
                continue
            text = str(rule.get("text") or rule.get("description") or "")
            if not text.strip():
                continue
            article = rule.get("article")
            selected.append(
                RetrievedRule(
                    rule_id=rid,
                    rulebook=str(rule.get("rulebook") or rule.get("source") or "UCP600"),
                    reference=f"Article {article}" if article else rid,
                    title=str(rule.get("title") or ""),
                    excerpt=text[:500],
                    domain=str(rule.get("domain") or "icc"),
                    jurisdiction=str(rule.get("jurisdiction") or "global"),
                    document_type=str(rule.get("document_type") or "other"),
                    similarity_score=floor,
                    rerank_score=floor,
                    metadata={"_anchor": True},
                )
            )
        return selected


_DEFAULT_RETRIEVER: RulHubRetriever | None = None


def get_rulhub_retriever() -> RulHubRetriever:
    """Process-wide singleton, mirroring `get_rulhub_client()`.

    `RAGPipeline` is constructed fresh per query (see `pipeline.process_query`), so
    a bare `RulHubRetriever()` built in `__init__` would give every request its own
    empty `_TTLCache` — the cache would never actually hit. Routing default
    construction through this singleton makes the 30-minute cache real across
    requests within a single backend process.
    """
    global _DEFAULT_RETRIEVER
    if _DEFAULT_RETRIEVER is None:
        _DEFAULT_RETRIEVER = RulHubRetriever()
    return _DEFAULT_RETRIEVER
