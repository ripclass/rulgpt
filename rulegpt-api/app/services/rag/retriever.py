"""Rule retrieval service (hard filters + semantic + rerank)."""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Mapping, Optional, Sequence

from sqlalchemy import text

from .models import ClassifierOutput, RetrievedRule
from .query_intent import expected_document_families, extract_fta_agreement, requires_document_breadth
from .rule_store import get_rule_details, load_rules_for_retrieval

_COUNTRY_ALIASES: dict[str, tuple[str, ...]] = {
    "bd": ("bangladesh",),
    "in": ("india",),
    "us": ("united states", "usa", "us"),
    "ae": ("uae", "united arab emirates"),
    "uk": ("united kingdom", "uk"),
    "eu": ("european union", "eu"),
    "sg": ("singapore",),
    "cn": ("china",),
    "sa": ("saudi", "saudi arabia"),
    "ir": ("iran",),
}

_BANK_ALIASES: dict[str, tuple[str, ...]] = {
    "hdfc": ("hdfc", "hdfc bank"),
    "hsbc": ("hsbc",),
    "citibank": ("citibank", "citi"),
    "jpmorgan": ("jpmorgan", "jp morgan", "jpm"),
    "icbc": ("icbc",),
}

# Maps classifier domain to SQL LIKE prefix for sub-domain matching.
# e.g. classifier says "icc" → also match "icc.docdex", "icc.opinions", etc.
_DOMAIN_PREFIX_OVERRIDES: dict[str, str] = {
    "bank_specific": "bank.%",  # classifier says bank_specific, rules use bank.hsbc etc.
}

# Internal engine rulebooks that must never appear in user-facing retrieval.
# These are TRDR Hub validation engine internals, not trade finance rules.
_INTERNAL_RULEBOOKS = {
    "data_quality_extraction_confidence_v1",
    "version_governance_core_v1",
    "event_driven_rules_api_v1",
    "clause_graph_core_v1",
    "requirement_graph_core_v1",
    "bank_behavior_confidence_v1",
    "bank_behavior_core_v1",
    "crossdomain_final_tightening_v3",
    "crossdomain_integrated_case_v1",
}

# SQL fragment to exclude internal rulebooks and engine rule_id prefixes.
_INTERNAL_RULEBOOK_EXCLUSION = (
    "AND rulebook NOT IN ("
    + ",".join(f"'{rb}'" for rb in sorted(_INTERNAL_RULEBOOKS))
    + ")"
    " AND rule_id NOT LIKE 'DQ-%'"
    " AND rule_id NOT LIKE 'VG-%'"
    " AND rule_id NOT LIKE 'EVAPI-%'"
    " AND rule_id NOT LIKE 'BBEH-%'"
)


def _domain_prefix(domain: str | None) -> str:
    """Return a SQL LIKE pattern for prefix-matching sub-domains."""
    if domain is None:
        return "WILL_NOT_MATCH"  # NULL domain handled by :domain IS NULL
    override = _DOMAIN_PREFIX_OVERRIDES.get(domain)
    if override:
        return override
    return f"{domain}.%"


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


def _tokenize(value: str) -> List[str]:
    tokens: List[str] = []
    for raw in re.findall(r"[a-zA-Z0-9_]+", value.lower()):
        token = raw
        if token.startswith("discrep"):
            token = "discrep"
        elif token.endswith("ies") and len(token) > 4:
            token = token[:-3] + "y"
        elif token.endswith("s") and len(token) > 4:
            token = token[:-1]
        if len(token) > 2:
            tokens.append(token)
    return tokens


def _lexical_score(query: str, candidate_text: str) -> float:
    q_tokens = set(_tokenize(query))
    c_tokens = set(_tokenize(candidate_text))
    if not q_tokens or not c_tokens:
        return 0.0
    overlap = len(q_tokens.intersection(c_tokens))
    return overlap / max(1, len(q_tokens))


