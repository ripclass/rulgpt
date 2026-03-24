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
    citations: List[Citation] = []
    for rule in retrieved_rules[: max(1, min(max_items, 8))]:
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

