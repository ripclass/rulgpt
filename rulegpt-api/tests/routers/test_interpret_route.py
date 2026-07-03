from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.middleware.tier_check import TierCheckMiddleware, auth_service
from app.routers import interpret
from app.services.rag.models import RetrievedRule

SAMPLE_MT700 = """:20:LC0012345
:23:PREADV/2026/001
:31C:260701
:31D:260930LONDON
:32B:USD500000,00 ABOUT USD 500,000
:39A:10/10
:40A:IRREVOCABLE
:43P:NOT ALLOWED
:44C:260915
:45A:100 MT HOT ROLLED STEEL COILS, CIF SHANGHAI INCOTERMS 2020
:46A:1. SIGNED COMMERCIAL INVOICE IN TRIPLICATE
2. FULL SET CLEAN ON BOARD BILL OF LADING
3. PACKING LIST IN DUPLICATE
:47A:PAYMENT SUBJECT TO BUYER'S APPROVAL OF THE QUALITY CERTIFICATE PRIOR TO NEGOTIATION
"""

# 55+ chars, but fewer than 3 parseable `:tag:` fields.
GARBAGE_TEXT = "This is just a plain english paragraph with no SWIFT tags in it at all, sorry."


def _build_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(TierCheckMiddleware)
    app.include_router(interpret.router)
    return app


@dataclass
class _FakeLLMResult:
    text: str
    model: str = "fake/model"
    prompt_tokens: int = 10
    completion_tokens: int = 20
    cost_usd: float | None = 0.001


class _FakeLLMClient:
    def __init__(self, answer: str = "This credit is irrevocable per field 40A. [UCP600 Article 30]"):
        self.answer = answer
        self.calls: list[dict] = []

    async def generate_answer(self, prompt, system_prompt, model=None, max_tokens=1200, temperature=0.2):
        self.calls.append({"prompt": prompt, "system_prompt": system_prompt})
        return _FakeLLMResult(text=self.answer)


@dataclass
class _FakeRetriever:
    rules: list[RetrievedRule] = field(default_factory=list)
    calls: list[str] = field(default_factory=list)

    async def retrieve(self, session, query, classification, top_k=5):
        self.calls.append(query)
        return self.rules


def _make_rule(rule_id="UCP600_30", reference="Article 30", rulebook="UCP600") -> RetrievedRule:
    return RetrievedRule(
        rule_id=rule_id,
        rulebook=rulebook,
        reference=reference,
        title="Tolerance in credit amount",
        excerpt="The words 'about' or 'approximately' allow a tolerance not exceeding 10% more or less.",
        domain="icc_core",
        jurisdiction="global",
        document_type="lc",
        similarity_score=0.9,
        rerank_score=0.9,
    )


@pytest.fixture(autouse=True)
def _no_persistence(monkeypatch):
    """Persistence goes through real Postgres in production; tests stub it out
    entirely so no DB connection is ever attempted."""
    monkeypatch.setattr(interpret, "_persist_mt700_result", lambda *a, **k: None)
    yield


@pytest.fixture
def fake_retriever(monkeypatch):
    fake = _FakeRetriever(rules=[_make_rule()])
    monkeypatch.setattr(interpret, "get_rulhub_retriever", lambda: fake)
    yield fake


@pytest.fixture
def fake_llm(monkeypatch):
    fake = _FakeLLMClient()
    monkeypatch.setattr(interpret, "llm_client", fake)
    yield fake


@pytest.fixture(autouse=True)
def _zero_daily_count_by_default(monkeypatch):
    """Default: caller is nowhere near their MT700 daily limit."""
    monkeypatch.setattr(interpret, "_mt700_calls_today_by_ip", lambda db, ip: 0)
    monkeypatch.setattr(interpret, "_mt700_calls_today_by_user", lambda db, user_id: 0)
    yield


def test_valid_mt700_returns_200_with_fields_flags_citations_disclaimer_cta(fake_retriever, fake_llm):
    client = TestClient(_build_app())
    response = client.post("/api/interpret/mt700", json={"text": SAMPLE_MT700})

    assert response.status_code == 200
    data = response.json()
    assert len(data["fields"]) == 12
    assert {f["tag"] for f in data["flags"]} == {"32B", "47A"}
    assert data["answer"]
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["rule_id"] == "UCP600_30"
    assert data["disclaimer"] == "Advisory only — not legal advice."
    assert data["cta_text"] == "Need the full document check? → LCopilot"
    assert data["cta_url"] == "https://trdrhub.com/lcopilot"

    # Two searches: base query + a flag-derived query (since flags exist).
    assert len(fake_retriever.calls) == 2
    assert fake_retriever.calls[0] == "documentary credit issuance UCP600 examination"


def test_garbage_text_returns_422(fake_retriever, fake_llm):
    client = TestClient(_build_app())
    response = client.post("/api/interpret/mt700", json={"text": GARBAGE_TEXT})

    assert response.status_code == 422
    assert "doesn't look like an MT700 message" in response.json()["detail"]


def test_fourth_anonymous_call_same_day_returns_429(monkeypatch, fake_retriever, fake_llm):
    monkeypatch.setattr(interpret, "_mt700_calls_today_by_ip", lambda db, ip: settings.MT700_DAILY_LIMIT_ANON)

    client = TestClient(_build_app())
    response = client.post("/api/interpret/mt700", json={"text": SAMPLE_MT700})

    assert response.status_code == 429
    # No LLM/retrieval calls should happen once the limit is hit.
    assert fake_llm.calls == []
    assert fake_retriever.calls == []


def test_authenticated_user_uses_higher_daily_limit_and_by_user_counter(monkeypatch, fake_retriever, fake_llm):
    async def _fake_verify_jwt(token: str):
        return {
            "user_id": uuid4(),
            "tier": "free",
            "claims": {"email": "free@example.com"},
            "issuer": "https://example.supabase.co/auth/v1",
            "authenticated": True,
        }

    monkeypatch.setattr(auth_service, "verify_jwt", _fake_verify_jwt)
    calls = {"by_user": 0, "by_ip": 0}

    def _by_user(db, user_id):
        calls["by_user"] += 1
        return settings.MT700_DAILY_LIMIT_ANON  # would be over anon limit, but under auth limit

    def _by_ip(db, ip):
        calls["by_ip"] += 1
        return 0

    monkeypatch.setattr(interpret, "_mt700_calls_today_by_user", _by_user)
    monkeypatch.setattr(interpret, "_mt700_calls_today_by_ip", _by_ip)

    client = TestClient(_build_app())
    response = client.post(
        "/api/interpret/mt700",
        json={"text": SAMPLE_MT700},
        headers={"Authorization": "Bearer free-token"},
    )

    assert response.status_code == 200
    assert calls["by_user"] == 1
    assert calls["by_ip"] == 0


def test_retrieval_unavailable_fails_closed_without_llm_call(monkeypatch, fake_llm):
    from app.services.rag.rulhub_retriever import RetrievalUnavailableError

    class _FailingRetriever:
        async def retrieve(self, session, query, classification, top_k=5):
            raise RetrievalUnavailableError("rulhub down")

    monkeypatch.setattr(interpret, "get_rulhub_retriever", lambda: _FailingRetriever())

    client = TestClient(_build_app())
    response = client.post("/api/interpret/mt700", json={"text": SAMPLE_MT700})

    assert response.status_code == 200
    data = response.json()
    assert "temporarily unavailable" in data["answer"].lower()
    assert data["citations"] == []
    assert fake_llm.calls == []
