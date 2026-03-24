from __future__ import annotations

from app.services.rag.embedder import build_embedding_content, normalize_rule_record


def test_normalize_icc_shape():
    record = {
        "source": "ucp600",
        "rule_id": "UCP600_14D",
        "article": "14(d)",
        "title": "Transport document consistency",
        "reference": "UCP600 Article 14(d)",
        "version": "2020",
        "text": "Data in documents must not conflict.",
        "condition": {"field": "bl", "operator": "exists"},
        "expected_outcome": {"valid": ["ok"], "invalid": ["not ok"]},
        "tags": ["icc", "lc"],
        "deterministic": True,
        "requires_llm": False,
        "severity": "high",
    }
    normalized = normalize_rule_record(record, source_hint="icc_core/ucp600.json")
    assert normalized.rule_id == "UCP600_14D"
    assert normalized.rulebook == "UCP600"
    assert normalized.domain == "icc"
    assert normalized.document_type == "lc"
    assert normalized.description == "Data in documents must not conflict."
    assert normalized.conditions


def test_normalize_fta_shape_with_description_and_conditions():
    record = {
        "rule_id": "RCEP_ORIGIN_1",
        "description": "Wholly obtained rule for garments.",
        "conditions": [{"origin_criteria": "WO"}],
        "members": ["BD", "JP"],
        "origin_criteria": "WO",
        "calculation": {"method": "regional_value_content"},
        "tags": ["fta", "rcep"],
    }
    normalized = normalize_rule_record(record, source_hint="fta_origin/fta_rcep_origin.json")
    assert normalized.rulebook == "RCEP"
    assert normalized.domain == "fta"
    assert normalized.jurisdiction in ("regional", "global")
    assert "origin_criteria" in normalized.metadata
    assert normalized.description == "Wholly obtained rule for garments."


def test_normalize_bank_profile_shape():
    record = {
        "id": "bank_hdfc_001",
        "bank_name": "HDFC Bank",
        "swift_code": "HDFCINBBXXX",
        "trade_finance_characteristics": "Strict document matching on BL and invoice",
        "description": "HDFC LC profile guidance",
        "conditions": [{"document": "BL", "required": True}],
    }
    normalized = normalize_rule_record(record, source_hint="bank_profiles/hdfc.json")
    assert normalized.rule_id == "bank_hdfc_001"
    assert normalized.domain == "bank_specific"
    assert "bank_profile" in normalized.tags
    content = build_embedding_content(normalized)
    assert "HDFC" in content or "hdfc" in content.lower()

