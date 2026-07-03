import pytest

from app.services.rag.models import ClassifierOutput
from app.services.rag.rulhub_retriever import RulHubRetriever, RetrievalUnavailableError, derive_search_queries
from app.services.integrations.rulhub_client import RulHubClientError

CLS = ClassifierOutput(domain="icc", jurisdiction="global", document_type="lc",
                       commodity=None, complexity="simple", in_scope=True, reason=None)


def make_row(rule_id, text="Partial shipments are allowed.", rank=0.5):
    return {"rule_id": rule_id, "source": "ucp600", "rule_family": "UCP600", "industry": "banking",
            "sub_domain": "trade_finance", "domain": "icc_core", "jurisdiction": "global",
            "document_type": "lc", "article": "31", "title": "Partial shipment",
            "severity": "info", "approval_status": "approved", "text": text, "rank": rank}


class FakeClient:
    def __init__(self, rows=None, fail=False):
        self.rows, self.fail, self.search_calls = rows or [], fail, []
    async def search_rules(self, query, filters=None, limit=10, allow_fallback=True):
        self.search_calls.append((query, filters))
        if self.fail: raise RulHubClientError("down", status_code=503)
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