def _candidate_text(rule: Mapping[str, Any]) -> str:
    extra = rule.get("extra")
    bank_name = ""
    if isinstance(extra, Mapping):
        bank_name = str(extra.get("bank_name") or "")
    parts = [
        str(rule.get("rulebook") or rule.get("source") or ""),
        str(rule.get("reference") or rule.get("article") or ""),
        str(rule.get("title") or ""),
        str(rule.get("text") or rule.get("description") or ""),
        " ".join(str(tag) for tag in rule.get("tags", []) if isinstance(tag, str)),
        bank_name,
        str(rule.get("jurisdiction") or ""),
    ]
    return " ".join(part for part in parts if part).strip()


def _rule_family_from_text(value: str) -> str:
    lowered = value.lower()
    if "insurance" in lowered or "policy" in lowered:
        return "insurance"
    if "invoice" in lowered:
        return "invoice"
    if "bill of lading" in lowered or "transport document" in lowered or "b/l" in lowered:
        return "transport"
    if "discrep" in lowered:
        return "discrepancy"
    return "general"


def _extract_query_countries(query: str) -> set[str]:
    lowered = query.lower()
    codes: set[str] = set()
    for code, aliases in _COUNTRY_ALIASES.items():
        if any(_contains_alias(lowered, alias) for alias in aliases):
            codes.add(code)
    return codes


def _extract_specific_bank(query: str) -> str | None:
    lowered = query.lower()
    for bank_key, aliases in _BANK_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return bank_key
    return None


def _contains_alias(text: str, alias: str) -> bool:
    if not alias:
        return False
    if len(alias) <= 2:
        return re.search(rf"\b{re.escape(alias)}\b", text) is not None
    return alias in text


def _rule_mentions_bank(rule: Mapping[str, Any], bank_key: str) -> bool:
    haystack = _candidate_text(rule).lower()
    aliases = _BANK_ALIASES.get(bank_key, ())
    return any(alias in haystack for alias in aliases)


def _rule_matches_countries(rule: Mapping[str, Any], countries: set[str]) -> bool:
    if not countries:
        return True
    jurisdiction = str(rule.get("jurisdiction") or "").lower().strip()
    if jurisdiction in {"", "global", "regional"}:
        return True
    if jurisdiction in countries:
        return True
    haystack = _candidate_text(rule).lower()
    for code in countries:
        aliases = _COUNTRY_ALIASES.get(code, ())
        if any(_contains_alias(haystack, alias) for alias in aliases):
            return True
    return False


def _is_license_intent(query: str) -> bool:
    lowered = query.lower()
    return "export license" in lowered or "import license" in lowered


def _fallback_score(
    query: str,
    rule: Mapping[str, Any],
    required_bank: str | None = None,
    countries: set[str] | None = None,
    document_breadth: bool = False,
) -> float:
    combined = _candidate_text(rule)
    lowered_query = query.lower()
    title = str(rule.get("title") or "")
    reference = str(rule.get("reference") or rule.get("article") or "")
    rulebook = str(rule.get("rulebook") or rule.get("source") or "")
    text_value = str(rule.get("text") or rule.get("description") or "")
    tags = " ".join(str(tag) for tag in rule.get("tags", []) if isinstance(tag, str))
    score = (_lexical_score(query, combined) * 0.45) + (_lexical_score(query, title) * 0.25)
    score += _lexical_score(query, text_value) * 0.2
    score += _lexical_score(query, f"{reference} {tags}") * 0.1
    if rulebook and rulebook.lower() in query.lower():
        score += 0.15
    if extract_fta_agreement(query):
        if any(token in combined.lower() for token in ("membership", "scope", "origin", "tariff reduction", "certificate of origin")):
            score += 0.08
    if "preferential tariff" in lowered_query and any(token in combined.lower() for token in ("tariff", "origin", "membership", "scope")):
        score += 0.07
    if _is_license_intent(query):
        lowered = combined.lower()
        license_markers = ("license", "licensing", "dual-use", "export control", "ear", "itar", "bis", "bafa")
        if not any(marker in lowered for marker in license_markers):
            return 0.0
        if any(marker in lowered for marker in (" swift", "letter of credit", "lc requirement")):
            return 0.0
        if str(rule.get("domain") or "").lower() == "bank_specific":
            return 0.0
    if required_bank:
        if not _rule_mentions_bank(rule, required_bank):
            return 0.0
        score += 0.12
    if countries:
        if not _rule_matches_countries(rule, countries):
            return 0.0
        jurisdiction = str(rule.get("jurisdiction") or "").lower().strip()
        if jurisdiction in countries:
            score += 0.08
        elif jurisdiction in {"global", "regional"}:
            score *= 0.9
    if document_breadth:
        family = _rule_family_from_text(combined)
        if family in expected_document_families(query):
            score += 0.12
    return min(score, 1.0)


