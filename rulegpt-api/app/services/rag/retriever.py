"""Rule retrieval service (hard filters + semantic + rerank)."""

from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Mapping, Optional, Sequence

from sqlalchemy import text

from .models import ClassifierOutput, RetrievedRule


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


def _tokenize(value: str) -> List[str]:
    tokens: List[str] = []
    for raw in re.findall(r"[a-zA-Z0-9_]+", value.lower()):
        token = raw
        if token.startswith("discrep"):
            token = "discrep"
        elif token.endswith("ies") and len(token) > 4:
            token = token[:-3] + "y"
        elif token.endswith("s") and len(token) > 4:
            token = token[:-1]
        if len(token) > 2:
            tokens.append(token)
    return tokens


def _lexical_score(query: str, candidate_text: str) -> float:
    q_tokens = set(_tokenize(query))
    c_tokens = set(_tokenize(candidate_text))
    if not q_tokens or not c_tokens:
        return 0.0
    overlap = len(q_tokens.intersection(c_tokens))
    return overlap / max(1, len(q_tokens))


def _candidate_text(rule: Mapping[str, Any]) -> str:
    parts = [
        str(rule.get("rulebook") or rule.get("source") or ""),
        str(rule.get("reference") or rule.get("article") or ""),
        str(rule.get("title") or ""),
        str(rule.get("text") or rule.get("description") or ""),
        " ".join(str(tag) for tag in rule.get("tags", []) if isinstance(tag, str)),
    ]
    return " ".join(part for part in parts if part).strip()


def _fallback_score(query: str, rule: Mapping[str, Any]) -> float:
    combined = _candidate_text(rule)
    title = str(rule.get("title") or "")
    reference = str(rule.get("reference") or rule.get("article") or "")
    rulebook = str(rule.get("rulebook") or rule.get("source") or "")
    text_value = str(rule.get("text") or rule.get("description") or "")
    tags = " ".join(str(tag) for tag in rule.get("tags", []) if isinstance(tag, str))
    score = (_lexical_score(query, combined) * 0.45) + (_lexical_score(query, title) * 0.25)
    score += _lexical_score(query, text_value) * 0.2
    score += _lexical_score(query, f"{reference} {tags}") * 0.1
    if rulebook and rulebook.lower() in query.lower():
        score += 0.15
    return min(score, 1.0)


