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



# ---------------------------------------------------------------------------
# Citation label formatting (raw RulHub slugs -> clean display labels)
# ---------------------------------------------------------------------------

import pytest
from app.services.rag.citations import format_citation_display


def _rule(rule_id, rulebook, reference):
    return RetrievedRule(
        rule_id=rule_id, rulebook=rulebook, reference=reference, title="t",
        excerpt="x", similarity_score=0.8, rerank_score=0.8,
    )


@pytest.mark.parametrize("rulebook,reference,rule_id,expect", [
    # (publication, reference) — real RulHub slugs from live queries
    ("icc_core.urdg758_demand_guarantee_depth_2a_r115",
     "ICC-URDG758-ART14-18-PRESENTATION-DEMAND-SUPPORTING-STATEMENT-001",
     "ICC-URDG758-ART14-18-PRESENTATION-DEMAND-SUPPORTING-STATEMENT-001",
     ("URDG 758", "Art. 14-18")),
    ("icc_core.lco_ucp600_letter_rules_v1", "Article 27", "ucp600-27", ("UCP 600", "Art. 27")),
    ("icc_core.lco_isbp821_letter_rules_v1", "Article C1", "isbp821-c1", ("ISBP 821", "Para. C1")),
    ("icc_core.ucp600_transport_articles_depth_2a_r117",
     "ICC-UCP600-ART23-AIR-TRANSPORT-DOCUMENT-001", "ICC-UCP600-ART23-AIR-TRANSPORT-DOCUMENT-001",
     ("UCP 600", "Art. 23")),
    ("exceptions.exc_ucp600_article16_refusal_notice", "EXC-ART16-007", "EXC-ART16-007",
     ("UCP 600", "Art. 16")),
    ("m13.eudr", "eudr#Art-29~r1", "eudr#Art-29~r1", ("EUDR", "Art. 29")),
    ("icc_core.model_forms_guarantee_lc_2a", "Article ICC Publication 800B", "mf-800b",
     ("ICC Model Forms", "Pub. 800B")),
    ("icc_core.docdex_decisions_2a", "Article DOCDEX Decisions 401, 415, 388, 397", "docdex-401",
     ("ICC DOCDEX", "Decision 401")),
    ("icc_core.isdgp_demand_guarantee_2a", "Article ISDGP Para. 80-120; URDG Art. 19", "isdgp-80",
     ("ISDGP", "Para. 80-120")),
    ("fta.fta_rcep_origin", "RCEP-COO-001", "RCEP-COO-001", ("RCEP", None)),  # ref fallback: non-empty
])
def test_format_citation_display(rulebook, reference, rule_id, expect):
    pub, ref = format_citation_display(_rule(rule_id, rulebook, reference))
    assert pub == expect[0]
    if expect[1] is not None:
        assert ref == expect[1]
    assert ref, "reference must never be empty (validate_citations requires it)"


def test_build_citations_uses_clean_labels():
    rules = [_rule("ICC-URDG758-ART14-18-X-001",
                   "icc_core.urdg758_demand_guarantee_depth_2a_r115",
                   "ICC-URDG758-ART14-18-X-001")]
    citations = build_citations("A complying demand under URDG 758...", rules)
    assert citations[0].rulebook == "URDG 758"
    assert citations[0].reference == "Art. 14-18"
    # rule_id (the validation key) is untouched, so validation still passes.
    assert citations[0].rule_id == "ICC-URDG758-ART14-18-X-001"
    assert validate_citations(citations, rules) is True


def test_internal_machinery_buckets_are_not_cited():
    rules = [
        _rule("EVAPI-VD-002", "events.ev_validate_document_output_contract", "EVAPI-VD-002"),
        _rule("DQ-INCOMP-002", "data_quality.dq_incomplete_document_set", "DQ-INCOMP-002"),
        _rule("ICC-UCP600-ART14-001", "icc_core.lco_ucp600_letter_rules_v1", "Article 14"),
    ]
    citations = build_citations("Under UCP 600 Article 14 the bank examines documents.", rules)
    labels = {(c.rulebook, c.reference) for c in citations}
    # Only the real ICC rule survives; the events/data_quality rows are dropped.
    assert ("UCP 600", "Art. 14") in labels
    assert all(not c.rule_id.startswith(("EVAPI-", "DQ-")) for c in citations)
    assert len(citations) == 1
