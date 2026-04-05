"""Embedding sync service for RuleGPT RAG."""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from contextlib import nullcontext
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import text

from app.config import settings

from .models import EmbeddingSyncReport, NormalizedRule
from .rule_store import upsert_rule_record

DEFAULT_RULE_DATA_PATH = Path(
    settings.RULEGPT_LOCAL_RULES_ROOT or r"J:\Enso Intelligence\trdrhub.com\Data"
)

_CANONICAL_RULE_KEYS = {
    "id",
    "source",
    "rule_id",
    "article",
    "title",
    "reference",
    "version",
    "text",
    "description",
    "condition",
    "conditions",
    "expected_outcome",
    "tags",
    "deterministic",
    "requires_llm",
    "severity",
    "examples",
    "domain",
    "jurisdiction",
    "document_type",
    "rulebook",
    "bank_name",
    "swift_code",
    "trade_finance_characteristics",
}

_RULEBOOK_MARKERS: Tuple[Tuple[str, str], ...] = (
    ("ucp600", "UCP600"),
    ("isbp745", "ISBP745"),
    ("isbp", "ISBP745"),
    ("isp98", "ISP98"),
    ("urdg758", "URDG758"),
    ("urc522", "URC522"),
    ("urr725", "URR725"),
    ("eucp", "eUCP 2.1"),
    ("incoterms", "Incoterms 2020"),
    ("rcep", "RCEP"),
    ("cptpp", "CPTPP"),
    ("usmca", "USMCA"),
    ("ofac", "OFAC"),
    ("eu", "EU"),
    ("un", "UN"),
    ("uk", "UK"),
    ("swift", "SWIFT"),
    ("iso20022", "ISO 20022"),
)


_DOMAIN_CANONICAL_MAP: Dict[str, str] = {
    # ICC standards
    "icc": "icc", "ucp": "icc", "ucp600": "icc", "isbp": "icc", "isbp745": "icc",
    "isp98": "icc", "urdg": "icc", "urdg758": "icc", "urc": "icc", "urc522": "icc",
    "urr": "icc", "urr725": "icc", "incoterms": "icc", "eucp": "icc",
    # Sanctions
    "sanctions": "sanctions", "ofac": "sanctions", "embargo": "sanctions",
    "sdn": "sanctions",
    # FTA
    "fta": "fta", "rcep": "fta", "cptpp": "fta", "usmca": "fta",
    "afcfta": "fta", "origin": "fta",
    # Customs
    "customs": "customs", "hs": "customs", "tariff": "customs",
    # Bank specific
    "bank": "bank_specific", "bank_specific": "bank_specific",
    "bank_profiles": "bank_specific", "swift": "bank_specific",
}

# Substrings in domain values that map to canonical domains
_DOMAIN_SUBSTRING_MAP = {
    "sanction": "sanctions", "ofac": "sanctions", "embargo": "sanctions",
    "tbml": "sanctions", "money_laundering": "sanctions", "trade_based_money": "sanctions",
    "export_control": "sanctions", "entity_intel": "sanctions",
    "fta": "fta", "rcep": "fta", "cptpp": "fta", "usmca": "fta",
    "free_trade": "fta", "origin": "fta",
    "customs": "customs", "hs_code": "customs",
    "bank_behavior": "bank_specific", "bank_profile": "bank_specific",
    "swift": "bank_specific", "iso20022": "bank_specific", "messaging": "bank_specific",
    "icc": "icc", "ucp": "icc", "isbp": "icc", "incoterms": "icc",
    "letter_rules": "icc", "presentation": "icc", "examination": "icc",
    "collections": "icc", "guarantee": "icc", "standby": "icc",
    "lifecycle": "icc", "payment_ops": "icc", "transport": "icc",
    "commodity": "icc", "islamic_finance": "icc", "eca": "icc",
    "mdb": "icc", "regulatory_capital": "icc", "supply_chain": "icc",
    "electronic_trade": "icc", "cross_document": "icc", "clause_graph": "icc",
    "requirement_graph": "icc", "dispute_reasoning": "icc",
    "exception_waiver": "icc", "version_governance": "icc",
    "data_quality": "icc", "event_driven": "icc",
    "country_rules": "icc", "jurisdictional": "icc", "jurisdiction": "icc",
    "lc_ops": "icc", "lc_": "icc",
}


