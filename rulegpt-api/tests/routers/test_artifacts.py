from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.middleware.tier_check import TierCheckMiddleware
from app.routers import artifacts

CASE_NOTE_TEXT = """Short answer
This CIF shipment requires the standard trio: invoice, transport document, and insurance.

Rule basis
[UCP600 Article 14] governs document examination for these categories.

Risk level
Low, assuming presentation matches the credit terms.

Reasoning
The retrieved rule confirms banks examine documents against the credit and applicable standard practice.

Action steps
Confirm the LC's field 46A lists the same three document families before shipment.

Assumptions / missing facts
The exact LC wording and issuing bank were not provided.
"""


def _make_query_row(user_id, citations=None):
    return SimpleNamespace(
        id=uuid4(),
        user_id=user_id,
        query_text="What documents are required for a CIF shipment under UCP600?",
        answer_text=(
            "The commercial invoice, transport document, and insurance document are typically "
            "required. [UCP600 Article 14]"
        ),
        citations=citations
        if citations is not None
        else [
            {
                "rule_id": "UCP600_14",
                "rulebook": "UCP600",
                "reference": "Article 14",
                "excerpt": "Banks must examine documents to determine on their face whether they appear to comply.",
                "confidence": "high",
            }
        ],
    )


class _FakeEntitlementQuery:
    def __init__(self, rows):
        self._rows = rows

    def filter(self, *conditions):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeDb:
    def __init__(self, query_row=None, entitlement_rows=None):
        self._query_row = query_row
        self._entitlement_rows = entitlement_rows if entitlement_rows is not None else []
        self.commit_calls = 0
        self.flush_calls = 0

    def scalar(self, statement):
        return self._query_row

    def query(self, model):
        return _FakeEntitlementQuery(self._entitlement_rows)

    def commit(self):
        self.commit_calls += 1

    def flush(self):
        self.flush_calls += 1


@dataclass
class _FakeLLMResult:
    text: str
    model: str = "fake/model"
    prompt_tokens: int = 10
    completion_tokens: int = 40
    cost_usd: float | None = 0.002


class _FakeLLMClient:
    def __init__(self, text: str = CASE_NOTE_TEXT):
        self.text = text
        self.calls: list[dict] = []

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.calls.append({"prompt": prompt, "system_prompt": system_prompt})
        return _FakeLLMResult(text=self.text)


def _build_app(fake_db) -> FastAPI:
    app = FastAPI()
    app.add_middleware(TierCheckMiddleware)
    app.include_router(artifacts.router)
    app.dependency_overrides[get_db] = lambda: fake_db
    return app


def _dev_headers(user_id, tier: str) -> dict:
    return {"x-user-id": str(user_id), "x-user-tier": tier}


@pytest.fixture
def fake_llm(monkeypatch):
    fake = _FakeLLMClient()
    monkeypatch.setattr(artifacts, "llm_client", fake)
    yield fake


def test_case_note_pro_user_gets_all_six_headings_and_disclaimer(fake_llm):
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(user_id, "professional"),
    )

    assert response.status_code == 200
    data = response.json()
    for heading in [
        "Short answer",
        "Rule basis",
        "Risk level",
        "Reasoning",
        "Action steps",
        "Assumptions / missing facts",
    ]:
        assert heading in data["body_markdown"]
    assert data["disclaimer"] == "Advisory only — not legal advice."
    assert data["citations"][0]["rule_id"] == "UCP600_14"
    assert db.commit_calls >= 1
    # Professional tier bypasses entitlements entirely — no credit is ever touched.
    assert db.flush_calls == 0


def test_case_note_free_user_without_credit_returns_402_with_price_info(fake_llm):
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    db = _FakeDb(query_row=query_row, entitlement_rows=[])
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(user_id, "free"),
    )

    assert response.status_code == 402
    detail = response.json()["detail"]
    assert detail["kind"] == "case_note"
    assert detail["price_usd"] == 9
    assert detail["pro_price_usd"] == 29
    assert fake_llm.calls == []


def test_case_note_free_user_with_credit_succeeds_and_consumes_it(fake_llm):
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    entitlement_row = SimpleNamespace(credits=1, consumed=0)
    db = _FakeDb(query_row=query_row, entitlement_rows=[entitlement_row])
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(user_id, "free"),
    )

    assert response.status_code == 200
    assert entitlement_row.consumed == 1
    assert db.flush_calls == 1
    assert response.json()["credit_consumed"] is True


def test_case_note_pro_user_response_reports_credit_not_consumed(fake_llm):
    """Subscription tiers never touch entitlements — the field must still be
    truthful (False), not just omitted."""
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(user_id, "professional"),
    )

    assert response.status_code == 200
    assert response.json()["credit_consumed"] is False


def test_case_note_free_user_degraded_generation_does_not_burn_credit(monkeypatch):
    """A citations-only degrade (LLM unavailable, or persistent hallucination)
    must not consume the one-off credit the user paid for."""
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    entitlement_row = SimpleNamespace(credits=1, consumed=0)
    db = _FakeDb(query_row=query_row, entitlement_rows=[entitlement_row])
    client = TestClient(_build_app(db))

    async def _raise_unavailable(prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        from app.services.integrations.llm_client import LLMUnavailableError

        raise LLMUnavailableError("all providers failed")

    fake = SimpleNamespace(generate_answer=_raise_unavailable)
    monkeypatch.setattr(artifacts, "llm_client", fake)

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(user_id, "free"),
    )

    assert response.status_code == 200
    assert "verified citations" in response.json()["body_markdown"]
    assert response.json()["credit_consumed"] is False
    # Consumed then released — net zero, credit still usable.
    assert entitlement_row.consumed == 0


def test_draft_invalid_draft_type_returns_422(fake_llm):
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/draft",
        json={"query_id": str(query_row.id), "draft_type": "not_a_real_type"},
        headers=_dev_headers(user_id, "professional"),
    )

    assert response.status_code == 422
    assert fake_llm.calls == []


def test_draft_valid_type_succeeds_for_pro_user(fake_llm):
    fake_llm.text = "Dear [Bank name],\n\nWe are writing regarding the discrepancy raised on our recent presentation."
    user_id = uuid4()
    query_row = _make_query_row(user_id)
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/draft",
        json={"query_id": str(query_row.id), "draft_type": "bank_response"},
        headers=_dev_headers(user_id, "professional"),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["draft_type"] == "bank_response"
    assert data["disclaimer"] == "Advisory only — not legal advice."
    assert "[Bank name]" in data["body_markdown"]


def test_foreign_query_id_returns_404(fake_llm):
    owner_id = uuid4()
    other_user_id = uuid4()
    query_row = _make_query_row(owner_id)
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(query_row.id)},
        headers=_dev_headers(other_user_id, "professional"),
    )

    assert response.status_code == 404
    assert fake_llm.calls == []


def test_missing_query_id_returns_404(fake_llm):
    user_id = uuid4()
    db = _FakeDb(query_row=None)
    client = TestClient(_build_app(db))

    response = client.post(
        "/api/artifacts/case-note",
        json={"query_id": str(uuid4())},
        headers=_dev_headers(user_id, "professional"),
    )

    assert response.status_code == 404


def test_case_note_requires_authentication(fake_llm):
    query_row = _make_query_row(uuid4())
    db = _FakeDb(query_row=query_row)
    client = TestClient(_build_app(db))

    response = client.post("/api/artifacts/case-note", json={"query_id": str(query_row.id)})

    assert response.status_code == 401
