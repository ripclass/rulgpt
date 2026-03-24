from __future__ import annotations

import pytest

from app.services.rag.models import ClassifierOutput
from app.services.rag.retriever import RuleRetriever


class _FakeRulHubClient:
    def __init__(self, rules: list[dict]):
        self._rules = rules

    def load_rules_from_filesystem(
        self,
        domain: str | None = None,
        jurisdiction: str | None = None,
        document_type: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        out = []
        for rule in self._rules:
            if domain and str(rule.get("domain") or "").lower() != domain.lower():
                continue
            rule_jurisdiction = str(rule.get("jurisdiction") or "").lower()
            if jurisdiction and rule_jurisdiction not in {jurisdiction.lower(), "global"}:
                continue
            if document_type and str(rule.get("document_type") or "").lower() not in {
                document_type.lower(),
                "other",
            }:
                continue
            out.append(rule)
        return out[:limit] if limit is not None else out


@pytest.mark.asyncio
async def test_fallback_retrieval_prefers_requested_bank():
    retriever = RuleRetriever(
        rulhub_client=_FakeRulHubClient(
            rules=[
                {
                    "rule_id": "BANK-HDFC-001",
                    "rulebook": "HDFC Bank",
                    "title": "HDFC LC requirement",
                    "reference": "HDFC Trade Finance",
                    "text": "HDFC requires LC beneficiary KYC and strict document matching.",
                    "domain": "bank_specific",
                    "jurisdiction": "in",
                    "document_type": "lc",
                    "tags": ["bank", "lc"],
                    "extra": {"bank_name": "HDFC Bank"},
                },
                {
                    "rule_id": "BANK-HSBC-001",
                    "rulebook": "HSBC",
                    "title": "HSBC LC requirement",
                    "reference": "HSBC Trade Finance",
                    "text": "HSBC has its own LC checklist and KYC expectations.",
                    "domain": "bank_specific",
                    "jurisdiction": "global",
                    "document_type": "lc",
                    "tags": ["bank", "lc"],
                    "extra": {"bank_name": "HSBC"},
                },
            ]
        )
    )
    result = await retriever.retrieve(
        session=None,
        query="What are HDFC Bank's LC requirements?",
        classification=ClassifierOutput(
            domain="bank_specific",
            jurisdiction="global",
            document_type="lc",
            complexity="simple",
            in_scope=True,
        ),
        top_k=5,
    )
    assert result
    assert all("hdfc" in (item.rulebook + " " + item.title).lower() for item in result)


@pytest.mark.asyncio
async def test_fallback_retrieval_suppresses_country_mismatch_noise():
    retriever = RuleRetriever(
        rulhub_client=_FakeRulHubClient(
            rules=[
                {
                    "rule_id": "CN-EXPORT-001",
                    "rulebook": "China Export Control",
                    "title": "China export license requirement",
                    "reference": "CN Article 5",
                    "text": "Electronics exports from China may require MOFCOM authorization.",
                    "domain": "customs",
                    "jurisdiction": "cn",
                    "document_type": "other",
                    "tags": ["export", "license", "electronics"],
                },
                {
                    "rule_id": "VN-EXPORT-001",
                    "rulebook": "Vietnam Export Control",
                    "title": "Vietnam export license requirement",
                    "reference": "VN Decree 69",
                    "text": "Electronics exports from Vietnam may require licensing.",
                    "domain": "customs",
                    "jurisdiction": "vn",
                    "document_type": "other",
                    "tags": ["export", "license", "electronics"],
                },
            ]
        )
    )
    result = await retriever.retrieve(
        session=None,
        query="Does my electronics export from India to US need an export license?",
        classification=ClassifierOutput(
            domain="customs",
            jurisdiction="global",
            document_type="other",
            complexity="simple",
            in_scope=True,
        ),
        top_k=5,
    )
    assert result == []
