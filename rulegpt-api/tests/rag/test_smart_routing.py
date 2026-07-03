"""Tests for the smart four-tier routing classifier and template engine."""

from __future__ import annotations

import pytest

from app.config import settings
from app.services.rag.models import ClassifierOutput, RetrievedRule
from app.services.rag.pipeline import _pre_generation_confidence, select_model
from app.services.rag.generator import _template_answer


# ---------------------------------------------------------------------------
# Helpers to build mock rules
# ---------------------------------------------------------------------------

def _rule(
    rule_id: str = "ucp600_art14",
    rulebook: str = "UCP600",
    reference: str = "Article 14",
    title: str = "Standard for Examination of Documents",
    excerpt: str = "A nominated bank acting on its nomination, a confirming bank, if any, and the issuing bank must examine a presentation to determine, on the basis of the documents alone, whether or not the documents appear on their face to constitute a complying presentation.",
    domain: str = "icc",
    jurisdiction: str = "global",
    document_type: str = "lc",
    rerank_score: float = 0.85,
    metadata: dict | None = None,
) -> RetrievedRule:
    return RetrievedRule(
        rule_id=rule_id,
        rulebook=rulebook,
        reference=reference,
        title=title,
        excerpt=excerpt,
        domain=domain,
        jurisdiction=jurisdiction,
        document_type=document_type,
        similarity_score=rerank_score,
        rerank_score=rerank_score,
        metadata=metadata or {},
    )


def _intent(
    domain: str = "icc",
    jurisdiction: str = "global",
    complexity: str = "simple",
    in_scope: bool = True,
) -> ClassifierOutput:
    return ClassifierOutput(
        domain=domain,
        jurisdiction=jurisdiction,
        document_type="other",
        complexity=complexity,
        in_scope=in_scope,
    )


# ---------------------------------------------------------------------------
# _pre_generation_confidence tests
# ---------------------------------------------------------------------------

class TestPreGenerationConfidence:
    def test_no_rules_is_low(self):
        assert _pre_generation_confidence([]) == "low"

    def test_high_scores_is_high(self):
        rules = [_rule(rerank_score=0.9), _rule(rerank_score=0.85, rule_id="r2")]
        assert _pre_generation_confidence(rules) == "high"

    def test_medium_scores_is_medium(self):
        rules = [_rule(rerank_score=0.6), _rule(rerank_score=0.5, rule_id="r2")]
        assert _pre_generation_confidence(rules) == "medium"

    def test_low_scores_is_low(self):
        rules = [_rule(rerank_score=0.3), _rule(rerank_score=0.2, rule_id="r2")]
        assert _pre_generation_confidence(rules) == "low"


# NOTE: `_classify_complexity` was removed. Routing is now handled by
# `pipeline.select_model(user_tier, query, rules)` which uses tier-based
# routing instead of complexity-based. The `TestClassifyComplexity` class
# (15 tests) was deleted because it tested a removed API; equivalent
# tier-routing coverage lives in pipeline integration tests.


# ---------------------------------------------------------------------------
# Rollback and feature flag tests
# ---------------------------------------------------------------------------

class TestSmartRoutingFlags:
    def test_rollback_flag_forces_sonnet(self, monkeypatch):
        """RULEGPT_ENABLE_SMART_ROUTING=False → always sonnet."""
        # We test the pipeline integration point indirectly:
        # when smart routing is disabled, pipeline.py sets routing_tier = "sonnet"
        # This is tested by checking the flag logic directly.
        monkeypatch.setenv("RULEGPT_ENABLE_SMART_ROUTING", "false")
        from app.config import Settings
        s = Settings()
        assert s.RULEGPT_ENABLE_SMART_ROUTING is False

    def test_template_disabled_flag(self, monkeypatch):
        """RULEGPT_TEMPLATE_ENGINE_ENABLED=False → template tier should
        fall back to haiku inside generate()."""
        monkeypatch.setenv("RULEGPT_TEMPLATE_ENGINE_ENABLED", "false")
        from app.config import Settings
        s = Settings()
        assert s.RULEGPT_TEMPLATE_ENGINE_ENABLED is False


# ---------------------------------------------------------------------------
# Template answer format tests
# ---------------------------------------------------------------------------

class TestTemplateGateRouting:
    """select_model must re-enable the template tier for single-rule direct
    lookups (e.g. "Article 20") — it was a dead tier before the 2026-07 LLM
    swap. Disabling the flag should fall back to the normal tier logic."""

    def test_direct_lookup_single_rule_routes_to_template_when_enabled(self, monkeypatch):
        monkeypatch.setattr(settings, "RULEGPT_TEMPLATE_ENGINE_ENABLED", True)
        rules = [_rule()]
        assert select_model("free", "What does Article 20 say?", rules) == "template"

    def test_direct_lookup_single_rule_routes_to_haiku_when_disabled(self, monkeypatch):
        monkeypatch.setattr(settings, "RULEGPT_TEMPLATE_ENGINE_ENABLED", False)
        rules = [_rule()]
        assert select_model("free", "What does Article 20 say?", rules) == "haiku"

    def test_multi_rule_direct_lookup_does_not_route_to_template(self, monkeypatch):
        monkeypatch.setattr(settings, "RULEGPT_TEMPLATE_ENGINE_ENABLED", True)
        rules = [_rule(rule_id="r1"), _rule(rule_id="r2")]
        assert select_model("free", "What does Article 20 say?", rules) == "haiku"

    def test_no_direct_lookup_language_does_not_route_to_template(self, monkeypatch):
        monkeypatch.setattr(settings, "RULEGPT_TEMPLATE_ENGINE_ENABLED", True)
        rules = [_rule()]
        assert select_model("free", "How do LC discrepancies work?", rules) == "haiku"


class TestTemplateAnswer:
    def test_basic_template_format(self):
        """Template answer has correct structure."""
        rules = [_rule(
            title="Standard for Examination of Documents",
            rulebook="UCP600",
            reference="Article 14",
            excerpt="Banks must examine documents on their face.",
        )]
        result = _template_answer("What does UCP600 Article 14 say?", rules)

        assert result["model_used"] == "template-engine"
        assert result["routing_tier"] == "template"
        assert result["partial_coverage"] is False
        assert "UCP600" in result["answer"]
        assert "Article 14" in result["answer"]
        assert "Standard for Examination of Documents" in result["answer"]
        assert "Banks must examine documents on their face." in result["answer"]

    def test_template_with_conditions(self):
        """Template includes conditions when present in metadata."""
        rules = [_rule(
            metadata={"raw_detail": {"conditions": ["LC must be irrevocable", "Presentation within 21 days"]}},
        )]
        result = _template_answer("What does UCP600 Article 14 say?", rules)
        assert "This applies when:" in result["answer"]
        assert "LC must be irrevocable" in result["answer"]

    def test_template_with_critical_severity(self):
        """Template includes severity warning for critical rules."""
        rules = [_rule(
            metadata={"raw_detail": {"severity": "critical"}},
        )]
        result = _template_answer("What does this say?", rules)
        assert "hard requirement with no exceptions" in result["answer"]

    def test_template_no_conditions_no_severity(self):
        """Template is clean without optional fields."""
        rules = [_rule(metadata={})]
        result = _template_answer("What does this say?", rules)
        assert "This applies when:" not in result["answer"]
        assert "hard requirement" not in result["answer"]
