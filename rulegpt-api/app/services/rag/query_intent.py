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


def requires_document_breadth(query: str) -> bool:
    lowered = _normalize(query)
    if any(marker in lowered for marker in _DOCUMENT_BREADTH_MARKERS):
        return True
    if any(token in lowered for token in ("cif", "cip")) and any(
        token in lowered for token in ("document", "documents", "shipment", "lc", "letter of credit")
    ):
        return True
    if "documents" in lowered and any(token in lowered for token in ("required", "need", "needed", "checklist", "set", "package")):
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
    lowered = _normalize(query)
    families: set[str] = set()

    if requires_document_breadth(query):
        families.update({"invoice", "transport"})
        if any(token in lowered for token in ("cif", "cip", "insurance")):
            families.add("insurance")

    if "invoice" in lowered:
        families.add("invoice")
    if any(token in lowered for token in ("bill of lading", "b/l", "bl ", "transport document")):
        families.add("transport")
    if any(token in lowered for token in ("insurance", "policy", "certificate of insurance")):
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