class RuleRetriever:
    """Retrieve candidate rules from pgvector and rerank by lexical relevance."""

    def __init__(self, openai_client: Optional[Any] = None, rulhub_client: Optional[Any] = None) -> None:
        self.openai_client = openai_client
        self.rulhub_client = rulhub_client

    async def _get_openai_client(self) -> Any:
        if self.openai_client is not None:
            return self.openai_client
        from app.services.integrations.openai_client import OpenAIClient  # type: ignore

        self.openai_client = OpenAIClient()
        return self.openai_client

    async def _get_rulhub_client(self) -> Optional[Any]:
        if self.rulhub_client is not None:
            return self.rulhub_client
        try:
            from app.services.integrations.rulhub_client import RulHubClient  # type: ignore

            self.rulhub_client = RulHubClient()
            return self.rulhub_client
        except Exception:
            return None

    async def _embed_query(self, query: str) -> List[float]:
        client = await self._get_openai_client()
        if hasattr(client, "embed_texts"):
            vectors = await _maybe_await(client.embed_texts([query]))
            return [float(x) for x in vectors[0]]
        if hasattr(client, "create_embeddings"):
            vectors = await _maybe_await(client.create_embeddings([query]))
            return [float(x) for x in vectors[0]]
        raise RuntimeError("OpenAI client does not expose query embedding methods")

    async def _semantic_search(
        self,
        session: Any,
        query_embedding: Sequence[float],
        classification: ClassifierOutput,
        semantic_limit: int,
    ) -> List[Dict[str, Any]]:
        qvec = "[" + ",".join(f"{x:.8f}" for x in query_embedding) + "]"
        sql = text(
            """
            SELECT
                rule_id,
                rulebook,
                domain,
                jurisdiction,
                document_type,
                content_hash,
                (embedding <=> CAST(:qvec AS vector)) AS distance
            FROM rulegpt_rule_embeddings
            WHERE
                (:domain IS NULL OR domain = :domain)
                AND (:jurisdiction IS NULL OR jurisdiction = :jurisdiction OR jurisdiction = 'global')
                AND (:document_type IS NULL OR document_type = :document_type OR document_type = 'other')
            ORDER BY embedding <=> CAST(:qvec AS vector)
            LIMIT :semantic_limit
            """
        )
        try:
            result = await _maybe_await(
                session.execute(
                    sql,
                    {
                        "qvec": qvec,
                        "domain": None if classification.domain == "other" else classification.domain,
                        "jurisdiction": None if classification.jurisdiction == "global" else classification.jurisdiction,
                        "document_type": None if classification.document_type == "other" else classification.document_type,
                        "semantic_limit": semantic_limit,
                    },
                )
            )
        except Exception as exc:
            raise RuntimeError(
                "Semantic retrieval failed. Ensure PostgreSQL + pgvector is configured and the embeddings table exists."
            ) from exc

        rows = []
        for row in result.fetchall():
            rows.append(
                {
                    "rule_id": str(row.rule_id),
                    "rulebook": str(row.rulebook or "unknown"),
                    "domain": str(row.domain or "other"),
                    "jurisdiction": str(row.jurisdiction or "global"),
                    "document_type": str(row.document_type or "other"),
                    "distance": float(row.distance if row.distance is not None else 1.0),
                }
            )
        return rows

    async def _fetch_rule_detail(self, rule_id: str) -> Dict[str, Any]:
        client = await self._get_rulhub_client()
        if client is None:
            return {}
        if hasattr(client, "get_rule"):
            try:
                response = await _maybe_await(client.get_rule(rule_id))
                return response if isinstance(response, dict) else {}
            except Exception:
                return {}
        return {}

    async def _fallback_retrieve(
        self,
        query: str,
        classification: ClassifierOutput,
        top_k: int,
    ) -> List[RetrievedRule]:
        client = await self._get_rulhub_client()
        if client is None:
            return []

        domain = None if classification.domain == "other" else classification.domain
        jurisdiction = None if classification.jurisdiction == "global" else classification.jurisdiction
        document_type = None if classification.document_type == "other" else classification.document_type

        filter_attempts = [
            (domain, jurisdiction, document_type),
            (domain, jurisdiction, None),
            (domain, None, document_type),
            (domain, None, None),
            (None, None, None),
        ]

        seen_rule_ids: set[str] = set()
        candidates: list[tuple[float, Mapping[str, Any]]] = []
        for attempt_domain, attempt_jurisdiction, attempt_document_type in filter_attempts:
            try:
                rules = client.load_rules_from_filesystem(
                    domain=attempt_domain,
                    jurisdiction=attempt_jurisdiction,
                    document_type=attempt_document_type,
                    limit=None,
                )
            except Exception:
                rules = []
            for rule in rules:
                rule_id = str(rule.get("rule_id") or "")
                if not rule_id or rule_id in seen_rule_ids:
                    continue
                seen_rule_ids.add(rule_id)
                score = _fallback_score(query, rule)
                if score <= 0:
                    continue
                candidates.append((score, rule))
            if len(candidates) >= top_k:
                break

        candidates.sort(key=lambda item: item[0], reverse=True)
        out: List[RetrievedRule] = []
        for score, rule in candidates[:top_k]:
            out.append(
                RetrievedRule(
                    rule_id=str(rule.get("rule_id") or ""),
                    rulebook=str(rule.get("rulebook") or rule.get("source") or "unknown"),
                    reference=str(rule.get("reference") or rule.get("article") or "n/a"),
                    title=str(rule.get("title") or rule.get("rule_id") or "Untitled"),
                    excerpt=str(rule.get("text") or rule.get("description") or ""),
                    domain=str(rule.get("domain") or "other"),
                    jurisdiction=str(rule.get("jurisdiction") or "global"),
                    document_type=str(rule.get("document_type") or "other"),
                    similarity_score=score,
                    rerank_score=score,
                    metadata={"raw_detail": dict(rule)},
                )
            )
        return out

    async def retrieve(
        self,
        session: Any,
        query: str,
        classification: ClassifierOutput,
        top_k: int = 5,
    ) -> List[RetrievedRule]:
        top_k = max(3, min(8, top_k))
        rows: List[Dict[str, Any]] = []
        try:
            query_embedding = await self._embed_query(query)
            rows = await self._semantic_search(
                session,
                query_embedding,
                classification,
                semantic_limit=max(20, top_k * 4),
            )
        except Exception:
            rows = []
        if not rows:
            return await self._fallback_retrieve(query, classification, top_k)

        candidates: List[RetrievedRule] = []
        for row in rows:
            detail = await self._fetch_rule_detail(row["rule_id"])
            reference = str(detail.get("reference") or detail.get("article") or "n/a")
            title = str(detail.get("title") or row["rule_id"])
            excerpt = str(detail.get("text") or detail.get("description") or "")
            similarity = max(0.0, min(1.0, 1.0 - row["distance"])) if not math.isnan(row["distance"]) else 0.0
            lexical = _lexical_score(query, f"{title} {excerpt} {reference} {detail.get('tags', [])}")
            rerank = (similarity * 0.7) + (lexical * 0.3)
            candidates.append(
                RetrievedRule(
                    rule_id=row["rule_id"],
                    rulebook=str(detail.get("rulebook") or row["rulebook"]),
                    reference=reference,
                    title=title,
                    excerpt=excerpt,
                    domain=str(detail.get("domain") or row["domain"]),
                    jurisdiction=str(detail.get("jurisdiction") or row["jurisdiction"]),
                    document_type=str(detail.get("document_type") or row["document_type"]),
                    similarity_score=similarity,
                    rerank_score=rerank,
                    metadata={"raw_detail": detail} if detail else {},
                )
            )

        candidates.sort(key=lambda item: item.rerank_score, reverse=True)
        if not candidates:
            return await self._fallback_retrieve(query, classification, top_k)
        return candidates[:top_k]