def _canonicalize_domain(value: Any) -> str:
    text = _as_str(value).lower()
    if not text:
        return ""
    # Direct match
    if text in _DOMAIN_CANONICAL_MAP:
        return _DOMAIN_CANONICAL_MAP[text]
    # Prefix match on known starters
    for prefix in ("sanctions", "fta", "bank", "customs", "icc", "ucp", "isbp", "incoterms"):
        if text.startswith(prefix):
            return _DOMAIN_CANONICAL_MAP.get(prefix, text)
    # Substring match for compound domain names
    for substring, canonical in _DOMAIN_SUBSTRING_MAP.items():
        if substring in text:
            return canonical
    # Country regulation rules (regulations.xx) → icc (jurisdictional trade rules)
    if text.startswith("regulations.") or text.startswith("law.") or text.startswith("mode."):
        return "icc"
    if text == "correspondent_banking" or text == "commodities":
        return "icc"
    return text


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


def _maybe_nested_transaction(session: Any):
    begin_nested = getattr(session, "begin_nested", None)
    if begin_nested is None:
        return nullcontext()
    try:
        return begin_nested()
    except Exception:
        return nullcontext()


def _safe_json(value: Any) -> str:
    try:
        return json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
    except TypeError:
        return str(value)


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    return [value]


def _infer_rulebook(record: Dict[str, Any], source_hint: Optional[str]) -> str:
    direct = _as_str(record.get("rulebook"))
    if direct:
        return direct

    probe = " ".join(
        [
            _as_str(record.get("source")),
            _as_str(record.get("rule_id")),
            _as_str(record.get("reference")),
            _as_str(record.get("title")),
            _as_str(record.get("article")),
            _as_str(record.get("version")),
            _as_str(source_hint),
        ]
    ).lower()
    for marker, label in _RULEBOOK_MARKERS:
        if marker in probe:
            return label
    return _as_str(record.get("source")) or "unknown"


def _infer_domain(record: Dict[str, Any], source_hint: Optional[str], rulebook: str) -> str:
    explicit = _canonicalize_domain(record.get("domain"))
    if explicit and explicit not in ("", "other"):
        return explicit

    probe = f"{source_hint or ''} {rulebook} {_as_str(record.get('rule_id'))} {_as_str(record.get('title'))}".lower()
    # Check substring map against full probe text
    for substring, canonical in _DOMAIN_SUBSTRING_MAP.items():
        if substring in probe:
            return canonical

    tokens = set(re.findall(r"[a-z0-9_]+", probe))
    if any(k in tokens for k in ("ucp600", "isbp745", "isbp", "incoterms", "urdg758", "urdg", "isp98", "isp", "urc522", "urc", "urr725", "urr")):
        return "icc"
    if any(k in tokens for k in ("rcep", "cptpp", "usmca", "fta")):
        return "fta"
    if any(k in tokens for k in ("ofac", "sanction", "sanctions", "embargo", "tbml")):
        return "sanctions"
    if "bank" in tokens or "bank_profiles" in tokens:
        return "bank_specific"
    return "other"


def _infer_document_type(record: Dict[str, Any], source_hint: Optional[str]) -> str:
    explicit = _as_str(record.get("document_type")).lower()
    if explicit:
        return explicit
    probe = " ".join(
        [
            _as_str(record.get("title")),
            _as_str(record.get("reference")),
            _as_str(source_hint),
            _safe_json(record.get("tags")),
        ]
    ).lower()
    if "bill of lading" in probe or "b/l" in probe:
        return "bill_of_lading"
    if "invoice" in probe:
        return "invoice"
    if "certificate" in probe:
        return "certificate"
    if "lc" in probe or "letter of credit" in probe:
        return "lc"
    return "other"


