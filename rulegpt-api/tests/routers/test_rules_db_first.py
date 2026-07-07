from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.config import settings
from app.routers import rules as rules_router
from app.services.integrations.rulhub_client import RulHubClientError

_RULE_PAYLOAD = {
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


class _DbBackedRuleClient:
    def __init__(self, rules: dict[str, dict[str, object]]):
        self._rules = rules

    async def get_rule(self, rule_id: str, allow_fallback: bool = True):
        rule = self._rules.get(rule_id)
        if rule is None:
            raise KeyError(rule_id)
        return rule


class _RulHubStubClient:
    """Mimics RulHubClient.get_rule(allow_fallback=False) semantics."""

    def __init__(self, rules: dict[str, dict[str, object]] | None = None, error: Exception | None = None):
        self._rules = rules or {}
        self._error = error

    async def get_rule(self, rule_id: str, allow_fallback: bool = True):
        if self._error is not None:
            raise self._error
        return self._rules.get(rule_id)


def _forbid_local_store(monkeypatch):
    def _fail(db, rule_id):
        raise AssertionError("local rule_store must not be consulted on the rulhub backend")

    monkeypatch.setattr(rules_router, "get_rule_details", _fail)


@pytest.mark.asyncio
async def test_rule_router_prefers_rulhub_when_backend_is_rulhub(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "rulhub")
    _forbid_local_store(monkeypatch)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: _RulHubStubClient({"UCP600_14D": dict(_RULE_PAYLOAD)}),
    )

    response = await rules_router.get_rule("UCP600_14D", db=object())

    assert response.rule_id == "UCP600_14D"
    assert response.metadata == {"source": "rulhub"}


@pytest.mark.asyncio
async def test_rule_router_fails_closed_with_503_when_rulhub_unreachable(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "rulhub")
    # Local data exists, but fail-closed means it must never be served.
    _forbid_local_store(monkeypatch)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: _RulHubStubClient(error=RulHubClientError("connection refused")),
    )

    with pytest.raises(HTTPException) as exc_info:
        await rules_router.get_rule("UCP600_14D", db=object())

    assert exc_info.value.status_code == 503


@pytest.mark.asyncio
async def test_rule_router_returns_404_when_rulhub_misses_on_rulhub_backend(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "rulhub")
    _forbid_local_store(monkeypatch)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: _RulHubStubClient({}),
    )

    with pytest.raises(HTTPException) as exc_info:
        await rules_router.get_rule("UNKNOWN_RULE", db=object())

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_rule_router_loads_rule_details_from_db_first_on_local_backend(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "local")
    monkeypatch.setattr(
        rules_router,
        "get_rule_details",
        lambda db, rule_id: {**_RULE_PAYLOAD, "metadata": {"source": "db"}},
    )

    response = await rules_router.get_rule("UCP600_14D", db=object())

    assert response.rule_id == "UCP600_14D"
    assert response.rulebook == "UCP600"
    assert response.reference == "Article 14(d)"
    assert response.text.startswith("Banks must examine")
    assert response.metadata == {"source": "db"}


@pytest.mark.asyncio
async def test_rule_router_falls_back_to_rulhub_client_when_db_misses_on_local_backend(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "local")
    fake_client = _DbBackedRuleClient({"UCP600_14D": dict(_RULE_PAYLOAD)})

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
async def test_rule_router_returns_404_when_db_and_rulhub_miss_on_local_backend(monkeypatch):
    monkeypatch.setattr(settings, "RETRIEVAL_BACKEND", "local")
    fake_client = _DbBackedRuleClient({})

    monkeypatch.setattr(rules_router, "get_rule_details", lambda db, rule_id: None)
    monkeypatch.setattr(
        "app.services.integrations.rulhub_client.get_rulhub_client",
        lambda: fake_client,
    )

    with pytest.raises(HTTPException) as exc_info:
        await rules_router.get_rule("UNKNOWN_RULE", db=object())

    assert exc_info.value.status_code == 404
