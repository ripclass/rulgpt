"""Query classifier for the RuleGPT RAG pipeline."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, Optional

from .models import ClassifierOutput

_DOMAIN_KEYWORDS = {
    "icc": (
        "ucp", "isbp", "isp98", "urdg", "urc", "urr725", "incoterms", "eucp",
        "trade finance", "letter of credit", "documentary credit", "standby",
        "guarantee", "collection", "reimbursement", "transport document",
        "bill of lading", "presentation", "discrepancy", "amendment",
        "transferable credit", "deferred payment", "acceptance", "negotiation",
        "commodity", "shipment", "insurance certificate", "packing list",
    ),
    "fta": (
        "fta", "rcep", "cptpp", "usmca", "afcfta", "asean",
        "rules of origin", "origin criteria", "tariff preference",
        "preferential tariff", "country pair", "cumulation",
        "certificate of origin", "proof of origin", "de minimis",
    ),
    "sanctions": (
        "sanction", "ofac", "embargo", "sdn", "restricted party",
        "eu sanctions", "uk sanctions", "un sanctions",
        "tbml", "trade based money laundering", "money laundering",
        "vessel screening", "dual-use", "dual use", "export control",
        "red flag", "suspicious", "underpricing", "overpricing",
    ),
    "customs": (
        "customs", "import license", "export license", "duty", "clearance",
        "hs code", "hs classification", "classification", "tariff code",
        "customs valuation", "temporary import", "bonded warehouse",
    ),
    "bank_specific": (
        "bank requirement", "swift code", "issuing bank", "confirming bank",
        "advising bank", "nominated bank", "reimbursing bank",
        "mt700", "mt760", "swift message",
    ),
}

_DOC_TYPE_KEYWORDS = {
    "lc": ("lc", "letter of credit", "documentary credit"),
    "bill_of_lading": ("bill of lading", "b/l", "bl ", "transport document", "waybill"),
    "invoice": ("invoice", "commercial invoice"),
    "certificate": ("certificate", "coo", "certificate of origin"),
    "insurance": ("insurance", "insurance certificate", "insurance document"),
    "guarantee": ("guarantee", "demand guarantee", "urdg"),
    "standby_lc": ("standby", "sblc", "isp98"),
    "collection": ("collection", "urc522", "d/p", "d/a"),
}

_COUNTRY_ALIASES = {
    "bd": ("bangladesh", "dhaka", "bgmea"),
    "in": ("india", "rbi "),
    "us": ("united states", "usa", "us "),
    "ae": ("uae", "united arab emirates", "dubai"),
    "uk": ("united kingdom", "uk "),
    "eu": ("european union", "eu "),
    "sg": ("singapore",),
    "cn": ("china", "chinese"),
    "sa": ("saudi", "saudi arabia"),
    "ir": ("iran",),
    "de": ("germany", "german"),
    "jp": ("japan", "japanese"),
    "kr": ("korea", "korean"),
    "vn": ("vietnam", "vietnamese"),
    "th": ("thailand", "thai"),
    "my": ("malaysia", "malaysian"),
    "id": ("indonesia", "indonesian"),
    "ph": ("philippines", "filipino"),
    "pk": ("pakistan", "pakistani"),
    "ng": ("nigeria", "nigerian"),
    "ke": ("kenya", "kenyan"),
    "eg": ("egypt", "egyptian"),
    "za": ("south africa",),
    "au": ("australia", "australian"),
    "nz": ("new zealand",),
    "br": ("brazil", "brazilian"),
    "mx": ("mexico", "mexican"),
    "tr": ("turkey", "turkish"),
    "hk": ("hong kong",),
    "tw": ("taiwan",),
    "ca": ("canada", "canadian"),
    "gh": ("ghana", "ghanaian"),
    "kh": ("cambodia", "cambodian"),
    "lk": ("sri lanka",),
    "et": ("ethiopia", "ethiopian"),
    "fr": ("france", "french"),
    "nl": ("netherlands", "dutch"),
    "it": ("italy", "italian"),
    "es": ("spain", "spanish"),
    "qa": ("qatar",),
    "kw": ("kuwait",),
    "bh": ("bahrain",),
    "om": ("oman",),
    "jo": ("jordan",),
}

_OUT_OF_SCOPE_MARKERS = (
    "bitcoin",
    "crypto price",
    "tax return",
    "file my taxes",
    "file taxes",
    "income tax filing",
    "movie",
    "sports",
    "recipe",
    "dating",
)

_TRADE_TAX_CONTEXT_MARKERS = (
    "import",
    "export",
    "customs",
    "tariff",
    "duty",
    "vat",
    "trade",
    "shipment",
    "consignment",
    "origin",
)

_CLASSIFIER_SYSTEM_PROMPT = """Classify this trade finance compliance query.
Return JSON only with these keys:
- domain: one of icc, fta, sanctions, customs, bank_specific, other
- jurisdiction: lowercase country code or global
- document_type: one of lc, bill_of_lading, invoice, certificate, other
- commodity: string or null
- complexity: one of simple, interpretation, complex
- in_scope: boolean
- reason: short string

