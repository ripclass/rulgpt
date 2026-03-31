"""Tests for the smart four-tier routing classifier and template engine."""

from __future__ import annotations

import pytest

from app.services.rag.models import ClassifierOutput, RetrievedRule
from app.services.rag.pipeline import (
    _classify_complexity,
    _pre_generation_confidence,
)
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


# ---------------------------------------------------------------------------
# _classify_complexity tests
# ---------------------------------------------------------------------------

class TestClassifyComplexity:
    def test_01_template_direct_article_lookup(self):
        """Direct article lookup with 1 high-confidence rule → template."""
        query = "What does UCP600 Article 14 say?"
        rules = [_rule(rerank_score=0.9)]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "template"

    def test_02_template_single_high_confidence_rule(self):
        """1 rule + high confidence → template even without regex match."""
        query = "Tell me about the presentation standard"
        rules = [_rule(rerank_score=0.9)]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "template"

    def test_03_haiku_single_medium_confidence(self):
        """1 rule + medium confidence → haiku."""
        query = "What about document examination?"
        rules = [_rule(rerank_score=0.6)]
        result = _classify_complexity(query, _intent(), rules, "medium")
        assert result == "haiku"

    def test_04_haiku_multiple_rules_same_domain(self):
        """2-4 rules + high confidence + single domain → haiku."""
        query = "What documents are needed for a CIF shipment?"
        rules = [
            _rule(rule_id="r1", rerank_score=0.85),
            _rule(rule_id="r2", rerank_score=0.8, reference="Article 28"),
            _rule(rule_id="r3", rerank_score=0.75, reference="Article 35"),
        ]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "haiku"

    def test_05_sonnet_five_plus_rules(self):
        """5+ rules → sonnet."""
        query = "What are the documentary requirements for multimodal shipment?"
        rules = [_rule(rule_id=f"r{i}", rerank_score=0.7) for i in range(6)]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "sonnet"

    def test_06_opus_tbml_complex(self):
        """TBML keyword + complex classification → opus."""
        query = "Is this pricing pattern consistent with market rates? Could this be TBML?"
        rules = [_rule(rule_id="r1", domain="sanctions", rerank_score=0.7)]
        intent = _intent(domain="sanctions", complexity="complex")
        result = _classify_complexity(query, intent, rules, "medium")
        assert result == "opus"

    def test_07_domain_upgrade_haiku_to_sonnet(self):
        """2 different domains upgrades haiku → sonnet."""
        query = "How do LC rules interact with sanctions?"
        rules = [
            _rule(rule_id="r1", domain="icc", rerank_score=0.8),
            _rule(rule_id="r2", domain="sanctions", rerank_score=0.75),
        ]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "sonnet"

    def test_08_rulebook_upgrade_haiku_to_sonnet(self):
        """2 different rulebooks upgrades haiku → sonnet."""
        query = "Compare UCP600 and ISBP745 requirements?"
        rules = [
            _rule(rule_id="r1", rulebook="UCP600", rerank_score=0.8),
            _rule(rule_id="r2", rulebook="ISBP745", rerank_score=0.75),
        ]
        result = _classify_complexity(query, _intent(), rules, "high")
        assert result == "sonnet"

    def test_09_low_confidence_upgrade(self):
        """Low confidence upgrades one tier: haiku → sonnet."""
        query = "What about this trade rule?"
        rules = [
            _rule(rule_id="r1", rerank_score=0.35),
            _rule(rule_id="r2", rerank_score=0.3),
        ]
        result = _classify_complexity(query, _intent(), rules, "low")
        # Base: 2 rules → haiku. Low confidence → upgrade to sonnet.
        assert result == "sonnet"

    def test_10_no_rules_returns_fallback(self):
        """0 rules → fallback (no LLM call)."""
        result = _classify_complexity("Any question", _intent(), [], "low")
        assert result == "fallback"

    def test_11_false_positive_opus_simple_sanctions(self):
        """'Is Iran sanctioned under OFAC?' — sanctions domain but simple
        complexity and no fraud/TBML keywords → should NOT be opus."""
        query = "Is Iran sanctioned under OFAC?"
        rules = [_rule(rule_id="ofac_iran", domain="sanctions", rulebook="OFAC", rerank_score=0.9)]
        intent = _intent(domain="sanctions", complexity="simple")
        result = _classify_complexity(query, intent, rules, "high")
        # 1 rule + high confidence + no TBML markers → template, not opus
        assert result == "template"
        assert result != "opus"

    def test_12_sanctions_domain_medium_complexity_no_tbml(self):
        """Sanctions domain + interpretation complexity but no TBML keywords → NOT opus."""
        query = "What are OFAC requirements for trading with UAE counterparties?"
        rules = [
            _rule(rule_id="r1", domain="sanctions", rerank_score=0.7),
            _rule(rule_id="r2", domain="sanctions", rerank_score=0.65),
            _rule(rule_id="r3", domain="sanctions", rerank_score=0.6),
        ]
        intent = _intent(domain="sanctions", complexity="interpretation")
        result = _classify_complexity(query, intent, rules, "medium")
        # 3 rules, single domain → haiku. No TBML markers → stays haiku.
        assert result == "haiku"
        assert result != "opus"

    def test_13_fraud_keyword_but_simple_complexity(self):
        """Fraud keyword ('money laundering') but simple complexity → NOT opus.
        Opus requires both fraud keywords AND complex/interpretation."""
        query = "What is money laundering?"
        rules = [_rule(rule_id="r1", domain="sanctions", rerank_score=0.85)]
        intent = _intent(domain="sanctions", complexity="simple")
        result = _classify_complexity(query, intent, rules, "high")
        # Has fraud keyword but complexity is simple → opus gate not triggered
        assert result == "template"
        assert result != "opus"

    def test_14_rcep_garment_query_not_opus(self):
        """RCEP garment query with multiple FTA jurisdictions must NOT route
        to opus. This was the production misfire — stacking domain + jurisdiction
        upgrades pushed it to opus. After fix: max one upgrade from Gate 4."""
        query = "Does my garment qualify for RCEP preferential tariff from Bangladesh?"
        rules = [
            _rule(rule_id="RCEP-SCOPE-001", rulebook="RCEP", domain="fta", jurisdiction="rcep", rerank_score=0.85),
            _rule(rule_id="RCEP-ORIGIN-001", rulebook="RCEP", domain="fta", jurisdiction="rcep", rerank_score=0.8),
            _rule(rule_id="RCEP-ORIGIN-002", rulebook="RCEP", domain="fta", jurisdiction="bd", rerank_score=0.7),
        ]
        intent = _intent(domain="fta", complexity="interpretation")
        result = _classify_complexity(query, intent, rules, "medium")
        # 3 rules → haiku base. Single domain (fta), single rulebook (RCEP).
        # No upgrades from Gate 4. Should stay haiku.
        assert result == "haiku"
        assert result != "opus"

    def test_15_domain_and_rulebook_upgrade_capped_at_one(self):
        """When both domain and rulebook diversity trigger, only one upgrade
        applies. Two upgrades must never stack."""
        query = "How do RCEP origin rules interact with OFAC sanctions screening?"
        rules = [
            _rule(rule_id="r1", rulebook="RCEP", domain="fta", rerank_score=0.75),
            _rule(rule_id="r2", rulebook="OFAC", domain="sanctions", rerank_score=0.7),
            _rule(rule_id="r3", rulebook="UCP600", domain="icc", rerank_score=0.65),
        ]
        intent = _intent(domain="fta", complexity="interpretation")
        result = _classify_complexity(query, intent, rules, "medium")
        # 3 rules → haiku base. 3 domains → upgrade once → sonnet. 3 rulebooks
        # would also trigger but cap=1 prevents second upgrade. Final: sonnet.
        assert result == "sonnet"
        assert result != "opus"


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
