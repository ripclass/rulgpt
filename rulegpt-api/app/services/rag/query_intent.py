"""Shared query-intent helpers for retrieval and answer quality."""

from __future__ import annotations

import re

_DOCUMENT_BREADTH_MARKERS = (
    "what documents are required",
    "which documents are required",
    "documents are required",
    "required documents",
    "documents needed",
    "document set",
    "document package",
    "document checklist",
    "what documents do i need",
)

_PARTIAL_COVERAGE_MARKERS = (
    "partial coverage",
    "part of the",
    "only cover",
    "only covers",
    "do not clearly cover",
    "does not clearly cover",
    "not fully cover",
    "rules are incomplete",
    "retrieved rules are incomplete",
    "i can only confirm part",
)

_COUNTRY_ALIASES: dict[str, tuple[str, ...]] = {
    "bangladesh": ("bangladesh", "bd"),
    "australia": ("australia", "au"),
    "brunei": ("brunei", "bn"),
    "cambodia": ("cambodia", "kh"),
    "china": ("china", "cn"),
    "indonesia": ("indonesia", "id"),
    "japan": ("japan", "jp"),
    "south korea": ("south korea", "korea", "kr"),
    "laos": ("laos", "la"),
    "malaysia": ("malaysia", "my"),
    "myanmar": ("myanmar", "mm"),
    "new zealand": ("new zealand", "nz"),
    "philippines": ("philippines", "ph"),
    "singapore": ("singapore", "sg"),
    "thailand": ("thailand", "th"),
    "vietnam": ("vietnam", "vn"),
    "india": ("india", "in"),
    "uae": ("uae", "united arab emirates", "ae"),
    "iran": ("iran", "ir"),
    "russia": ("russia", "ru"),
    "united states": ("united states", "usa", "us"),
}

_FTA_AGREEMENT_MARKERS: dict[str, tuple[str, ...]] = {
    "rcep": ("rcep",),
    "cptpp": ("cptpp",),
    "usmca": ("usmca",),
    "afcfta": ("afcfta",),
    "mercosur": ("mercosur",),
    "eu_uk_tca": ("eu-uk", "eu uk", "tca"),
    "asean_china": ("asean china", "acfta"),
}


def _normalize(value: str) -> str:
    return " ".join((value or "").lower().split())


def _has_word(word: str, text: str) -> bool:
    """Check if a word appears as a whole word (not as a substring of another word)."""
    return bool(re.search(rf"\b{re.escape(word)}\b", text))


def requires_document_breadth(query: str) -> bool:
    """Detect queries explicitly asking 'what documents do I need?'

    Must be NARROW. Do NOT trigger on questions that merely mention a
    document type (CIF, B/L, invoice) — those are specific compliance
    questions, not document-set requests.
    """
    lowered = _normalize(query)
    # Only trigger on explicit document-set questions
    if any(marker in lowered for marker in _DOCUMENT_BREADTH_MARKERS):
        return True
    # CIF/CIP + explicit document-set language (not just "document" mentions)
    if _has_word("cif", lowered) or _has_word("cip", lowered):
        if any(marker in lowered for marker in ("what documents", "which documents", "documents required", "required documents", "documents needed", "documents do i need")):
            return True
    return False


def extract_fta_agreement(query: str) -> str | None:
    lowered = _normalize(query)
    for agreement, markers in _FTA_AGREEMENT_MARKERS.items():
        if any(marker in lowered for marker in markers):
            return agreement
    return None


def extract_countries(query: str) -> set[str]:
    lowered = f" {_normalize(query)} "
    found: set[str] = set()
    for country, aliases in _COUNTRY_ALIASES.items():
        for alias in aliases:
            token = alias.lower()
            if len(token) <= 2:
                if f" {token} " in lowered:
                    found.add(country)
                    break
            elif token in lowered:
                found.add(country)
                break
    return found


def expected_document_families(query: str) -> set[str]:
    """Return expected document families ONLY for document-breadth queries.

    For non-breadth queries, returns empty set — we don't want to trigger
    partial_coverage assessment just because a user mentioned 'insurance'
    or 'bill of lading' in a specific compliance question.
    """
    if not requires_document_breadth(query):
        return set()

    lowered = _normalize(query)
    families: set[str] = {"invoice", "transport"}
    if _has_word("cif", lowered) or _has_word("cip", lowered) or "insurance" in lowered:
        families.add("insurance")
    return families


def has_partial_coverage_language(text: str) -> bool:
    lowered = _normalize(text)
    return any(marker in lowered for marker in _PARTIAL_COVERAGE_MARKERS)


def asks_for_multi_rule_analysis(query: str) -> bool:
    lowered = _normalize(query)
    if requires_document_breadth(query):
        return True
    conjunctions = re.findall(r"\band\b|\bor\b|\bcompare\b|\bdifference\b", lowered)
    return len(conjunctions) >= 2
