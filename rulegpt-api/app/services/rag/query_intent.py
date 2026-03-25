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
