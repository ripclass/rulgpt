from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.services.rag.embedder import RuleEmbedder, build_embedding_content, normalize_rule_record
from app.services.rag.models import ClassifierOutput
from app.services.rag.retriever import RuleRetriever


class _FakeSession:
    def __init__(self) -> None:
        self.executed: list[tuple[str, dict[str, object]]] = []
        self.commit_calls = 0

    async def execute(self, statement, params=None):
        sql = getattr(statement, "text", str(statement))
        payload = params or {}
        self.executed.append((sql, payload))
        if sql.lstrip().upper().startswith("UPDATE"):
            return SimpleNamespace(rowcount=0)
        return SimpleNamespace(rowcount=1)

    async def commit(self) -> None:
        self.commit_calls += 1


@pytest.mark.asyncio
async def test_embed_sync_persists_normalized_rules_and_embeddings(monkeypatch):
    rules = [
        normalize_rule_record(
            {
                "rule_id": "UCP600_14D",
                "source": "UCP600",
                "article": "14(d)",
                "title": "Transport document examination",
                "reference": "Article 14(d)",
                "text": "Banks must examine transport documents within five banking days.",
                "conditions": [{"type": "time_constraint"}],
                "tags": ["icc", "lc"],
                "severity": "high",
            },
            source_hint="icc_core/ucp600.json",
        ),
        normalize_rule_record(
            {
                "rule_id": "RCEP_ORIGIN_1",
                "source": "RCEP",
                "title": "Garments origin rule",
                "reference": "Origin Rule 1",
                "description": "Garment origin eligibility under RCEP.",
                "conditions": [{"origin_criteria": "CTH"}],
                "tags": ["fta", "rcep"],
            },
            source_hint="fta_origin/rcep.json",
        ),
    ]
    fake_session = _FakeSession()
    embedder = RuleEmbedder(openai_client=object())

    async def _noop_pgvector(session):
        return None

    async def _fake_hashes(session):
        return {}

    async def _fake_embed_texts(texts):
        return [[float(index + 1)] * 1536 for index, _ in enumerate(texts)]

    async def _fake_upsert_rule_record(session, rule):
        return "inserted"

    monkeypatch.setattr(embedder, "_ensure_pgvector_enabled", _noop_pgvector)
    monkeypatch.setattr(embedder, "_fetch_existing_hashes", _fake_hashes)
    monkeypatch.setattr(embedder, "_embed_texts", _fake_embed_texts)
    monkeypatch.setattr(embedder, "_upsert_rule_record", _fake_upsert_rule_record)

    report = await embedder.sync_embeddings(fake_session, rules=rules)

    assert report.processed == 2
    assert report.rules_inserted == 2
    assert report.embedded == 2
    assert report.updated == 0
    assert report.failed == 0
    assert fake_session.commit_calls == 1
    assert len(fake_session.executed) == 4
    assert "UPDATE rulegpt_rule_embeddings" in fake_session.executed[0][0]
    assert "INSERT INTO rulegpt_rule_embeddings" in fake_session.executed[1][0]
    assert fake_session.executed[1][1]["rule_id"] == "UCP600_14D"
    assert fake_session.executed[3][1]["rule_id"] == "RCEP_ORIGIN_1"
    assert "Transport document examination" in build_embedding_content(rules[0])


@pytest.mark.asyncio
async def test_retriever_enriches_results_from_db_first_detail_store(monkeypatch):
    retriever = RuleRetriever(openai_client=object(), rulhub_client=object())

    async def _fake_embed_query(query: str):
        return [0.1] * 1536

    async def _fake_semantic_search(session, query_embedding, classification, semantic_limit):
        return [
            {
                "rule_id": "UCP600_14D",
                "rulebook": "UCP600",
                "domain": "icc",
                "jurisdiction": "global",
                "document_type": "lc",
                "distance": 0.08,
            }
        ]

    async def _fake_detail(session, rule_id: str):
        return {
            "rule_id": rule_id,
            "rulebook": "UCP600",
            "reference": "Article 14(d)",
            "title": "Transport document examination",
            "text": "Banks must examine transport documents within five banking days.",
            "domain": "icc",
            "jurisdiction": "global",
            "document_type": "lc",
            "tags": ["icc", "lc"],
        }

    monkeypatch.setattr(retriever, "_embed_query", _fake_embed_query)
    monkeypatch.setattr(retriever, "_semantic_search", _fake_semantic_search)
    monkeypatch.setattr(retriever, "_fetch_rule_detail", _fake_detail)

    result = await retriever.retrieve(
        session=object(),
        query="What does UCP600 say about transport documents?",
        classification=ClassifierOutput(
            domain="icc",
            jurisdiction="global",
            document_type="lc",
            complexity="simple",
            in_scope=True,
        ),
        top_k=5,
    )

    assert len(result) == 1
    assert result[0].title == "Transport document examination"
    assert result[0].reference == "Article 14(d)"
    assert result[0].metadata["raw_detail"]["rule_id"] == "UCP600_14D"
    assert result[0].rerank_score > 0


@pytest.mark.asyncio
async def test_retriever_falls_back_to_semantic_row_when_detail_lookup_is_empty(monkeypatch):
    retriever = RuleRetriever(openai_client=object(), rulhub_client=object())

    async def _fake_embed_query(query: str):
        return [0.2] * 1536

    async def _fake_semantic_search(session, query_embedding, classification, semantic_limit):
        return [
            {
                "rule_id": "HDFC_LC_REQ_1",
                "rulebook": "HDFC Bank",
                "domain": "bank_specific",
                "jurisdiction": "in",
                "document_type": "lc",
                "distance": 0.12,
            }
        ]

    async def _empty_detail(session, rule_id: str):
        return {}

    monkeypatch.setattr(retriever, "_embed_query", _fake_embed_query)
    monkeypatch.setattr(retriever, "_semantic_search", _fake_semantic_search)
    monkeypatch.setattr(retriever, "_fetch_rule_detail", _empty_detail)

    result = await retriever.retrieve(
        session=object(),
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

    assert len(result) == 1
    assert result[0].rule_id == "HDFC_LC_REQ_1"
    assert result[0].rulebook == "HDFC Bank"
    assert result[0].title == "HDFC_LC_REQ_1"