_JURISDICTION_NORMALIZE: Dict[str, str] = {
    "bangladesh": "bd", "india": "in", "china": "cn", "singapore": "sg",
    "united states": "us", "usa": "us", "united_states": "us",
    "united kingdom": "uk", "united_kingdom": "uk", "gb": "uk",
    "european union": "eu", "european_union": "eu",
    "uae": "ae", "united arab emirates": "ae",
    "saudi arabia": "sa", "saudi": "sa",
    "japan": "jp", "korea": "kr", "south korea": "kr",
    "vietnam": "vn", "thailand": "th", "malaysia": "my",
    "indonesia": "id", "philippines": "ph", "cambodia": "kh",
    "pakistan": "pk", "sri lanka": "lk", "srilanka": "lk",
    "nigeria": "ng", "kenya": "ke", "ghana": "gh", "south africa": "za",
    "egypt": "eg", "morocco": "ma", "jordan": "jo",
    "australia": "au", "new zealand": "nz", "newzealand": "nz",
    "brazil": "br", "mexico": "mx", "colombia": "co", "peru": "pe",
    "chile": "cl", "argentina": "ar", "panama": "pa",
    "turkey": "tr", "qatar": "qa", "kuwait": "kw", "bahrain": "bh",
    "oman": "om", "iran": "ir",
    "germany": "de", "france": "fr", "netherlands": "nl", "italy": "it",
    "spain": "es", "portugal": "pt", "belgium": "be", "austria": "at",
    "switzerland": "ch", "sweden": "se", "norway": "no", "denmark": "dk",
    "finland": "fi", "ireland": "ie", "greece": "gr", "poland": "pl",
    "czech": "cz", "hungary": "hu", "romania": "ro",
    "ukraine": "ua", "uzbekistan": "uz", "kazakhstan": "kz",
    "hong kong": "hk", "hongkong": "hk", "taiwan": "tw",
    "canada": "ca", "ethiopia": "et", "lebanon": "lb",
    "international": "global",
}


def _normalize_jurisdiction(raw: str) -> str:
    """Normalize jurisdiction to ISO 2-letter code or 'global'."""
    text = raw.strip().lower()
    if not text:
        return "global"
    # Already a 2-letter code
    if len(text) == 2 and text.isalpha():
        return text
    # Direct lookup
    if text in _JURISDICTION_NORMALIZE:
        return _JURISDICTION_NORMALIZE[text]
    # Extract leading 2-letter code from compound values like "bd bangladesh bank"
    parts = text.split()
    if len(parts[0]) == 2 and parts[0].isalpha():
        return parts[0]
    # Check if text starts with "regulations."
    if text.startswith("regulations."):
        code = text.split(".")[1]
        if len(code) == 2:
            return code
    # Substring match
    for name, code in _JURISDICTION_NORMALIZE.items():
        if name in text:
            return code
    return text


def _infer_jurisdiction(record: Dict[str, Any], source_hint: Optional[str]) -> str:
    explicit = _as_str(record.get("jurisdiction")).lower()
    if explicit:
        return _normalize_jurisdiction(explicit)
    if _as_str(record.get("country")):
        return _normalize_jurisdiction(_as_str(record["country"]))
    if isinstance(record.get("members"), list) and record["members"]:
        return "regional"
    probe = (source_hint or "").lower()
    if "global" in probe:
        return "global"
    return "global"


def _normalize_tags(record: Dict[str, Any]) -> List[str]:
    tags = _as_list(record.get("tags"))
    out: List[str] = []
    for tag in tags:
        s = _as_str(tag)
        if s:
            out.append(s.lower())
    if _as_str(record.get("bank_name")):
        out.append("bank_profile")
    if _as_str(record.get("swift_code")):
        out.append("swift")
    return sorted(set(out))


def _normalize_conditions(record: Dict[str, Any]) -> List[Any]:
    conditions = record.get("conditions")
    if conditions is None:
        conditions = record.get("condition")
    return _as_list(conditions)


def _normalize_description(record: Dict[str, Any]) -> str:
    # Variants seen in ICC/FTA/sanctions/bank files.
    for field in ("text", "description", "summary"):
        if _as_str(record.get(field)):
            return _as_str(record[field])
    # Bank-profile rich shape fallback.
    if _as_str(record.get("trade_finance_characteristics")):
        return _as_str(record["trade_finance_characteristics"])
    return ""


