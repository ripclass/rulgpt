"""Citation mapping and validation helpers."""

from __future__ import annotations

import re
from typing import Dict, List, Sequence, Tuple

from .models import Citation, RetrievedRule


# --- Human-readable citation labels ------------------------------------------
# RulHub rows carry machine slugs in `rulebook`/`reference`
# (e.g. rulebook="icc_core.urdg758_demand_guarantee_depth_2a_r115",
#  reference="ICC-URDG758-ART14-18-PRESENTATION-DEMAND-SUPPORTING-STATEMENT-001").
# Those are unreadable in the UI. `format_citation_display` maps them to clean
# labels ("URDG 758" / "Art. 14-18"). This is display-only: rule_id stays the
# validation + matching key, so nothing downstream changes.

# Ordered most-specific first (ISBP before UCP so an ISBP slug never matches UCP).
# Each pattern is matched against "<rulebook> <reference> <rule_id>" lowercased.
_PUBLICATION_PATTERNS: Tuple[Tuple[str, str], ...] = (
    (r"isbp[\s._-]?821|isbp[\s._-]?745", "ISBP 821"),
    (r"ucp[\s._-]?600", "UCP 600"),
    (r"eucp", "eUCP 2.1"),
    (r"urdg[\s._-]?758", "URDG 758"),
    (r"urc[\s._-]?522", "URC 522"),
    (r"urr[\s._-]?725", "URR 725"),
    (r"urbpo", "URBPO 750"),
    (r"isp[\s._-]?98", "ISP98"),
    (r"isdgp", "ISDGP"),
    (r"docdex", "ICC DOCDEX"),
    (r"model[\s._-]?forms", "ICC Model Forms"),
    (r"incoterms", "Incoterms 2020"),
    (r"\brcep\b", "RCEP"),
    (r"cptpp", "CPTPP"),
    (r"usmca", "USMCA"),
    (r"\beudr\b", "EUDR"),
    (r"\bcbam\b", "CBAM"),
    (r"\bcsrd\b", "CSRD"),
    (r"sfdr", "SFDR"),
    (r"ofac", "OFAC"),
)

# Publications whose provisions are paragraphs, not articles.
_PARAGRAPH_PUBLICATIONS = {"ISBP 821", "ISDGP"}


def _detect_publication(haystack: str) -> str | None:
    for pattern, name in _PUBLICATION_PATTERNS:
        if re.search(pattern, haystack):
            return name
    return None


def _extract_reference(reference: str, rule_id: str, publication: str | None) -> str:
    """Pull a clean article/paragraph label out of the raw reference or rule_id.

    Priority matters: specific forms (Publication/Decision/Paragraph) are tried
    before the generic article grab, so a messy reference like
    "ISDGP Para. 80-120; URDG Art. 19" resolves to the paragraph, not the
    stray article number."""
    unit = "Para." if publication in _PARAGRAPH_PUBLICATIONS else "Art."

    # Model-forms publication numbers: "ICC Publication 800B".
    m = re.search(r"publication\s+([0-9]+[a-z]?)", reference, re.IGNORECASE)
    if m:
        return f"Pub. {m.group(1)}"

    # DOCDEX decisions: "DOCDEX Decision 401" / "Decisions 401, 415".
    m = re.search(r"decisions?\s+([0-9]+)", reference, re.IGNORECASE)
    if m:
        return f"Decision {m.group(1)}"

    # Numeric paragraph ranges: "Para. 80-120", "ISDGP Para. 80-120".
    m = re.search(r"para(?:graph)?[\s._-]*([0-9]+)(?:\s*[-–]\s*([0-9]+))?", reference, re.IGNORECASE)
    if m:
        rng = f"{m.group(1)}-{m.group(2)}" if m.group(2) else m.group(1)
        return f"Para. {rng}"

    # ISBP-style letter paragraphs: "Article C1", "C1", "L3(b)".
    if publication in _PARAGRAPH_PUBLICATIONS:
        m = re.search(r"\b([A-Z]\d+[a-z]?(?:\([a-z0-9]+\))?)\b", reference)
        if m:
            return f"Para. {m.group(1)}"

    # Range or single article: "ART14-18", "Art-29", "Article 27", "ART26".
    m = re.search(r"art(?:icle)?[\s._-]*(\d+[a-z]?)(?:\s*[-–]\s*(\d+[a-z]?))?", f"{reference} {rule_id}", re.IGNORECASE)
    if m:
        start, end = m.group(1), m.group(2)
        # Only treat the second number as a range end if it's a plausible
        # article (1-2 digits, no leading zero, greater than start). Otherwise
        # it's an instance suffix like "ART16-007" -> Art. 16, not Art. 16-007.
        if end and (end.startswith("0") or len(end) > 2 or (
            start.isdigit() and end.isdigit() and int(end) <= int(start)
        )):
            end = None
        label = f"{start}-{end}" if end else start
        return f"{unit} {label}"

    return ""


