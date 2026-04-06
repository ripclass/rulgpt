"""RulHub integration client with retries, caching, and local bootstrap helpers."""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import quote

try:
    import httpx  # type: ignore
except ImportError:  # pragma: no cover - dependency may not exist in all environments
    httpx = None  # type: ignore


class RulHubClientError(RuntimeError):
    """Raised when RulHub operations fail."""


class _TransientHTTPError(Exception):
    """Internal error wrapper to trigger retry logic."""


class _LRUCache:
    """Tiny TTL-based in-memory LRU cache."""

    def __init__(self, max_size: int = 512, ttl_seconds: int = 300) -> None:
        self.max_size = max(1, max_size)
        self.ttl_seconds = max(1, ttl_seconds)
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        now = time.time()
        item = self._data.get(key)
        if item is None:
            return None
        expires_at, value = item
        if expires_at < now:
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return value

    def set(self, key: str, value: Any) -> None:
        self._data[key] = (time.time() + self.ttl_seconds, value)
        self._data.move_to_end(key)
        while len(self._data) > self.max_size:
            self._data.popitem(last=False)


class RulHubClient:
    """
    Client for current RulHub public API contracts.

    Current known route family:
    - GET /v1/rulesets
    - GET /v1/rulesets/{ruleset_key}
    - GET /v1/rules
    - GET /v1/rules/{rule_id}
    """

    RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout_seconds: float = 10.0,
        max_retries: int = 3,
        backoff_seconds: float = 0.5,
        cache_size: int = 512,
        cache_ttl_seconds: int = 300,
        data_root: str | None = None,
        client: httpx.AsyncClient | None = None,
        max_search_pages: int = 3,
    ) -> None:
        if httpx is None:
            raise RulHubClientError("httpx package is not installed")
        self.base_url = (base_url or os.getenv("RULHUB_API_URL") or "https://api.rulhub.com").rstrip("/")
        self.api_key = api_key or os.getenv("RULHUB_API_KEY")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self.backoff_seconds = max(0.0, backoff_seconds)
        self.max_search_pages = max(1, max_search_pages)
        self._cache = _LRUCache(max_size=cache_size, ttl_seconds=cache_ttl_seconds)
        self.data_root = Path(
            data_root
            or os.getenv("RULEGPT_LOCAL_RULES_ROOT")
            or r"J:\Enso Intelligence\trdrhub.com\Data"
        )

        self._client = client
        self._owns_client = client is None

    async def aclose(self) -> None:
        """Close the underlying HTTP client if owned by this object."""
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def get_rules(
        self,
        domain: str | None = None,
        jurisdiction: str | None = None,
        document_type: str | None = None,
        limit: int | None = None,
        page: int = 1,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"page": max(1, page)}
        if domain:
            params["domain"] = domain
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        if document_type:
            params["document_type"] = document_type
        if limit is not None:
            params["per_page"] = max(1, limit)

        cache_key = f"rules:{json.dumps(params, sort_keys=True)}"
        try:
            payload = await self._request_json("GET", "/v1/rules", params=params, cache_key=cache_key)
            rules_raw = payload.get("rules") if isinstance(payload, dict) else payload
            if not isinstance(rules_raw, list):
                return []
            rules = [self.normalize_rule(rule) for rule in rules_raw if isinstance(rule, Mapping)]
            return rules[: limit or len(rules)]
        except RulHubClientError:
            return self.load_rules_from_filesystem(
                domain=domain,
                jurisdiction=jurisdiction,
                document_type=document_type,
                limit=limit,
            )

    async def get_rule(self, rule_id: str) -> dict[str, Any]:
        if not rule_id:
            raise RulHubClientError("rule_id is required")
        path = f"/v1/rules/{quote(rule_id, safe='')}"
        try:
            payload = await self._request_json("GET", path, cache_key=f"rule:{rule_id}")
            if not isinstance(payload, Mapping):
                raise RulHubClientError(f"Invalid rule payload returned for rule_id={rule_id}")
            return self.normalize_rule(payload)
        except RulHubClientError:
            local = self._find_local_rule(rule_id)
            if local is not None:
                return local
            raise

    async def get_all_rulesets(self) -> list[dict[str, Any]]:
        try:
            payload = await self._request_json("GET", "/v1/rulesets", cache_key="rulesets")
            rulesets_raw = payload.get("rulesets") if isinstance(payload, dict) else payload
            if not isinstance(rulesets_raw, list):
                return []
            normalized: list[dict[str, Any]] = []
            for item in rulesets_raw:
                if not isinstance(item, Mapping):
                    continue
                normalized.append(
                    {
                        "ruleset_key": item.get("ruleset_key") or item.get("name") or item.get("id"),
                        "rulebook_version": item.get("rulebook_version") or item.get("version"),
                        "jurisdiction": item.get("jurisdiction"),
                        "default_document_type": item.get("default_document_type"),
                        "rule_count": item.get("rule_count"),
                        "checksum": item.get("checksum"),
                        "active": item.get("active"),
                        "raw": dict(item),
                    }
                )
            return normalized
        except RulHubClientError:
            return self._local_rulesets_summary()

    async def get_intelligence(
        self,
        domain: str,
        jurisdiction: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Fetch intelligence packs (procedural, explainability, governance) for a domain."""
        params: dict[str, Any] = {"domain": domain, "limit": min(max(1, limit), 50)}
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        cache_key = f"intelligence:{json.dumps(params, sort_keys=True)}"
        try:
            payload = await self._request_json("GET", "/v1/rules/intelligence", params=params, cache_key=cache_key)
            packs = payload.get("packs") if isinstance(payload, dict) else []
            if not isinstance(packs, list):
                return []
            return [self.normalize_rule(p) for p in packs if isinstance(p, Mapping)]
        except RulHubClientError:
            return []

    async def search_rules(
        self,
        query: str,
        filters: Mapping[str, Any] | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Semantic search via RulHub POST /v1/rules/search.

        Falls back to local text matching if the API is unavailable.
        """
        if not query or not query.strip():
            return []

        body: dict[str, Any] = {"query": query.strip(), "limit": min(max(1, limit), 50)}
        if filters:
            if filters.get("domain"):
                body["domain"] = filters["domain"]
            if filters.get("jurisdiction"):
                body["jurisdiction"] = filters["jurisdiction"]

        cache_key = f"search:{json.dumps(body, sort_keys=True)}"
        try:
            payload = await self._request_json(
                "POST", "/v1/rules/search", json_body=body, cache_key=cache_key,
            )
            results_raw = payload.get("results") if isinstance(payload, dict) else []
            if not isinstance(results_raw, list):
                return []
            return [self.normalize_rule(r) for r in results_raw if isinstance(r, Mapping)]
        except RulHubClientError:
            # Fall back to old client-side search
            return await self._search_rules_local(query, filters, limit)

    async def _search_rules_local(
        self, query: str, filters: Mapping[str, Any] | None = None, limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Fallback: filter + local text ranking when API search is unavailable."""
        filters = filters or {}
        domain = _to_str(filters.get("domain"))
        jurisdiction = _to_str(filters.get("jurisdiction"))
        document_type = _to_str(filters.get("document_type"))

        collected: list[dict[str, Any]] = []
        for page in range(1, 1 + self.max_search_pages):
            page_rules = await self.get_rules(
                domain=domain, jurisdiction=jurisdiction, document_type=document_type,
                limit=50, page=page,
            )
            if not page_rules:
                break
            collected.extend(page_rules)
            if len(page_rules) < 50:
                break

        normalized_query = query.strip().lower()
        scored = [(s, r) for r in collected if (s := _score_rule_for_query(r, normalized_query)) > 0]
        scored.sort(key=lambda item: item[0], reverse=True)
        return [r for _, r in scored[:limit]]

    def list_local_rule_files(self) -> list[Path]:
        """Return JSON files discovered in the configured local rule root."""
        if not self.data_root.exists():
            return []
        return sorted(path for path in self.data_root.rglob("*.json") if path.is_file())

    def load_rules_from_filesystem(
        self,
        domain: str | None = None,
        jurisdiction: str | None = None,
        document_type: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """
        Read rule files from local storage as API fallback/bootstrap source.

        Supports mixed shapes:
        - list[rule]
        - {"rules": [...]}
        - single-rule object
        """
        files = self.list_local_rule_files()
        rules: list[dict[str, Any]] = []
        domain_l = (domain or "").lower()
        jurisdiction_l = (jurisdiction or "").lower()
        document_type_l = (document_type or "").lower()

        for file_path in files:
            raw = _read_json_file(file_path)
            for rule_raw in _extract_rules(raw):
                normalized = self.normalize_rule(rule_raw, source_hint=str(file_path))
                if domain_l and normalized.get("domain", "").lower() != domain_l:
                    continue
                if jurisdiction_l and normalized.get("jurisdiction", "").lower() != jurisdiction_l:
                    continue
                if document_type_l and normalized.get("document_type", "").lower() != document_type_l:
                    continue
                rules.append(normalized)
                if limit is not None and len(rules) >= max(1, limit):
                    return rules
        return rules

    def _find_local_rule(self, rule_id: str) -> dict[str, Any] | None:
        target = rule_id.strip().lower()
        if not target:
            return None
        for rule in self.load_rules_from_filesystem(limit=None):
            if str(rule.get("rule_id") or "").strip().lower() == target:
                return rule
        return None

    def _local_rulesets_summary(self) -> list[dict[str, Any]]:
        summaries: dict[str, dict[str, Any]] = {}
        for file_path in self.list_local_rule_files():
            rules = _extract_rules(_read_json_file(file_path))
            if not rules:
                continue
            key = file_path.stem
            entry = summaries.setdefault(
                key,
                {
                    "ruleset_key": key,
                    "rulebook_version": None,
                    "jurisdiction": None,
                    "default_document_type": None,
                    "rule_count": 0,
                    "checksum": None,
                    "active": True,
                    "raw": {"path": str(file_path)},
                },
            )
            entry["rule_count"] += len(rules)
        return list(summaries.values())

    async def _request_json(
        self,
        method: str,
        path: str,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
        cache_key: str | None = None,
    ) -> Any:
        if cache_key:
            cached = self._cache.get(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}{path}"
        client = self._get_or_create_client()
        headers: dict[str, str] = {"Accept": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key

        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=dict(json_body) if json_body else None,
                    headers=headers,
                    timeout=self.timeout_seconds,
                )
                if response.status_code in self.RETRYABLE_STATUS_CODES:
                    raise _TransientHTTPError(
                        f"RulHub returned retryable status {response.status_code} for {method} {path}"
                    )
                response.raise_for_status()
                payload = response.json()
                if cache_key:
                    self._cache.set(cache_key, payload)
                return payload
            except (_TransientHTTPError, httpx.TimeoutException, httpx.TransportError) as exc:
                last_error = exc
                if attempt >= self.max_retries:
                    break
                await asyncio.sleep(self.backoff_seconds * (2 ** (attempt - 1)))
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                body_preview = exc.response.text[:500]
                raise RulHubClientError(
                    f"RulHub request failed with status {status_code} for {method} {path}: {body_preview}"
                ) from exc
            except ValueError as exc:
                raise RulHubClientError(f"RulHub response was not valid JSON for {method} {path}") from exc

        raise RulHubClientError(
            f"RulHub request failed after {self.max_retries} attempts for {method} {path}: {last_error}"
        ) from last_error

    def _get_or_create_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient()
            self._owns_client = True
        return self._client

    def normalize_rule(self, raw: Mapping[str, Any], source_hint: str | None = None) -> dict[str, Any]:
        """Normalize mixed rule schemas into a stable structure."""
        text = _first_str(raw, "text", "description", "summary", "details", "narrative")
        condition = raw.get("condition")
        conditions = raw.get("conditions")
        if condition is None and conditions is not None:
            condition = conditions
        if conditions is None and condition is not None:
            conditions = condition

        source = _first_str(raw, "source", "rulebook", "framework", default="unknown")
        rulebook = _infer_rulebook(raw, source=source, source_hint=source_hint)
        domain = _canonicalize_domain(
            _first_str(raw, "domain", default=_infer_domain(raw, source=source, source_hint=source_hint))
        )
        jurisdiction = _first_str(raw, "jurisdiction", "country", "country_code", "region", default="global")
        document_type = _first_str(raw, "document_type", "documentType", "doc_type", default=_infer_document_type(raw))
        tags = _normalize_tags(raw.get("tags"))

        normalized = {
            "id": raw.get("id") or raw.get("rule_id"),
            "rule_id": _first_str(raw, "rule_id", "ruleId", "id", "code"),
            "source": source,
            "rulebook": rulebook,
            "article": _first_str(raw, "article", "paragraph"),
            "title": _first_str(raw, "title", "name"),
            "reference": _first_str(raw, "reference", "ref", "citation"),
            "version": _first_str(raw, "version", "revision", default="unspecified"),
            "domain": domain,
            "jurisdiction": jurisdiction,
            "document_type": document_type,
            "text": text,
            "description": text,
            "condition": condition,
            "conditions": conditions,
            "expected_outcome": raw.get("expected_outcome") or raw.get("expectedOutcome") or raw.get("outcome"),
            "tags": tags,
            "severity": _first_str(raw, "severity", "risk_level", default="medium"),
            "deterministic": bool(raw.get("deterministic", True)),
            "requires_llm": bool(raw.get("requires_llm", False)),
            "examples": raw.get("examples"),
            "extra": _extract_extra(raw),
            "source_hint": source_hint,
        }
        return normalized


def _read_json_file(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None


def _extract_rules(payload: Any) -> list[Mapping[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, Mapping)]
    if isinstance(payload, Mapping):
        rules = payload.get("rules")
        if isinstance(rules, list):
            return [item for item in rules if isinstance(item, Mapping)]
        return [payload]
    return []


def _to_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _to_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_tags(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


def _canonicalize_domain(value: str | None) -> str:
    text = (value or "").strip().lower()
    if not text:
        return "other"
    if text.startswith("sanctions"):
        return "sanctions"
    if text.startswith("fta"):
        return "fta"
    if text.startswith("bank"):
        return "bank_specific"
    if text.startswith("customs") or text.startswith("hs"):
        return "customs"
    if text.startswith("icc") or text.startswith("ucp") or text.startswith("isbp") or text.startswith("incoterms"):
        return "icc"
    return text


def _first_str(data: Mapping[str, Any], *keys: str, default: str | None = None) -> str | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return default


def _infer_rulebook(raw: Mapping[str, Any], source: str, source_hint: str | None = None) -> str:
    direct = _first_str(raw, "rulebook", "source", "framework")
    if direct and direct.lower() != "unknown":
        return direct

    probe = " ".join(
        str(value).lower()
        for value in [
            source_hint or "",
            raw.get("domain"),
            raw.get("rule_id"),
            raw.get("reference"),
            raw.get("title"),
            raw.get("bank_name"),
        ]
        if value is not None
    )
    if "ofac" in probe:
        return "OFAC"
    if "eu" in probe and "sanction" in probe:
        return "EU Sanctions"
    if "un" in probe and "sanction" in probe:
        return "UN Sanctions"
    if "uk" in probe and "sanction" in probe:
        return "UK Sanctions"
    if "rcep" in probe:
        return "RCEP"
    if "cptpp" in probe:
        return "CPTPP"
    if "usmca" in probe:
        return "USMCA"
    if "hdfc" in probe:
        return "HDFC Bank"
    if "hsbc" in probe:
        return "HSBC"
    if "citibank" in probe or "citi" in probe:
        return "Citibank"
    if "icbc" in probe:
        return "ICBC"
    if "jpm" in probe or "jpmorgan" in probe:
        return "JPMorgan"
    if "ucp600" in probe:
        return "UCP600"
    if "isbp745" in probe or "isbp" in probe:
        return "ISBP745"
    if "incoterms" in probe:
        return "Incoterms 2020"
    return source


def _infer_domain(raw: Mapping[str, Any], source: str, source_hint: str | None = None) -> str:
    text_blob = " ".join(
        str(value).lower()
        for value in [
            source,
            source_hint or "",
            raw.get("sanctions_type"),
            raw.get("origin_criteria"),
            raw.get("bank_name"),
            raw.get("swift_code"),
            raw.get("title"),
            raw.get("reference"),
        ]
        if value is not None
    )
    tokens = set(re.findall(r"[a-z0-9_]+", text_blob))
    if any(token in tokens for token in ["ofac", "sanction", "sanctions", "embargo"]):
        return "sanctions"
    if any(token in tokens for token in ["rcep", "cptpp", "usmca", "fta", "origin_criteria"]):
        return "fta"
    if any(token in tokens for token in ["bank", "bank_profiles", "swift", "mt700"]):
        return "bank_specific"
    if any(token in tokens for token in ["ucp600", "ucp", "isbp745", "isbp", "icc", "incoterms", "urdg758", "urdg", "urc522", "urc"]):
        return "icc"
    return "other"


def _infer_document_type(raw: Mapping[str, Any]) -> str:
    text_blob = " ".join(
        str(value).lower()
        for value in [raw.get("title"), raw.get("reference"), raw.get("text"), raw.get("description")]
        if value is not None
    )
    if "bill of lading" in text_blob or "b/l" in text_blob:
        return "bill_of_lading"
    if "invoice" in text_blob:
        return "invoice"
    if "certificate" in text_blob:
        return "certificate"
    if "letter of credit" in text_blob or "lc " in text_blob:
        return "lc"
    return "other"


def _extract_extra(raw: Mapping[str, Any]) -> dict[str, Any]:
    known = {
        "id",
        "rule_id",
        "ruleId",
        "source",
        "rulebook",
        "framework",
        "article",
        "paragraph",
        "title",
        "name",
        "reference",
        "ref",
        "citation",
        "version",
        "revision",
        "domain",
        "jurisdiction",
        "country",
        "country_code",
        "region",
        "document_type",
        "documentType",
        "doc_type",
        "text",
        "description",
        "summary",
        "details",
        "narrative",
        "condition",
        "conditions",
        "expected_outcome",
        "expectedOutcome",
        "outcome",
        "tags",
        "severity",
        "risk_level",
        "deterministic",
        "requires_llm",
        "examples",
    }
    return {key: value for key, value in raw.items() if key not in known}


def _score_rule_for_query(rule: Mapping[str, Any], query: str) -> int:
    fields = {
        "rule_id": str(rule.get("rule_id") or "").lower(),
        "title": str(rule.get("title") or "").lower(),
        "reference": str(rule.get("reference") or "").lower(),
        "text": str(rule.get("text") or "").lower(),
        "tags": " ".join(str(tag).lower() for tag in rule.get("tags", []) if isinstance(tag, str)),
    }
    score = 0
    if query in fields["rule_id"]:
        score += 6
    if query in fields["title"]:
        score += 4
    if query in fields["reference"]:
        score += 3
    if query in fields["tags"]:
        score += 2
    if query in fields["text"]:
        score += 1
    return score


_DEFAULT_CLIENT: RulHubClient | None = None


def get_rulhub_client() -> RulHubClient:
    global _DEFAULT_CLIENT
    if _DEFAULT_CLIENT is None:
        _DEFAULT_CLIENT = RulHubClient()
    return _DEFAULT_CLIENT
