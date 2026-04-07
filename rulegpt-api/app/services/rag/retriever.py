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


# Foundational anchor rules — always included when their domain is queried.
# These are the rules that must NEVER be missing from retrieval context.
_ANCHOR_RULES: dict[str, list[str]] = {
    "icc": [
        "UCP600-14",      # Standard for examination (5 banking days, face value)
        "UCP600-18",      # Commercial invoice requirements
        "UCP600-28",      # Insurance document (110% CIF)
        "UCP600-30",      # Tolerance (about/approximately ±10%)
        "UCP600-31",      # Partial shipments ALLOWED (the one that failed)
        "UCP600-31-DERIVED-001",  # Partial shipments derived rule
        "UCP600-36",      # Force majeure (protects banks, not beneficiaries)
        "MT700-43P-001",  # Field 43P partial shipments
        "UCP600-19",      # Multimodal transport document
        "UCP600-20",      # Bill of lading
    ],
    "sanctions": [
        "OFAC-IRAN-001",  # Iran comprehensive sanctions
    ],
}

# Keywords that trigger specific anchor rules
_ANCHOR_TRIGGERS: dict[str, list[str]] = {
    "UCP600-31": ["partial shipment", "partial drawing", "two shipments", "two presentations", "split shipment"],
    "UCP600-31-DERIVED-001": ["partial shipment", "partial drawing"],
    "UCP600-36": ["force majeure", "strike", "riot", "war", "act of god", "lc expired", "lc has expired"],
    "UCP600-30": ["tolerance", "about", "approximately", "5%", "10%"],
    "UCP600-28": ["insurance", "110%", "cif insurance", "cip insurance"],
    "UCP600-14": ["examination period", "banking days", "5 days", "five days", "how long"],
    "UCP600-19": ["multimodal", "combined transport", "door to door", "multimodal transport document"],
    "UCP600-20": ["bill of lading", "b/l", "ocean bill", "marine bill", "shipped on board"],
    "MT700-43P-001": ["partial shipment", "field 43p"],
}


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

    async def _enrich_with_anchors(
        self,
        session: Any,
        query: str,
        domain: str,
        results: List[RetrievedRule],
    ) -> List[RetrievedRule]:
        """Add foundational anchor rules if they're missing from results and relevant to the query."""
        anchors = _ANCHOR_RULES.get(domain, [])
        if not anchors:
            return results

        retrieved_ids = {r.rule_id for r in results}
        query_lower = query.lower()

        # Only add anchors triggered by query keywords
        needed: list[str] = []
        for rule_id in anchors:
            if rule_id in retrieved_ids:
                continue
            triggers = _ANCHOR_TRIGGERS.get(rule_id, [])
            if triggers and any(t in query_lower for t in triggers):
                needed.append(rule_id)

        if not needed:
            return results

        # Fetch and append (max 2 anchors to avoid diluting context)
        for rule_id in needed[:2]:
            detail = await self._fetch_rule_detail(session, rule_id)
            if not detail or not (detail.get("text") or "").strip():
                continue
            results.append(
                RetrievedRule(
                    rule_id=rule_id,
                    rulebook=str(detail.get("rulebook", "UCP600")),
                    reference=str(detail.get("reference", "n/a")),
                    title=str(detail.get("title", "")),
                    excerpt=str(detail.get("text", ""))[:500],
                    domain=str(detail.get("domain", domain)),
                    jurisdiction=str(detail.get("jurisdiction", "global")),
                    document_type=str(detail.get("document_type", "other")),
                    similarity_score=0.5,
                    rerank_score=0.5,
                    metadata={"_anchor": True},
                )
            )

        return results

    async def _fetch_intelligence(
        self,
        query: str,
        domain: str,
        jurisdiction: str,
        seen_ids: set[str],
    ) -> List[RetrievedRule]:
        """Fetch intelligence packs from RulHub for jurisdiction-specific context."""
        client = await self._get_rulhub_client()
        if client is None or not hasattr(client, "get_intelligence"):
            return []
        try:
            packs = await client.get_intelligence(domain=domain, jurisdiction=jurisdiction, limit=3)
        except Exception:
            return []

        results: List[RetrievedRule] = []
        for pack in packs:
            rid = str(pack.get("rule_id", ""))
            if not rid or rid in seen_ids:
                continue
            text = str(pack.get("text") or pack.get("description") or "")
            if not text.strip():
                continue
            seen_ids.add(rid)
            results.append(
                RetrievedRule(
                    rule_id=rid,
                    rulebook=str(pack.get("rulebook") or pack.get("source") or "intelligence"),
                    reference=str(pack.get("reference") or "n/a"),
                    title=str(pack.get("title") or ""),
                    excerpt=text[:500],
                    domain=str(pack.get("domain") or domain),
                    jurisdiction=str(pack.get("jurisdiction") or jurisdiction),
                    document_type=str(pack.get("document_type") or "other"),
                    similarity_score=0.45,
                    rerank_score=0.45,
                    metadata={"_source": "rulhub_intelligence"},
                )
            )
            if len(results) >= 2:
                break
        return results

    async def _fetch_opinions(self, query: str, seen_ids: set[str]) -> List[RetrievedRule]:
        """Fetch ICC Banking Commission opinions / DOCDEX decisions via targeted RulHub search."""
        client = await self._get_rulhub_client()
        if client is None:
            return []
        try:
            # Search specifically for opinions/DOCDEX
            opinion_query = query
            if "docdex" not in query.lower() and "opinion" not in query.lower():
                opinion_query = f"ICC opinion {query}"
            results = await client.search_rules(query=opinion_query, limit=5)
        except Exception:
            return []

        candidates: List[RetrievedRule] = []
        for rule in results:
            rid = str(rule.get("rule_id", ""))
            if not rid or rid in seen_ids:
                continue
            # Only include actual opinions/DOCDEX
            source = str(rule.get("source") or rule.get("rulebook") or "").lower()
            rid_lower = rid.lower()
            if not any(kw in f"{source} {rid_lower}" for kw in ("opinion", "docdex", "icc-r", "icc-op")):
                continue
            text = str(rule.get("text") or rule.get("description") or "")
            if not text.strip():
                continue
            seen_ids.add(rid)
            candidates.append(
                RetrievedRule(
                    rule_id=rid,
                    rulebook=str(rule.get("rulebook") or rule.get("source") or "ICC Opinions"),
                    reference=str(rule.get("reference") or rule.get("article") or "n/a"),
                    title=str(rule.get("title") or ""),
                    excerpt=text[:500],
                    domain=str(rule.get("domain") or "icc"),
                    jurisdiction="global",
                    document_type="other",
                    similarity_score=0.7,
                    rerank_score=0.7,
                    metadata={"_source": "rulhub_opinions"},
                )
            )
            if len(candidates) >= 3:
                break
        return candidates

    async def _fetch_checklists(self, query: str, seen_ids: set[str]) -> List[RetrievedRule]:
        """Fetch examination checklists from RulHub when user asks for step-by-step guidance."""
        client = await self._get_rulhub_client()
        if client is None or not hasattr(client, "get_checklists"):
            return []
        try:
            packs = await client.get_checklists(limit=3)
        except Exception:
            return []

        results: List[RetrievedRule] = []
        query_lower = query.lower()
        for pack in packs:
            content = pack.get("raw", {}).get("content", {}) if isinstance(pack.get("raw"), dict) else {}
            steps = content.get("steps", [])
            if not steps:
                continue
            # Build a summary of the checklist steps
            step_texts = [str(s.get("description", ""))[:150] for s in steps[:5] if isinstance(s, dict)]
            excerpt = " | ".join(step_texts) if step_texts else str(pack.get("text", ""))[:500]
            if not excerpt.strip():
                continue
            pid = str(pack.get("rule_id", "")) or f"checklist-{pack.get('filename', 'unknown')}"
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            results.append(
                RetrievedRule(
                    rule_id=pid,
                    rulebook="tfrules-checklist",
                    reference=str(pack.get("filename", "examination checklist")),
                    title=str(steps[0].get("title", "Examination Checklist") if steps else "Checklist"),
                    excerpt=excerpt[:500],
                    domain="icc", jurisdiction="global", document_type="other",
                    similarity_score=0.45, rerank_score=0.45,
                    metadata={"_source": "rulhub_checklist"},
                )
            )
            if len(results) >= 1:
                break
        return results

    async def _fetch_glossary_term(self, query: str, seen_ids: set[str]) -> List[RetrievedRule]:
        """Fetch glossary definition when user asks 'what is X'."""
        client = await self._get_rulhub_client()
        if client is None or not hasattr(client, "get_glossary"):
            return []
        try:
            packs = await client.get_glossary()
        except Exception:
            return []
        if not packs:
            return []

        # Extract the search term from the query
        query_lower = query.lower().strip().rstrip("?")
        for prefix in ("what is ", "what are ", "define ", "meaning of ", "what does "):
            if query_lower.startswith(prefix):
                query_lower = query_lower[len(prefix):].strip()
                break

        # Search through glossary terms
        content = packs[0].get("raw", {}).get("content", {}) if isinstance(packs[0].get("raw"), dict) else {}
        terms = content.get("terms", [])
        for term_entry in terms:
            if not isinstance(term_entry, dict):
                continue
            term = str(term_entry.get("term", "")).lower()
            definition = str(term_entry.get("definition", ""))
            if term and (term in query_lower or query_lower in term):
                tid = f"glossary-{term.replace(' ', '_')}"
                if tid in seen_ids:
                    continue
                seen_ids.add(tid)
                return [
                    RetrievedRule(
                        rule_id=tid,
                        rulebook="tfrules-glossary",
                        reference=f"Glossary: {term_entry.get('term', '')}",
                        title=str(term_entry.get("term", "")),
                        excerpt=definition,
                        domain="icc", jurisdiction="global", document_type="other",
                        similarity_score=0.9, rerank_score=0.9,
                        metadata={"_source": "rulhub_glossary", "category": term_entry.get("category")},
                    )
                ]
        return []

    async def _retrieve_from_rulhub(self, query: str, top_k: int) -> List[RetrievedRule]:
        """Primary retrieval: RulHub API semantic search."""
        client = await self._get_rulhub_client()
        if client is None or not hasattr(client, "search_rules"):
            return []
        try:
            results = await client.search_rules(query=query, limit=top_k * 2)
        except Exception:
            return []
        if not results:
            return []

        candidates: List[RetrievedRule] = []
        for i, rule in enumerate(results):
            rid = str(rule.get("rule_id", ""))
            if not rid:
                continue
            text = str(rule.get("text") or rule.get("description") or "")
            if not text.strip() or len(text) < 10:
                continue
            # Skip internal engine rules
            if any(rid.startswith(p) for p in ("DQ-", "VG-", "EVAPI-", "BBEH-")):
                continue
            rb = str(rule.get("rulebook") or rule.get("source") or "unknown")
            if rb in _INTERNAL_RULEBOOKS:
                continue

            title = str(rule.get("title") or "")
            reference = str(rule.get("reference") or rule.get("article") or "n/a")
            # Score: RulHub results are already ranked by relevance — use position
            position_score = max(0.5, 0.95 - (i * 0.05))
            lexical = _lexical_score(query, f"{title} {text[:200]} {reference}")
            rerank = (position_score * 0.7) + (lexical * 0.3)

            candidates.append(
                RetrievedRule(
                    rule_id=rid,
                    rulebook=rb,
                    reference=reference,
                    title=title,
                    excerpt=text[:500],
                    domain=str(rule.get("domain") or "other"),
                    jurisdiction=str(rule.get("jurisdiction") or "global"),
                    document_type=str(rule.get("document_type") or "other"),
                    similarity_score=position_score,
                    rerank_score=rerank,
                    metadata={"_source": "rulhub_api"},
                )
            )
        return candidates

    async def retrieve(
        self,
        session: Any,
        query: str,
        classification: ClassifierOutput,
        top_k: int = 5,
    ) -> List[RetrievedRule]:
        import logging
        _log = logging.getLogger("rulegpt.retriever")

        document_breadth = requires_document_breadth(query)
        top_k = max(3, min(8, top_k))
        target_top_k = max(top_k, 6) if document_breadth else top_k

        # ── Stage 1: RulHub API (primary source) ──
        rulhub_candidates = await self._retrieve_from_rulhub(query, target_top_k)
        if rulhub_candidates:
            _log.info("[RETRIEVAL] RulHub returned %d candidates for: %r", len(rulhub_candidates), query[:60])

        # ── Stage 2: pgvector (fallback / supplement) ──
        pgvector_candidates: List[RetrievedRule] = []
        document_type_filter = None if classification.document_type == "other" or document_breadth else classification.document_type
        effective_jurisdiction = "global" if classification.domain == "fta" else classification.jurisdiction

        if len(rulhub_candidates) < target_top_k:
            # RulHub didn't return enough — supplement with pgvector
            try:
                query_embedding = await self._embed_query(query)
                rows = await self._semantic_search(
                    session, query_embedding,
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
                for row in rows:
                    detail = await self._fetch_rule_detail(session, row["rule_id"])
                    reference = str(detail.get("reference") or detail.get("article") or "n/a")
                    title = str(detail.get("title") or row["rule_id"])
                    excerpt = str(detail.get("text") or detail.get("description") or "")
                    similarity = max(0.0, min(1.0, 1.0 - row["distance"])) if not math.isnan(row["distance"]) else 0.0
                    lexical = _lexical_score(query, f"{title} {excerpt} {reference} {detail.get('tags', [])}")
                    rerank = (similarity * 0.7) + (lexical * 0.3)
                    pgvector_candidates.append(
                        RetrievedRule(
                            rule_id=row["rule_id"],
                            rulebook=str(detail.get("rulebook") or row["rulebook"]),
                            reference=reference, title=title, excerpt=excerpt,
                            domain=str(detail.get("domain") or row["domain"]),
                            jurisdiction=str(detail.get("jurisdiction") or row["jurisdiction"]),
                            document_type=str(detail.get("document_type") or row["document_type"]),
                            similarity_score=similarity, rerank_score=rerank,
                            metadata={"_source": "pgvector"},
                        )
                    )
            except Exception:
                pass

            if not pgvector_candidates:
                pgvector_candidates = await self._fallback_retrieve(
                    session, query, classification, target_top_k,
                    document_type_override=document_type_filter,
                )

        # ── Stage 3: Merge and deduplicate ──
        merged: List[RetrievedRule] = []
        seen: set[str] = set()
        for c in sorted(rulhub_candidates + pgvector_candidates, key=lambda x: x.rerank_score, reverse=True):
            if c.rule_id in seen:
                continue
            seen.add(c.rule_id)
            merged.append(c)

        # ── Stage 3b: Intelligence packs (jurisdiction-specific context) ──
        if classification.jurisdiction and classification.jurisdiction != "global":
            intel_candidates = await self._fetch_intelligence(
                query, classification.domain, classification.jurisdiction, seen,
            )
            if intel_candidates:
                merged.extend(intel_candidates)

        # ── Stage 3b2: ICC Opinions / DOCDEX (when user asks about precedent) ──
        query_lower = query.lower()
        if any(kw in query_lower for kw in ("icc opinion", "docdex", "banking commission opinion", "precedent", "has the icc")):
            opinion_results = await self._fetch_opinions(query, seen)
            if opinion_results:
                merged.extend(opinion_results)

        # ── Stage 3c: Checklists (step-by-step guides for "what to check" queries) ──
        if any(kw in query_lower for kw in ("checklist", "what to check", "step by step", "examination steps", "what should i check")):
            checklist_results = await self._fetch_checklists(query, seen)
            if checklist_results:
                merged.extend(checklist_results)

        # ── Stage 3d: Glossary (definition queries) ──
        if any(query_lower.startswith(p) for p in ("what is ", "what are ", "define ", "meaning of ", "what does ")):
            glossary_result = await self._fetch_glossary_term(query, seen)
            if glossary_result:
                merged.extend(glossary_result)

        # ── Stage 4: Anchor rules (foundational safety net) ──
        selected = self._select_results(merged, target_top_k, document_breadth)
        selected = await self._enrich_with_anchors(session, query, classification.domain, selected)
        return selected
