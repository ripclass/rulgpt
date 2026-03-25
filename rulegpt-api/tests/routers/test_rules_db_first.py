from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.routers import rules as rules_router


class _DbBackedRuleClient:
    def __init__(self, rules: dict[str, dict[str, object]]):
        self._rules = rules

    async def get_rule(self, rule_id: str):
        rule = self._rules.get(rule_id)
        if rule is None:
            raise KeyError(rule_id)
        return rule


@pytest.mark.asyncio
async def test_rule_router_loads_rule_details_from_db_first(monkeypatch):
    monkeypatch.setattr(
        rules_router,
        "get_rule_details",
        lambda db, rule_id: {
            "rule_id": "UCP600_14D",
            "rulebook": "UCP600",
            "reference": "Article 14(d)",
            "title": "Transport document examination",
            "text": "Banks must examine transport documents within five banking days.",
            "domain": "icc",
            "jurisdiction": "global",
            "document_type": "lc",
            "metadata": {"source": "db"},
        },
    )

    response = await rules_router.get_rule("UCP600_14D", db=object())

    assert response.rule_id == "UCP600_14D"
    assert response.rulebook == "UCP600"
    assert response.reference == "Article 14(d)"
    assert response.text.startswith("Banks must examine")


@pytest.mark.asyncio
async def test_rule_router_falls_back_to_rulhub_client_when_db_misses(monkeypatch):
    fake_client = _DbBackedRuleClient(
        {
            "UCP600_14D": {
                "rule_id": "UCP600_14D",
                "rulebook": "UCP600",
                "reference": "Article 14(d)",
                "title": "Transport document examination",
                "text": "Banks must examine transport documents within five banking days.",
                "domain": "icc",
                "jurisdiction": "global",
                "document_type": "lc",
                "metadata": {"source": "rulhub"},
            }
        }
    )

    monkeypatch.setattr(rules_router, "get_rule_details", lambda db, rule_id: None)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: fake_client,
    )

    response = await rules_router.get_rule("UCP600_14D", db=object())

    assert response.rule_id == "UCP600_14D"
    assert response.rulebook == "UCP600"
    assert response.reference == "Article 14(d)"
    assert response.text.startswith("Banks must examine")


@pytest.mark.asyncio
async def test_rule_router_returns_404_when_db_and_rulhub_miss(monkeypatch):
    fake_client = _DbBackedRuleClient({})

    monkeypatch.setattr(rules_router, "get_rule_details", lambda db, rule_id: None)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: fake_client,
    )

    with pytest.raises(HTTPException) as exc_info:
        await rules_router.get_rule("UNKNOWN_RULE", db=object())

    assert exc_info.value.status_code == 404