def _build_content_hash(payload: Dict[str, Any]) -> str:
    canonical = _safe_json(payload).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def normalize_rule_record(record: Dict[str, Any], source_hint: Optional[str] = None) -> NormalizedRule:
    rule_id = _as_str(record.get("rule_id")) or _as_str(record.get("id"))
    if not rule_id:
        fallback_seed = f"{source_hint or 'unknown'}::{_safe_json(record)}"
        rule_id = "rule_" + hashlib.md5(fallback_seed.encode("utf-8")).hexdigest()

    rulebook = _infer_rulebook(record, source_hint)
    domain = _infer_domain(record, source_hint, rulebook)
    jurisdiction = _infer_jurisdiction(record, source_hint)
    document_type = _infer_document_type(record, source_hint)
    conditions = _normalize_conditions(record)
    description = _normalize_description(record)
    tags = _normalize_tags(record)
    deterministic = bool(record.get("deterministic", True))
    requires_llm = bool(record.get("requires_llm", False))
    severity = _as_str(record.get("severity")).lower() or "medium"

    metadata = {k: v for k, v in record.items() if k not in _CANONICAL_RULE_KEYS}
    # Preserve commonly useful structured fields in metadata for retrieval/reranking.
    for key in ("members", "origin_criteria", "calculation", "bank_name", "swift_code", "trade_finance_characteristics"):
        if key in record and key not in metadata:
            metadata[key] = record[key]
    if source_hint and "source_hint" not in metadata:
        metadata["source_hint"] = source_hint

    canonical_for_hash = {
        "rule_id": rule_id,
        "rulebook": rulebook,
        "article": _as_str(record.get("article")),
        "title": _as_str(record.get("title")),
        "reference": _as_str(record.get("reference")),
        "version": _as_str(record.get("version")),
        "domain": domain,
        "jurisdiction": jurisdiction,
        "document_type": document_type,
        "description": description,
        "conditions": conditions,
        "tags": tags,
        "deterministic": deterministic,
        "requires_llm": requires_llm,
        "severity": severity,
        "metadata": metadata,
    }

    return NormalizedRule(
        rule_id=rule_id,
        rulebook=rulebook,
        article=_as_str(record.get("article")) or None,
        title=_as_str(record.get("title")) or None,
        reference=_as_str(record.get("reference")) or None,
        version=_as_str(record.get("version")) or None,
        domain=domain,
        jurisdiction=jurisdiction,
        document_type=document_type,
        description=description,
        conditions=conditions,
        tags=tags,
        deterministic=deterministic,
        requires_llm=requires_llm,
        severity=severity,
        metadata=metadata,
        content_hash=_build_content_hash(canonical_for_hash),
        raw=record,
    )


def build_embedding_content(rule: NormalizedRule) -> str:
    title = rule.title or "Untitled"
    reference = rule.reference or rule.article or "n/a"
    conditions_blob = _safe_json(rule.conditions)
    tags_blob = ", ".join(rule.tags)
    metadata_blob = _safe_json(rule.metadata) if rule.metadata else "{}"
    return (
        f"[{rule.rulebook}] [{reference}] [{title}]: "
        f"{rule.description} "
        f"[conditions: {conditions_blob}] "
        f"[tags: {tags_blob}] "
        f"[jurisdiction: {rule.jurisdiction}] "
        f"[document_type: {rule.document_type}] "
        f"[domain: {rule.domain}] "
        f"[metadata: {metadata_blob}]"
    ).strip()


def _load_json_file(path: Path) -> List[Dict[str, Any]]:
    def _looks_like_rule_record(record: Dict[str, Any]) -> bool:
        if not isinstance(record, dict):
            return False
        if isinstance(record.get("rules"), list):
            return True
        if _as_str(record.get("rule_id")) or _as_str(record.get("id")):
            return True

        descriptive_fields = (
            "title",
            "text",
            "description",
            "summary",
            "reference",
            "article",
            "conditions",
            "condition",
            "expected_outcome",
            "examples",
            "severity",
        )
        populated = sum(1 for field in descriptive_fields if record.get(field) not in (None, "", [], {}))
        return populated >= 2

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    if isinstance(payload, list):
        return [item for item in payload if _looks_like_rule_record(item)]
    if isinstance(payload, dict):
        if isinstance(payload.get("rules"), list):
            return [item for item in payload["rules"] if _looks_like_rule_record(item)]
        return [payload] if _looks_like_rule_record(payload) else []
    return []


def load_rules_from_local_data(data_root: Path = DEFAULT_RULE_DATA_PATH) -> List[NormalizedRule]:
    if not data_root.exists():
        return []
    out: List[NormalizedRule] = []
    for json_file in data_root.rglob("*.json"):
        records = _load_json_file(json_file)
        source_hint = str(json_file.relative_to(data_root)).replace("\\", "/")
        for record in records:
            out.append(normalize_rule_record(record, source_hint=source_hint))
    return out


