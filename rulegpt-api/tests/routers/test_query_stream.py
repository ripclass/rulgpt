from __future__ import annotations

import json
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import get_db
from app.middleware.tier_check import TierCheckMiddleware
from app.routers import query as query_router
from app.services.rag.models import Citation, ClassifierOutput, QueryResult
from app.schemas.query import DISCLAIMER_TEXT


class _FakeDbStream:
    """Minimal DB double for the streaming endpoint: returns a pre-made session
    for the first scalar (session lookup), 0 for every subsequent count query,
    and assigns an id on refresh so persistence yields a query_id."""

    def __init__(self, session_obj):
        self._session = session_obj
        self._scalar_calls = 0
        self.added = []

    def scalar(self, statement):
        self._scalar_calls += 1
        return self._session if self._scalar_calls == 1 else 0

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        pass

    def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid4()

    def rollback(self):
        pass


def _session_obj():
    return SimpleNamespace(
        id=uuid4(), user_id=uuid4(), tier="free", client_ip="1.2.3.4",
        language="en", query_count=0, last_active_at=None, started_at=None,
        session_token="tok-123",
    )


def _final_result(answer: str) -> QueryResult:
    return QueryResult(
        answer=answer,
        citations=[Citation(rule_id="UCP600-14", rulebook="UCP600", reference="Article 14",
                            excerpt="Banks examine documents on their face.", confidence="high")],
        confidence_band="high",
        suggested_followups=["f1", "f2", "f3"],
        disclaimer=DISCLAIMER_TEXT,
        classifier_output=ClassifierOutput(domain="icc", jurisdiction="global",
                                           document_type="lc", complexity="simple", in_scope=True),
        retrieved_rule_ids=["UCP600-14"],
        model_used="z-ai/glm-5.2",
        classifier_model="heuristic",
        routing_tier="haiku",
    )


def _build_app(fake_db) -> FastAPI:
    app = FastAPI()
    app.add_middleware(TierCheckMiddleware)
    app.include_router(query_router.router)
    app.dependency_overrides[get_db] = lambda: fake_db
    return app


def _parse_sse(body: str):
    """Return list of (event, data_dict) frames."""
    frames = []
    for block in body.strip().split("\n\n"):
        event, data = None, None
        for line in block.splitlines():
            if line.startswith("event:"):
                event = line[len("event:"):].strip()
            elif line.startswith("data:"):
                data = json.loads(line[len("data:"):].strip())
        if event:
            frames.append((event, data))
    return frames


@pytest.fixture
def _patch_stream(monkeypatch):
    def _install(events):
        async def _fake_stream(query, session, language="en", user_tier="free"):
            for ev in events:
                yield ev
        monkeypatch.setattr("app.services.rag.pipeline.stream_query", _fake_stream)
    return _install


def test_stream_endpoint_emits_tokens_then_done(_patch_stream):
    _patch_stream([
        {"type": "delta", "text": "Under UCP600 "},
        {"type": "delta", "text": "Article 14 applies."},
        {"type": "final", "result": _final_result("Under UCP600 Article 14 applies.")},
    ])
    app = _build_app(_FakeDbStream(_session_obj()))
    client = TestClient(app)
    resp = client.post("/api/query/stream",
                       json={"query": "How does UCP600 handle examination?", "session_token": "tok-123"},
                       headers={"x-user-id": str(uuid4()), "x-user-tier": "free"})
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    frames = _parse_sse(resp.text)
    tokens = [d["delta"] for e, d in frames if e == "token"]
    done = [d for e, d in frames if e == "done"]
    assert "".join(tokens) == "Under UCP600 Article 14 applies."
    assert len(done) == 1
    payload = done[0]
    assert payload["answer"] == "Under UCP600 Article 14 applies."
    assert payload["confidence_band"] == "high"
    assert payload["citations"][0]["reference"] == "Article 14"
    assert payload["query_id"] is not None
    assert payload["routing_tier"] == "haiku"


def test_stream_endpoint_429_before_stream_when_quota_exhausted(_patch_stream, monkeypatch):
    _patch_stream([{"type": "final", "result": _final_result("x")}])
    # Force the quota counter over the free daily limit.
    monkeypatch.setattr(query_router, "_queries_this_month", lambda *a, **k: 10_000)
    app = _build_app(_FakeDbStream(_session_obj()))
    client = TestClient(app)
    resp = client.post("/api/query/stream",
                       json={"query": "hi", "session_token": "tok-123"},
                       headers={"x-user-id": str(uuid4()), "x-user-tier": "free"})
    assert resp.status_code == 429
    assert "limit" in resp.text.lower()
