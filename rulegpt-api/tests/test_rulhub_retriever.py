import logging

import pytest

from app.config import get_settings
from app.services.rag.models import ClassifierOutput
from app.services.rag.rulhub_retriever import (RulHubRetriever, RetrievalUnavailableError,
    derive_search_queries, get_rulhub_retriever)
import app.services.rag.rulhub_retriever as rulhub_retriever_module
from app.services.integrations.rulhub_client import RulHubClientError

CLS = ClassifierOutput(domain="icc", jurisdiction="global", document_type="lc",
                       commodity=None, complexity="simple", in_scope=True, reason=None)


@pytest.fixture(autouse=True)
def _disable_embed_rerank_by_default(monkeypatch):
    """Embed-rerank lazily constructs a real OpenAIClient when a key is configured.

    Force it off for every test in this file by default so tests never attempt a
    live OpenAI/OpenRouter call, even if OPENAI_API_KEY / OPENROUTER_API_KEY happen
    to be set in the ambient dev environment (they are, in this repo's shell).
    The embed-rerank-specific tests below re-enable it explicitly and monkeypatch
    the OpenAIClient class so no real network call ever happens.
    """
    settings = get_settings()
    monkeypatch.setattr(settings, "RULGPT_RERANK_EMBEDDINGS", False)
    yield


@pytest.fixture(autouse=True)
def _reset_rulhub_retriever_singleton(monkeypatch):
    """`get_rulhub_retriever()` is a process-wide singleton; reset it around every
    test so one test's monkeypatched client/cache state can't leak into the next."""
    monkeypatch.setattr(rulhub_retriever_module, "_DEFAULT_RETRIEVER", None)
    yield


def make_row(rule_id, text="Partial shipments are allowed.", rank=0.5):
    return {"rule_id": rule_id, "source": "ucp600", "rule_family": "UCP600", "industry": "banking",
            "sub_domain": "trade_finance", "domain": "icc_core", "jurisdiction": "global",
            "document_type": "lc", "article": "31", "title": "Partial shipment",
            "severity": "info", "approval_status": "approved", "text": text, "rank": rank}


class FakeClient:
    def __init__(self, rows=None, fail=False, fail_status=503):
        self.rows, self.fail, self.fail_status, self.search_calls = rows or [], fail, fail_status, []
    async def search_rules(self, query, filters=None, limit=10, allow_fallback=True):
        self.search_calls.append((query, filters))
        if self.fail: raise RulHubClientError("down", status_code=self.fail_status)
        return self.rows
    async def get_rule(self, rule_id, allow_fallback=True):
        return {**make_row(rule_id), "text": "FULL TEXT " + rule_id}
    async def lookup_rules(self, **kw): return []


@pytest.mark.asyncio
async def test_fail_closed_when_all_searches_error():
    r = RulHubRetriever(rulhub_client=FakeClient(fail=True), openai_client=None)
    with pytest.raises(RetrievalUnavailableError):
        await r.retrieve(None, "Is transhipment allowed under UCP 600?", CLS)


@pytest.mark.asyncio
async def test_zero_matches_returns_empty_not_error():
    r = RulHubRetriever(rulhub_client=FakeClient(rows=[]), openai_client=None)
    assert await r.retrieve(None, "quantum widget tax", CLS) == []


@pytest.mark.asyncio
async def test_dedup_and_hydration():
    rows = [make_row("UCP600-31", rank=0.9), make_row("UCP600-31", rank=0.4), make_row("UCP600-20", rank=0.6)]
    r = RulHubRetriever(rulhub_client=FakeClient(rows=rows), openai_client=None)
    out = await r.retrieve(None, "partial shipment rules", CLS)
    ids = [x.rule_id for x in out]
    assert ids.count("UCP600-31") == 1 and out[0].excerpt.startswith("FULL TEXT")


def test_derive_search_queries_variants():
    qs = derive_search_queries("Can the LC amount be exceeded by about 10%?", CLS)
    assert 1 <= len(qs) <= 3 and qs[0].startswith("Can the LC amount")
    assert any("letter of credit" in q for q in qs[1:])  # lc expansion


@pytest.mark.asyncio
async def test_cache_hits_skip_second_search():
    fc = FakeClient(rows=[make_row("UCP600-31")])
    r = RulHubRetriever(rulhub_client=fc, openai_client=None)
    await r.retrieve(None, "partial shipment", CLS)
    n = len(fc.search_calls)
    await r.retrieve(None, "partial shipment", CLS)
    assert len(fc.search_calls) == n


@pytest.mark.asyncio
async def test_get_rulhub_retriever_singleton_shares_cache_across_calls(monkeypatch):
    """The bug this guards: RAGPipeline is built fresh per query, so a bare
    RulHubRetriever() per pipeline instance gives every request its own empty
    TTL cache. get_rulhub_retriever() must return the same instance every time."""
    fc = FakeClient(rows=[make_row("UCP600-31")])
    monkeypatch.setattr(rulhub_retriever_module, "get_rulhub_client", lambda: fc)

    first = get_rulhub_retriever()
    second = get_rulhub_retriever()
    assert first is second

    await first.retrieve(None, "partial shipment", CLS)
    n = len(fc.search_calls)
    await second.retrieve(None, "partial shipment", CLS)
    assert len(fc.search_calls) == n


@pytest.mark.asyncio
async def test_embed_rerank_invoked_when_key_configured(monkeypatch):
    calls: list = []

    class _FakeOpenAIClient:
        def __init__(self, *args, **kwargs):
            pass
        async def embed_texts(self, texts, model=None):
            calls.append(list(texts))
            # First vector (query) identical to all candidate vectors -> similarity 1.0
            return [[1.0, 0.0] for _ in texts]

    monkeypatch.setattr("app.services.integrations.openai_client.OpenAIClient", _FakeOpenAIClient)
    settings = get_settings()
    monkeypatch.setattr(settings, "RULGPT_RERANK_EMBEDDINGS", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test")

    rows = [make_row("UCP600-31"), make_row("UCP600-20")]
    r = RulHubRetriever(rulhub_client=FakeClient(rows=rows), openai_client=None)
    out = await r.retrieve(None, "partial shipment", CLS)

    assert calls, "embed_texts was never invoked — embed-rerank path did not run"
    assert isinstance(r.openai_client, _FakeOpenAIClient)
    assert out


@pytest.mark.asyncio
async def test_embed_rerank_skips_gracefully_without_key(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "RULGPT_RERANK_EMBEDDINGS", True)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)

    rows = [make_row("UCP600-31")]
    r = RulHubRetriever(rulhub_client=FakeClient(rows=rows), openai_client=None)
    out = await r.retrieve(None, "partial shipment", CLS)

    assert r.openai_client is None
    assert out and out[0].rule_id == "UCP600-31"


@pytest.mark.asyncio
async def test_persistent_4xx_logs_warning_distinct_from_outage(caplog):
    fc = FakeClient(fail=True, fail_status=422)
    r = RulHubRetriever(rulhub_client=fc, openai_client=None)
    with caplog.at_level(logging.WARNING, logger="app.services.rag.rulhub_retriever"):
        with pytest.raises(RetrievalUnavailableError):
            await r.retrieve(None, "Is transhipment allowed under UCP 600?", CLS)
    assert "422" in caplog.text
