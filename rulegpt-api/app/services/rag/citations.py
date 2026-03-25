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


def build_citations(answer: str, retrieved_rules: Sequence[RetrievedRule], max_items: int = 8) -> List[Citation]:
    """
    Build citation objects from retrieved rules.

    Current implementation uses retrieval/rerank confidence and ensures output
    is deterministic and bounded even when generation text is not easily parseable.
    """
    lowered_answer = (answer or "").lower()
    mentioned_rules: List[RetrievedRule] = []
    remaining_rules: List[RetrievedRule] = []

    for rule in retrieved_rules:
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