Mark out-of-scope for general business law, accounting, crypto, tax, sports, recipes, and unrelated topics.
Never return prose outside JSON."""


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


def _pick_domain(query: str) -> str:
    lowered = query.lower()
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return domain
    return "other"


def _pick_document_type(query: str) -> str:
    lowered = query.lower()
    for doc_type, keywords in _DOC_TYPE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return doc_type
    return "other"


def _pick_jurisdiction(query: str) -> str:
    lowered = query.lower() + " "
    for code, aliases in _COUNTRY_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return code
    return "global"


def _pick_complexity(query: str) -> str:
    lowered = query.lower()
    if any(token in lowered for token in ("tbml", "fraud", "multi-jurisdiction", "multiple jurisdictions")):
        return "complex"
    if len(re.findall(r"\band\b|\bor\b|\bdifference\b|\bcompare\b", lowered)) >= 2:
        return "interpretation"
    if len(lowered) > 300:
        return "interpretation"
    return "simple"


def _pick_commodity(query: str) -> Optional[str]:
    lowered = query.lower()
    for commodity in (
        "garment", "textile", "shirt", "fabric", "cotton", "apparel",
        "electronics", "semiconductor", "machinery",
        "agriculture", "grain", "rice", "wheat", "coffee", "tea",
        "steel", "metal", "aluminum", "copper",
        "oil", "crude", "petroleum", "lng", "gas",
        "food", "seafood", "shrimp", "fish", "frozen",
        "timber", "wood", "furniture", "lumber",
        "pharma", "pharmaceutical", "medicine",
        "chemical", "fertilizer",
        "vehicle", "auto", "automotive",
    ):
        if commodity in lowered:
            return commodity
    return None


def _heuristic_classify(query: str) -> ClassifierOutput:
    lowered = query.lower()
    in_scope = not any(marker in lowered for marker in _OUT_OF_SCOPE_MARKERS)
    if in_scope and "tax" in lowered and not any(marker in lowered for marker in _TRADE_TAX_CONTEXT_MARKERS):
        in_scope = False
    return ClassifierOutput(
        domain=_pick_domain(query),
        jurisdiction=_pick_jurisdiction(query),
        document_type=_pick_document_type(query),
        commodity=_pick_commodity(query),
        complexity=_pick_complexity(query),  # type: ignore[arg-type]
        in_scope=in_scope,
        reason="heuristic" if in_scope else "Query appears outside trade finance compliance scope.",
    )


def _reconcile_llm_output(query: str, llm_output: ClassifierOutput) -> ClassifierOutput:
    heuristic = _heuristic_classify(query)

    if not llm_output.in_scope and heuristic.in_scope and heuristic.domain != "other":
        heuristic.reason = "heuristic_scope_override"
        return heuristic

    if llm_output.in_scope and llm_output.domain == "other" and heuristic.domain != "other":
        llm_output.domain = heuristic.domain
        if llm_output.document_type == "other" and heuristic.document_type != "other":
            llm_output.document_type = heuristic.document_type
        if llm_output.jurisdiction == "global" and heuristic.jurisdiction != "global":
            llm_output.jurisdiction = heuristic.jurisdiction
        if llm_output.commodity is None and heuristic.commodity is not None:
            llm_output.commodity = heuristic.commodity
        llm_output.reason = "llm_domain_reconciled"

    return llm_output


def _parse_classifier_payload(payload: Any) -> Optional[Dict[str, Any]]:
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, str):
        return None
    text = payload.strip()
    if not text:
        return None
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE | re.DOTALL).strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            return None
        try:
            parsed = json.loads(match.group(0))
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


class QueryClassifier:
    """Classifier with Anthropic primary and heuristic fallback."""

    def __init__(self, anthropic_client: Optional[Any] = None) -> None:
        self.anthropic_client = anthropic_client

    async def _get_client(self) -> Optional[Any]:
        if self.anthropic_client is not None:
            return self.anthropic_client
        try:
            from app.services.integrations.anthropic_client import AnthropicClient  # type: ignore

            self.anthropic_client = AnthropicClient()
            return self.anthropic_client
        except Exception:
            return None

    async def _classify_with_llm(self, client: Any, query: str) -> Optional[ClassifierOutput]:
        payload: Optional[Dict[str, Any]] = None
        if hasattr(client, "classify_query"):
            payload = await _maybe_await(client.classify_query(query=query))
        elif hasattr(client, "classify"):
            raw = await _maybe_await(
                client.classify(
                    query=query,
                    system_prompt=_CLASSIFIER_SYSTEM_PROMPT,
                    max_tokens=256,
                    temperature=0.0,
                )
            )
            payload = _parse_classifier_payload(raw)
        if not isinstance(payload, dict):
            return None
        return ClassifierOutput(
            domain=str(payload.get("domain", "other")).lower(),
            jurisdiction=str(payload.get("jurisdiction", "global")).lower(),
            document_type=str(payload.get("document_type", "other")).lower(),
            commodity=(str(payload["commodity"]) if payload.get("commodity") else None),
            complexity=str(payload.get("complexity", "simple")).lower(),  # type: ignore[arg-type]
            in_scope=bool(payload.get("in_scope", True)),
            reason=(str(payload["reason"]) if payload.get("reason") else None),
        )

    async def classify(self, query: str) -> ClassifierOutput:
        client = await self._get_client()
        if client is not None:
            try:
                llm_output = await self._classify_with_llm(client, query)
                if llm_output is not None:
                    return _reconcile_llm_output(query, llm_output)
            except Exception:
                pass
        return _heuristic_classify(query)
