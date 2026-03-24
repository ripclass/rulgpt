from __future__ import annotations

from app.services.rag.citations import build_citations, validate_citations
from app.services.rag.models import RetrievedRule


def test_build_and_validate_citations():
    rules = [
        RetrievedRule(
            rule_id="UCP600_14D",
            rulebook="UCP600",
            reference="Article 14(d)",
            title="Data consistency",
            excerpt="Data in one document must not conflict with another.",
            similarity_score=0.9,
            rerank_score=0.88,
        )
    ]
    citations = build_citations("answer", rules)
    assert len(citations) == 1
    assert citations[0].rule_id == "UCP600_14D"
    assert validate_citations(citations, rules) is True