def format_citation_display(rule: RetrievedRule) -> Tuple[str, str]:
    """Return (rulebook_label, reference_label) as clean, human-readable text.

    Falls back gracefully: an unmappable publication keeps a tidied rulebook,
    and an unextractable reference keeps the original (never empty, so
    validate_citations still passes)."""
    raw_rulebook = (rule.rulebook or "").strip()
    raw_reference = (rule.reference or "").strip()
    rule_id = (rule.rule_id or "").strip()
    haystack = f"{raw_rulebook} {raw_reference} {rule_id}".lower()

    publication = _detect_publication(haystack)
    reference_label = _extract_reference(raw_reference, rule_id, publication)

    if publication is None:
        # Unknown publication: tidy the rulebook slug (drop namespace prefix and
        # the _depth_2a_rNNN / _vN suffixes) so it at least reads as words.
        tidy = raw_rulebook.split(".")[-1]
        tidy = re.sub(r"_(depth_\d+[a-z]?_r\d+|letter_rules|v\d+|\d+[a-z]?_r\d+)$", "", tidy)
        tidy = tidy.replace("_", " ").strip().title() or raw_rulebook or "Rule"
        publication = tidy

    if not reference_label:
        # Keep the original reference rather than emptying it (validation needs
        # a non-empty reference); only tidy an obviously-sluggy one lightly.
        reference_label = raw_reference or rule_id or "provision"

    return publication, reference_label


def _score_to_confidence(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


# RulHub families that are internal machinery, not user-facing rule citations:
# `events.*` (EVAPI-*) are API execution contracts, `data_quality.*` (DQ-*) are
# data-quality meta rules. They surface from retrieval as noise and should never
# appear as a citation backing a trade-finance answer.
_INTERNAL_RULEBOOK_PREFIXES = ("events.", "data_quality.")
_INTERNAL_REFERENCE_PREFIXES = ("EVAPI-", "DQ-")


def _is_displayable(rule: RetrievedRule) -> bool:
    """Filter out rules that would look broken or don't belong in the citations display."""
    # Empty excerpt means the rule has no text — looks unreliable
    if not (rule.excerpt or "").strip():
        return False
    # "unknown" or "n/a" reference with no excerpt is useless to the user
    ref = (rule.reference or "").strip().lower()
    if ref in ("", "unknown", "n/a", "null") and not (rule.excerpt or "").strip():
        return False
    # Internal machinery buckets are not real citations — drop them.
    rulebook = (rule.rulebook or "").strip().lower()
    if rulebook.startswith(_INTERNAL_RULEBOOK_PREFIXES):
        return False
    if (rule.reference or "").strip().upper().startswith(_INTERNAL_REFERENCE_PREFIXES):
        return False
    return True


def build_citations(answer: str, retrieved_rules: Sequence[RetrievedRule], max_items: int = 8) -> List[Citation]:
    """
    Build citation objects from retrieved rules.

    Filters out rules with empty text or broken references before display.
    """
    lowered_answer = (answer or "").lower()
    mentioned_rules: List[RetrievedRule] = []
    remaining_rules: List[RetrievedRule] = []

    for rule in retrieved_rules:
        if not _is_displayable(rule):
            continue
        reference_token = f"[{rule.rulebook} {rule.reference}]".lower()
        short_token = f"[{rule.reference}]".lower()
        if reference_token in lowered_answer or short_token in lowered_answer:
            mentioned_rules.append(rule)
        else:
            remaining_rules.append(rule)

    citations: List[Citation] = []
    ordered_rules = mentioned_rules + remaining_rules
    for rule in ordered_rules[: max(1, min(max_items, 8))]:
        excerpt = rule.excerpt[:400] if rule.excerpt else ""
        # Matching above uses the raw rule fields; the Citation carries the
        # clean display labels. rule_id (the validation/matching key) is unchanged.
        rulebook_label, reference_label = format_citation_display(rule)
        citations.append(
            Citation(
                rule_id=rule.rule_id,
                rulebook=rulebook_label,
                reference=reference_label,
                excerpt=excerpt,
                confidence=_score_to_confidence(rule.rerank_score),  # type: ignore[arg-type]
            )
        )
    return citations


def validate_citations(citations: Sequence[Citation], retrieved_rules: Sequence[RetrievedRule]) -> bool:
    if not citations:
        return False
    allowed: Dict[str, RetrievedRule] = {rule.rule_id: rule for rule in retrieved_rules}
    for citation in citations:
        if citation.rule_id not in allowed:
            return False
        if not citation.rulebook:
            return False
        if not citation.reference:
            return False
    return True
