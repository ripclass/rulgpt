from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx
import pytest

from app.services.integrations.rulhub_client import RulHubClient, RulHubClientError


def make_client(handler, **overrides) -> RulHubClient:
    """Build a RulHubClient wired to a MockTransport handler for fast, network-free tests."""
    defaults: dict = {
        "base_url": "https://api.rulhub.com",
        "api_key": "test-api-key",
        "client": httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        "max_retries": 1,
        "backoff_seconds": 0.0,
    }
    defaults.update(overrides)
    return RulHubClient(**defaults)


@pytest.mark.asyncio
async def test_get_rules_normalizes_payload_and_sends_api_key() -> None:
    seen_api_keys: list[str | None] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_api_keys.append(request.headers.get("X-API-Key"))
        if request.url.path == "/v1/rules":
            payload = {
                "rules": [
                    {
                        "rule_id": "UCP600_14D",
                        "source": "UCP600",
                        "article": "14(d)",
                        "title": "Document examination",
                        "text": "Banks must examine documents within five banking days.",
                        "condition": {"type": "time_constraint"},
                        "expected_outcome": {"valid": ["timely"], "invalid": ["late"]},
                        "tags": ["icc", "lc"],
                        "deterministic": True,
                        "requires_llm": False,
                        "severity": "high",
                    }
                ]
            }
            return httpx.Response(200, json=payload)
        return httpx.Response(404, json={"detail": "not found"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            api_key="test-api-key",
            client=http_client,
        )
        rules = await client.get_rules(domain="icc", limit=25, page=1)

    assert len(rules) == 1
    assert rules[0]["rule_id"] == "UCP600_14D"
    assert rules[0]["text"].startswith("Banks must examine")
    assert rules[0]["conditions"] == {"type": "time_constraint"}
    assert seen_api_keys[0] == "test-api-key"


@pytest.mark.asyncio
async def test_request_sends_rulhub_version_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("RULHUB_API_VERSION", raising=False)
    seen_versions: list[str | None] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_versions.append(request.headers.get("RulHub-Version"))
        return httpx.Response(200, json={"rules": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            api_key="rh_test_xyz",
            client=http_client,
        )
        await client.get_rules()

    assert seen_versions == ["2026-04-28"]


@pytest.mark.asyncio
async def test_400_with_structured_envelope_is_logged_and_surfaced(
    caplog: pytest.LogCaptureFixture,
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400,
            json={
                "detail": {
                    "error": "schema validation failed",
                    "schema": "rule.v2",
                    "violation_count": 1,
                    "sample_violations": [
                        {"path": "/jurisdiction", "message": "must be ISO-3166 alpha-2"}
                    ],
                }
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            api_key="rh_test_xyz",
            client=http_client,
            max_retries=1,
            backoff_seconds=0.0,
        )
        with caplog.at_level(logging.WARNING, logger="app.services.integrations.rulhub_client"):
            with pytest.raises(RulHubClientError) as exc_info:
                await client._request_json("GET", "/v1/rules", params={"page": 1})

    err = exc_info.value
    assert err.status_code == 400
    assert err.error_detail is not None
    assert err.error_detail["error"] == "schema validation failed"
    assert err.error_detail["sample_violations"][0]["path"] == "/jurisdiction"
    # Log line should name the violating field so engineers find the schema break fast.
    assert "/jurisdiction" in caplog.text
    assert "schema validation failed" in caplog.text


@pytest.mark.asyncio
async def test_401_surfaces_api_key_required_error_code() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={
                "detail": {
                    "error_code": "API_KEY_REQUIRED",
                    "message": "Missing X-API-Key header",
                }
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            client=http_client,
            max_retries=1,
            backoff_seconds=0.0,
        )
        with pytest.raises(RulHubClientError) as exc_info:
            await client._request_json("GET", "/v1/rules")

    assert exc_info.value.status_code == 401
    assert exc_info.value.error_code == "API_KEY_REQUIRED"


@pytest.mark.asyncio
async def test_search_rules_uses_local_text_ranking_when_no_server_search() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path != "/v1/rules":
            return httpx.Response(404, json={"detail": "not found"})

        page = int(request.url.params.get("page", "1"))
        if page == 1:
            return httpx.Response(
                200,
                json={
                    "rules": [
                        {"rule_id": "A", "title": "General Compliance", "text": "General note"},
                        {"rule_id": "B", "title": "Bill of Lading Requirements", "text": "BL must be clean"},
                    ]
                },
            )
        if page == 2:
            return httpx.Response(
                200,
                json={"rules": [{"rule_id": "C", "title": "Invoice", "text": "Commercial invoice details"}]},
            )
        return httpx.Response(200, json={"rules": []})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            client=http_client,
            max_search_pages=3,
            backoff_seconds=0.0,
        )
        results = await client.search_rules("bill of lading", {"domain": "icc", "limit": 1})

    assert len(results) == 1
    assert results[0]["rule_id"] == "B"


@pytest.mark.asyncio
async def test_retry_logic_succeeds_after_transient_errors() -> None:
    attempts = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] < 3:
            return httpx.Response(503, json={"detail": "temporary outage"})
        return httpx.Response(200, json={"rulesets": [{"ruleset_key": "ucp600", "rule_count": 10}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = RulHubClient(
            base_url="https://api.rulhub.com",
            client=http_client,
            max_retries=3,
            backoff_seconds=0.0,
        )
        rulesets = await client.get_all_rulesets()

    assert attempts["count"] == 3
    assert rulesets[0]["ruleset_key"] == "ucp600"


def test_local_filesystem_loader_normalizes_mixed_shapes(tmp_path: Path) -> None:
    icc_rules = [
        {
            "source": "UCP600",
            "rule_id": "UCP600_14D",
            "article": "14(d)",
            "title": "Document Examination",
            "text": "Banks examine docs.",
            "condition": {"type": "time_constraint"},
            "expected_outcome": {"valid": ["timely"], "invalid": ["late"]},
            "tags": ["icc", "lc"],
            "deterministic": True,
            "requires_llm": False,
            "severity": "high",
            "examples": {"valid": ["x"], "invalid": ["y"]},
        }
    ]
    fta_rules = {
        "rules": [
            {
                "rule_id": "RCEP_GARMENT_ORIGIN",
                "description": "Garment origin eligibility under RCEP.",
                "conditions": [{"operator": "origin_criteria"}],
                "members": ["BD", "JP"],
                "origin_criteria": "CTH",
                "domain": "fta",
                "jurisdiction": "bd",
                "document_type": "certificate",
            }
        ]
    }
    bank_rule = {
        "rule_id": "HDFC_LC_REQ_1",
        "description": "Bank-specific LC requirement",
        "bank_name": "HDFC Bank",
        "swift_code": "HDFCINBB",
        "conditions": [{"operator": "required"}],
    }

    (tmp_path / "icc_core").mkdir(parents=True, exist_ok=True)
    (tmp_path / "fta_origin").mkdir(parents=True, exist_ok=True)
    (tmp_path / "bank_profiles").mkdir(parents=True, exist_ok=True)
    (tmp_path / "icc_core" / "ucp600.json").write_text(json.dumps(icc_rules), encoding="utf-8")
    (tmp_path / "fta_origin" / "rcep.json").write_text(json.dumps(fta_rules), encoding="utf-8")
    (tmp_path / "bank_profiles" / "hdfc.json").write_text(json.dumps(bank_rule), encoding="utf-8")

    client = RulHubClient(data_root=str(tmp_path), backoff_seconds=0.0)
    loaded = client.load_rules_from_filesystem(limit=10)

    assert len(loaded) == 3
    fta = next(rule for rule in loaded if rule["rule_id"] == "RCEP_GARMENT_ORIGIN")
    assert fta["text"] == "Garment origin eligibility under RCEP."
    assert fta["conditions"] == [{"operator": "origin_criteria"}]
    assert fta["extra"]["members"] == ["BD", "JP"]
    assert fta["extra"]["origin_criteria"] == "CTH"
    bank = next(rule for rule in loaded if rule["rule_id"] == "HDFC_LC_REQ_1")
    assert bank["domain"] == "bank_specific"
    assert bank["extra"]["bank_name"] == "HDFC Bank"
    assert bank["extra"]["swift_code"] == "HDFCINBB"


@pytest.mark.asyncio
async def test_search_sends_per_page_not_limit() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "query": "q",
                "results": [],
                "page": 1,
                "per_page": 12,
                "corpus_stats": {"active": 1, "superseded": 0, "total": 1, "matched": 0, "include_superseded": False},
                "schema_version": "v1.0.0",
            },
        )

    client = make_client(handler)
    await client.search_rules("transhipment", limit=12)
    assert captured["per_page"] == 12 and "limit" not in captured


@pytest.mark.asyncio
async def test_search_no_fallback_raises() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"detail": "suspended"})

    client = make_client(handler)
    with pytest.raises(RulHubClientError):
        await client.search_rules("ucp 600 article 20", allow_fallback=False)