@dataclass
class _RulePayload:
    normalized: NormalizedRule
    content: str
    embedding: List[float]


class RuleEmbedder:
    """Embeds normalized rules and syncs them into pgvector."""

    def __init__(
        self,
        openai_client: Optional[Any] = None,
        rulhub_client: Optional[Any] = None,
        batch_size: int = 100,
    ) -> None:
        self.batch_size = max(1, min(batch_size, 500))
        self.openai_client = openai_client
        self.rulhub_client = rulhub_client

    async def _get_openai_client(self) -> Any:
        if self.openai_client is not None:
            return self.openai_client
        try:
            from app.services.integrations.openai_client import OpenAIClient  # type: ignore

            self.openai_client = OpenAIClient()
            return self.openai_client
        except Exception as exc:  # pragma: no cover - depends on external integration module
            raise RuntimeError("OpenAI integration client is not available") from exc

    async def _get_rulhub_client(self) -> Any:
        if self.rulhub_client is not None:
            return self.rulhub_client
        try:
            from app.services.integrations.rulhub_client import RulHubClient  # type: ignore

            self.rulhub_client = RulHubClient()
            return self.rulhub_client
        except Exception:
            return None

    async def _ensure_pgvector_enabled(self, session: Any) -> None:
        result = await _maybe_await(
            session.execute(text("SELECT extname FROM pg_extension WHERE extname='vector'"))
        )
        if result.first() is None:
            raise RuntimeError(
                "pgvector extension is not enabled. Run `CREATE EXTENSION IF NOT EXISTS vector;` first."
            )

    async def _fetch_existing_hashes(self, session: Any) -> Dict[str, str]:
        result = await _maybe_await(
            session.execute(text("SELECT rule_id, content_hash FROM rulegpt_rule_embeddings WHERE is_active = true"))
        )
        return {str(row.rule_id): str(row.content_hash) for row in result.fetchall()}

    async def _upsert_rule_record(self, session: Any, rule: NormalizedRule) -> str:
        return upsert_rule_record(session, rule)

    async def _upsert_payload(self, session: Any, payload: _RulePayload) -> str:
        embedding_literal = "[" + ",".join(f"{x:.8f}" for x in payload.embedding) + "]"
        update_result = await _maybe_await(
            session.execute(
                text(
                    """
                    UPDATE rulegpt_rule_embeddings
                    SET rulebook=:rulebook,
                        jurisdiction=:jurisdiction,
                        document_type=:document_type,
                        domain=:domain,
                        embedding=CAST(:embedding AS vector),
                        content_hash=:content_hash,
                        embedded_at=NOW()
                    WHERE rule_id=:rule_id
                    """
                ),
                {
                    "rule_id": payload.normalized.rule_id,
                    "rulebook": payload.normalized.rulebook,
                    "jurisdiction": payload.normalized.jurisdiction,
                    "document_type": payload.normalized.document_type,
                    "domain": payload.normalized.domain,
                    "embedding": embedding_literal,
                    "content_hash": payload.normalized.content_hash,
                },
            )
        )
        if getattr(update_result, "rowcount", 0):
            return "updated"

        await _maybe_await(
            session.execute(
                text(
                    """
                    INSERT INTO rulegpt_rule_embeddings (
                        id, rule_id, rulebook, jurisdiction, document_type, domain, embedding, content_hash, embedded_at
                    ) VALUES (
                        :id, :rule_id, :rulebook, :jurisdiction, :document_type, :domain, CAST(:embedding AS vector), :content_hash, NOW()
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "rule_id": payload.normalized.rule_id,
                    "rulebook": payload.normalized.rulebook,
                    "jurisdiction": payload.normalized.jurisdiction,
                    "document_type": payload.normalized.document_type,
                    "domain": payload.normalized.domain,
                    "embedding": embedding_literal,
                    "content_hash": payload.normalized.content_hash,
                },
            )
        )
        return "inserted"

    async def _embed_texts(self, texts: Sequence[str]) -> List[List[float]]:
        client = await self._get_openai_client()
        if hasattr(client, "embed_texts"):
            vectors = await _maybe_await(client.embed_texts(list(texts)))
            return [list(map(float, v)) for v in vectors]
        if hasattr(client, "create_embeddings"):
            vectors = await _maybe_await(client.create_embeddings(list(texts)))
            return [list(map(float, v)) for v in vectors]
        raise RuntimeError("OpenAI client does not expose `embed_texts` or `create_embeddings`")

    async def load_rules_from_api(self) -> List[NormalizedRule]:
        client = await self._get_rulhub_client()
        if client is None:
            return []

        records: List[Dict[str, Any]] = []
        if hasattr(client, "get_rules"):
            try:
                response = await _maybe_await(client.get_rules(domain=None, jurisdiction=None, document_type=None, limit=None, page=1))
                if isinstance(response, list):
                    records.extend([x for x in response if isinstance(x, dict)])
            except Exception:
                pass
        if not records and hasattr(client, "get_all_rulesets"):
            try:
                rulesets = await _maybe_await(client.get_all_rulesets())
            except Exception:
                rulesets = []
            if isinstance(rulesets, list):
                for ruleset in rulesets:
                    if isinstance(ruleset, dict) and isinstance(ruleset.get("rules"), list):
                        records.extend([x for x in ruleset["rules"] if isinstance(x, dict)])

        return [normalize_rule_record(record, source_hint="rulhub_api") for record in records]

    async def collect_rules(
        self,
        include_api: bool = True,
        include_local: bool = True,
        local_data_path: Path = DEFAULT_RULE_DATA_PATH,
    ) -> List[NormalizedRule]:
        all_rules: Dict[str, NormalizedRule] = {}
        if include_api:
            for rule in await self.load_rules_from_api():
                all_rules[rule.rule_id] = rule
        if include_local:
            for rule in load_rules_from_local_data(local_data_path):
                # Prefer API copy when same rule_id appears from both sources.
                all_rules.setdefault(rule.rule_id, rule)
        return list(all_rules.values())

    async def sync_embeddings(
        self,
        session: Any,
        rules: Optional[Sequence[NormalizedRule]] = None,
        include_api: bool = True,
        include_local: bool = True,
        local_data_path: Path = DEFAULT_RULE_DATA_PATH,
    ) -> EmbeddingSyncReport:
        report = EmbeddingSyncReport()
        await self._ensure_pgvector_enabled(session)

        loaded_rules = list(rules) if rules is not None else await self.collect_rules(
            include_api=include_api,
            include_local=include_local,
            local_data_path=local_data_path,
        )
        deduped_rules: Dict[str, NormalizedRule] = {}
        for rule in loaded_rules:
            deduped_rules.setdefault(rule.rule_id, rule)
        rule_list = list(deduped_rules.values())
        report.processed = len(rule_list)
        if not rule_list:
            return report

        existing_hashes = await self._fetch_existing_hashes(session)

        pending: List[Tuple[NormalizedRule, str]] = []
        for rule in rule_list:
            try:
                with _maybe_nested_transaction(session):
                    rule_action = await _maybe_await(self._upsert_rule_record(session, rule))
                    flush = getattr(session, "flush", None)
                    if flush is not None:
                        await _maybe_await(flush())
                if rule_action == "inserted":
                    report.rules_inserted += 1
                else:
                    report.rules_updated += 1
            except Exception as exc:
                report.failed += 1
                report.errors.append(f"{rule.rule_id} rule record sync failed: {exc}")
                continue
            if existing_hashes.get(rule.rule_id) == rule.content_hash:
                report.skipped_unchanged += 1
                continue
            pending.append((rule, build_embedding_content(rule)))

        for start in range(0, len(pending), self.batch_size):
            batch = pending[start : start + self.batch_size]
            texts = [content for _, content in batch]
            try:
                vectors = await self._embed_texts(texts)
            except Exception as exc:
                report.failed += len(batch)
                report.errors.append(f"Embedding batch {start // self.batch_size} failed: {exc}")
                continue

            for (rule, content), embedding in zip(batch, vectors):
                payload = _RulePayload(normalized=rule, content=content, embedding=embedding)
                try:
                    with _maybe_nested_transaction(session):
                        action = await self._upsert_payload(session, payload)
                    if action == "inserted":
                        report.embedded += 1
                    else:
                        report.updated += 1
                except Exception as exc:
                    report.failed += 1
                    report.errors.append(f"{rule.rule_id}: {exc}")

        await _maybe_await(session.commit())
        return report
