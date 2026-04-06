"""Citation mapping and validation helpers."""

from __future__ import annotations

from typing import Dict, List, Sequence

from .models import Citation, RetrievedRule


def _score_to_confidence(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def _is_displayable(rule: RetrievedRule) -> bool:
    """Filter out rules that would look broken in the citations display."""
    # Empty excerpt means the rule has no text — looks unreliable
    if not (rule.excerpt or "").strip():
        return False
    # "unknown" or "n/a" reference with no excerpt is useless to the user
    ref = (rule.reference or "").strip().lower()
    if ref in ("", "unknown", "n/a", "null") and not (rule.excerpt or "").strip():
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
        citations.append(
            Citation(
                rule_id=rule.rule_id,
                rulebook=rule.rulebook,
                reference=rule.reference,
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