@pytest.mark.asyncio
async def test_lookup_rules_builds_query_params() -> None:
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        return httpx.Response(
            200,
            json={
                "query": "",
                "results": [],
                "page": 1,
                "per_page": 20,
                "corpus_stats": {"active": 0, "superseded": 0, "total": 0, "matched": 0, "include_superseded": False},
                "schema_version": "v1.0.0",
            },
        )

    client = make_client(handler)
    await client.lookup_rules(source="ucp600", per_page=20)
    assert "/v1/rules/lookup" in seen["url"] and "source=ucp600" in seen["url"]


@pytest.mark.asyncio
async def test_get_stats_swallows_errors() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = make_client(handler)
    assert await client.get_stats() is None



@pytest.mark.asyncio
async def test_search_mode_hybrid_is_sent() -> None:
    captured: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(200, json={
            "query": "q", "results": [], "page": 1, "per_page": 10,
            "corpus_stats": {"active": 1, "superseded": 0, "total": 1, "matched": 0, "include_superseded": False},
            "schema_version": "v1.0.0",
        })

    client = make_client(handler)
    await client.search_rules("Can the bank wait for a waiver before refusing?", search_mode="hybrid")
    assert captured["search_mode"] == "hybrid"
    # sanity: without search_mode it must NOT be sent (contract is additionalProperties:false)
    captured.clear()
    await client.search_rules("transhipment")
    assert "search_mode" not in captured