class RuleRetriever:
    """Retrieve candidate rules from pgvector and rerank by lexical relevance."""

    def __init__(self, openai_client: Optional[Any] = None, rulhub_client: Optional[Any] = None) -> None:
        self.openai_client = openai_client
        self.rulhub_client = rulhub_client

    async def _get_openai_client(self) -> Any:
        if self.openai_client is not None:
            return self.openai_client
        from app.services.integrations.openai_client import OpenAIClient  # type: ignore

        self.openai_client = OpenAIClient()
        return self.openai_client

    async def _get_rulhub_client(self) -> Optional[Any]:
        if self.rulhub_client is not None:
            return self.rulhub_client
        try:
            from app.services.integrations.rulhub_client import RulHubClient  # type: ignore

            self.rulhub_client = RulHubClient()
            return self.rulhub_client
        except Exception:
            return None

    async def _embed_query(self, query: str) -> List[float]:
        client = await self._get_openai_client()
        if hasattr(client, "embed_texts"):
            vectors = await _maybe_await(client.embed_texts([query]))
            return [float(x) for x in vectors[0]]
        if hasattr(client, "create_embeddings"):
            vectors = await _maybe_await(client.create_embeddings([query]))
            return [float(x) for x in vectors[0]]
        raise RuntimeError("OpenAI client does not expose query embedding methods")

    async def _semantic_search(
        self,
        session: Any,
        query_embedding: Sequence[float],
        classification: ClassifierOutput,
        semantic_limit: int,
    ) -> List[Dict[str, Any]]:
        qvec = "[" + ",".join(f"{x:.8f}" for x in query_embedding) + "]"
        sql = text(
            f"""
            SELECT
                rule_id,
                rulebook,
                domain,
                jurisdiction,
                document_type,
                content_hash,
                (embedding <=> CAST(:qvec AS vector)) AS distance
            FROM rulegpt_rule_embeddings
            WHERE
                is_active = true
                AND (:domain IS NULL OR domain = :domain OR domain LIKE :domain_prefix)
                AND (:jurisdiction IS NULL OR jurisdiction = :jurisdiction OR jurisdiction = 'global')
                AND (:document_type IS NULL OR document_type = :document_type OR document_type = 'other')
                {_INTERNAL_RULEBOOK_EXCLUSION}
            ORDER BY embedding <=> CAST(:qvec AS vector)
            LIMIT :semantic_limit
            """
        )
        try:
            result = await _maybe_await(
                session.execute(
                    sql,
                    {
                        "qvec": qvec,
                        "domain": None if classification.domain == "other" else classification.domain,
                        "domain_prefix": _domain_prefix(None if classification.domain == "other" else classification.domain),
                        "jurisdiction": None if classification.jurisdiction == "global" else classification.jurisdiction,
                        "document_type": None if classification.document_type == "other" else classification.document_type,
                        "semantic_limit": semantic_limit,
                    },
                )
            )
        except Exception as exc:
            raise RuntimeError(
                "Semantic retrieval failed. Ensure PostgreSQL + pgvector is configured and the embeddings table exists."
            ) from exc

        rows = []
        for row in result.fetchall():
            rows.append(
                {
                    "rule_id": str(row.rule_id),
                    "rulebook": str(row.rulebook or "unknown"),
                    "domain": str(row.domain or "other"),
                    "jurisdiction": str(row.jurisdiction or "global"),
                    "document_type": str(row.document_type or "other"),
                    "distance": float(row.distance if row.distance is not None else 1.0),
                }
            )
        return rows

    async def _fetch_rule_detail_from_db(self, session: Any, rule_id: str) -> Dict[str, Any]:
        if session is None:
            return {}
        try:
            detail = get_rule_details(session, rule_id)
            return detail or {}
        except Exception:
            return {}

    async def _fetch_rule_detail(self, session: Any, rule_id: str) -> Dict[str, Any]:
        detail = await self._fetch_rule_detail_from_db(session, rule_id)
        if detail:
            return detail
        client = await self._get_rulhub_client()
        if client is None:
            return {}
        if hasattr(client, "get_rule"):
            try:
                response = await _maybe_await(client.get_rule(rule_id))
                return response if isinstance(response, dict) else {}
            except Exception:
                return {}
        return {}

    async def _load_rules_from_db(
        self,
        session: Any,
        domain: str | None,
        jurisdiction: str | None,
        document_type: str | None,
    ) -> list[dict[str, Any]]:
        if session is None:
            return []
        try:
            return load_rules_for_retrieval(
                session,
                domain=domain,
                jurisdiction=jurisdiction,
                document_type=document_type,
                limit=500,
            )
        except Exception:
            return []

    def _rank_fallback_candidates(
        self,
        query: str,
        rules: Sequence[Mapping[str, Any]],
        top_k: int,
        minimum_score: float,
        required_bank: str | None,
        query_countries: set[str],
        document_breadth: bool,
    ) -> list[RetrievedRule]:
        candidates: list[tuple[float, Mapping[str, Any]]] = []
        seen_rule_ids: set[str] = set()
        for rule in rules:
            rule_id = str(rule.get("rule_id") or "")
            if not rule_id or rule_id in seen_rule_ids:
                continue
            seen_rule_ids.add(rule_id)
            score = _fallback_score(
                query=query,
                rule=rule,
                required_bank=required_bank,
                countries=query_countries,
                document_breadth=document_breadth,
            )
            if score < minimum_score:
                continue
            candidates.append((score, rule))

        candidates.sort(key=lambda item: item[0], reverse=True)
        if not candidates:
            return []
        best_score = candidates[0][0]
        if best_score < minimum_score:
            return []

        cutoff_score = max(minimum_score, best_score * 0.6)
        out: List[RetrievedRule] = []
        for score, rule in candidates:
            if score < cutoff_score:
                continue
            out.append(
                RetrievedRule(
                    rule_id=str(rule.get("rule_id") or ""),
                    rulebook=str(rule.get("rulebook") or rule.get("source") or "unknown"),
                    reference=str(rule.get("reference") or rule.get("article") or "n/a"),
                    title=str(rule.get("title") or rule.get("rule_id") or "Untitled"),
                    excerpt=str(rule.get("text") or rule.get("description") or ""),
                    domain=str(rule.get("domain") or "other"),
                    jurisdiction=str(rule.get("jurisdiction") or "global"),
                    document_type=str(rule.get("document_type") or "other"),
                    similarity_score=score,
                    rerank_score=score,
                    metadata={"raw_detail": dict(rule)},
                )
            )
            if len(out) >= top_k:
                break
        return out

    async def _fallback_retrieve(
        self,
        session: Any,
        query: str,
        classification: ClassifierOutput,
        top_k: int,
        document_type_override: str | None = None,
    ) -> List[RetrievedRule]:
        domain = None if classification.domain == "other" else classification.domain
        if classification.domain == "fta":
            jurisdiction = None
        else:
            jurisdiction = None if classification.jurisdiction == "global" else classification.jurisdiction
        document_breadth = requires_document_breadth(query)
        if document_type_override is not None:
            document_type = document_type_override
        else:
            document_type = None if classification.document_type == "other" or document_breadth else classification.document_type
        query_countries = _extract_query_countries(query)
        required_bank = _extract_specific_bank(query)
        minimum_score = 0.2
        if query_countries:
            minimum_score = max(minimum_score, 0.24)
        if required_bank:
            minimum_score = max(minimum_score, 0.27)
        if document_breadth:
            minimum_score = max(minimum_score, 0.18)

        if domain is None:
            filter_attempts = [
                (None, jurisdiction, document_type),
                (None, jurisdiction, None),
                (None, None, document_type),
                (None, None, None),
            ]
        else:
            # Keep fallback within the classified domain to avoid cross-domain noise.
            filter_attempts = [
                (domain, jurisdiction, document_type),
                (domain, jurisdiction, None),
                (domain, None, document_type),
                (domain, None, None),
            ]

        client = await self._get_rulhub_client()
        for attempt_domain, attempt_jurisdiction, attempt_document_type in filter_attempts:
            db_rules = await self._load_rules_from_db(
                session=session,
                domain=attempt_domain,
                jurisdiction=attempt_jurisdiction,
                document_type=attempt_document_type,
            )
            ranked = self._rank_fallback_candidates(
                query=query,
                rules=db_rules,
                top_k=top_k,
                minimum_score=minimum_score,
                required_bank=required_bank,
                query_countries=query_countries,
                document_breadth=document_breadth,
            )
            if ranked:
                return ranked

            if client is None:
                continue
            try:
                file_rules = client.load_rules_from_filesystem(
                    domain=attempt_domain,
                    jurisdiction=attempt_jurisdiction,
                    document_type=attempt_document_type,
                    limit=None,
                )
            except Exception:
                file_rules = []
            ranked = self._rank_fallback_candidates(
                query=query,
                rules=file_rules,
                top_k=top_k,
                minimum_score=minimum_score,
                required_bank=required_bank,
                query_countries=query_countries,
                document_breadth=document_breadth,
            )
            if ranked:
                return ranked

        return []

    @staticmethod
    def _rule_family(rule: RetrievedRule) -> str:
        return _rule_family_from_text(f"{rule.title} {rule.reference} {rule.excerpt}")

    def _select_results(self, candidates: Sequence[RetrievedRule], top_k: int, document_breadth: bool) -> List[RetrievedRule]:
        if not document_breadth:
            return list(candidates[:top_k])

        selected: List[RetrievedRule] = []
        seen_rule_ids: set[str] = set()
        family_limits = (1, 2, 99)
        family_counts: dict[str, int] = {}

        for limit in family_limits:
            for candidate in candidates:
                if candidate.rule_id in seen_rule_ids:
                    continue
                family = self._rule_family(candidate)
                if family_counts.get(family, 0) >= limit:
                    continue
                selected.append(candidate)
                seen_rule_ids.add(candidate.rule_id)
                family_counts[family] = family_counts.get(family, 0) + 1
                if len(selected) >= top_k:
                    return selected

        return selected

    async def retrieve(
        self,
        session: Any,
        query: str,
        classification: ClassifierOutput,
        top_k: int = 5,
    ) -> List[RetrievedRule]:
        document_breadth = requires_document_breadth(query)
        top_k = max(3, min(8, top_k))
        target_top_k = max(top_k, 6) if document_breadth else top_k
        document_type_filter = None if classification.document_type == "other" or document_breadth else classification.document_type
        if classification.domain == "fta":
            effective_jurisdiction = "global"
        else:
            effective_jurisdiction = classification.jurisdiction
        rows: List[Dict[str, Any]] = []
        query_embedding: List[float] | None = None
        try:
            query_embedding = await self._embed_query(query)
            rows = await self._semantic_search(
                session,
                query_embedding,
                ClassifierOutput(
                    domain=classification.domain,
                    jurisdiction=effective_jurisdiction,
                    document_type=document_type_filter or "other",
                    commodity=classification.commodity,
                    complexity=classification.complexity,
                    in_scope=classification.in_scope,
                    reason=classification.reason,
                ),
                semantic_limit=max(24, target_top_k * 4),
            )
        except Exception:
            rows = []
        if not rows:
            return await self._fallback_retrieve(
                session,
                query,
                classification,
                target_top_k,
                document_type_override=document_type_filter,
            )

        candidates: List[RetrievedRule] = []
        for row in rows:
            detail = await self._fetch_rule_detail(session, row["rule_id"])
            reference = str(detail.get("reference") or detail.get("article") or "n/a")
            title = str(detail.get("title") or row["rule_id"])
            excerpt = str(detail.get("text") or detail.get("description") or "")
            similarity = max(0.0, min(1.0, 1.0 - row["distance"])) if not math.isnan(row["distance"]) else 0.0
            lexical = _lexical_score(query, f"{title} {excerpt} {reference} {detail.get('tags', [])}")
            rerank = (similarity * 0.7) + (lexical * 0.3)
            candidates.append(
                RetrievedRule(
                    rule_id=row["rule_id"],
                    rulebook=str(detail.get("rulebook") or row["rulebook"]),
                    reference=reference,
                    title=title,
                    excerpt=excerpt,
                    domain=str(detail.get("domain") or row["domain"]),
                    jurisdiction=str(detail.get("jurisdiction") or row["jurisdiction"]),
                    document_type=str(detail.get("document_type") or row["document_type"]),
                    similarity_score=similarity,
                    rerank_score=rerank,
                    metadata={"raw_detail": detail} if detail else {},
                )
            )

        supplemental_candidates: List[RetrievedRule] = []
        if document_breadth or len(candidates) < target_top_k:
            supplemental_candidates = await self._fallback_retrieve(
                session,
                query,
                classification,
                target_top_k,
                document_type_override=document_type_filter,
            )

        merged_candidates: List[RetrievedRule] = []
        seen_rule_ids: set[str] = set()
        for candidate in sorted(candidates + supplemental_candidates, key=lambda item: item.rerank_score, reverse=True):
            if candidate.rule_id in seen_rule_ids:
                continue
            seen_rule_ids.add(candidate.rule_id)
            merged_candidates.append(candidate)

        if not merged_candidates:
            merged_candidates = await self._fallback_retrieve(
                session,
                query,
                classification,
                target_top_k,
                document_type_override=document_type_filter,
            )

        # Last resort: if still no results, try an unfiltered semantic search
        # with a lower threshold. This prevents retrieval dead zones.
        if not merged_candidates and query_embedding:
            import logging
            _log = logging.getLogger("rulegpt.retriever")
            _log.warning("[RETRIEVAL] Zero results after all filters — trying unfiltered broadened search for: %r", query[:80])
            unfiltered_class = ClassifierOutput(
                domain="other", jurisdiction="global", document_type="other",
                commodity=None, complexity=classification.complexity,
                in_scope=True, reason="broadened_search",
            )
            rows = await self._semantic_search(session, query_embedding, unfiltered_class, semantic_limit=10)
            for row in rows:
                detail = await self._fetch_rule_detail(session, row["rule_id"])
                if not detail or not (detail.get("text") or detail.get("description") or "").strip():
                    continue
                similarity = max(0.0, min(1.0, 1.0 - row["distance"])) if not math.isnan(row["distance"]) else 0.0
                if similarity < 0.30:
                    continue
                reference = str(detail.get("reference") or detail.get("article") or "n/a")
                title = str(detail.get("title") or row["rule_id"])
                excerpt = str(detail.get("text") or detail.get("description") or "")
                lexical = _lexical_score(query, f"{title} {excerpt} {reference}")
                rerank = (similarity * 0.7) + (lexical * 0.3)
                merged_candidates.append(
                    RetrievedRule(
                        rule_id=row["rule_id"],
                        rulebook=str(detail.get("rulebook") or row["rulebook"]),
                        reference=reference, title=title, excerpt=excerpt,
                        domain=str(detail.get("domain") or row["domain"]),
                        jurisdiction=str(detail.get("jurisdiction") or row["jurisdiction"]),
                        document_type=str(detail.get("document_type") or row["document_type"]),
                        similarity_score=similarity, rerank_score=rerank,
                        metadata={"_retrieval_confidence": "low", "raw_detail": detail},
                    )
                )
            if merged_candidates:
                _log.info("[RETRIEVAL] Broadened search found %d results", len(merged_candidates))
            else:
                _log.warning("[RETRIEVAL] Broadened search also returned zero results for: %r", query[:80])

        return self._select_results(merged_candidates, target_top_k, document_breadth)
