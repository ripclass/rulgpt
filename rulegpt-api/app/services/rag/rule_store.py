"""Database helpers for stored rule records."""

from __future__ import annotations

from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.rule import RuleRecord
from app.services.rag.models import NormalizedRule


def _serialize_rule_record(rule: RuleRecord) -> dict[str, Any]:
    return {
        "rule_id": rule.rule_id,
        "rulebook": rule.rulebook,
        "article": rule.article,
        "title": rule.title,
        "reference": rule.reference,
        "version": rule.version,
        "domain": rule.domain,
        "jurisdiction": rule.jurisdiction,
        "document_type": rule.document_type,
        "text": rule.text,
        "description": rule.text,
        "conditions": rule.conditions or [],
        "tags": rule.tags or [],
        "deterministic": rule.deterministic,
        "requires_llm": rule.requires_llm,
        "severity": rule.severity,
        "extra": rule.rule_metadata or {},
        "metadata": rule.rule_metadata or {},
        "content_hash": rule.content_hash,
        "source_hint": rule.source_hint,
        "raw_detail": rule.raw_payload or {},
    }


def upsert_rule_record(session: Session, rule: NormalizedRule) -> str:
    existing = session.scalar(select(RuleRecord).where(RuleRecord.rule_id == rule.rule_id))
    source_hint = None
    if isinstance(rule.metadata, dict):
        hint = rule.metadata.get("source_hint")
        if hint is not None:
            source_hint = str(hint)
    if source_hint is None:
        raw_hint = rule.raw.get("source_hint")
        if raw_hint is not None:
            source_hint = str(raw_hint)
    payload = {
        "rulebook": rule.rulebook,
        "article": rule.article,
        "title": rule.title,
        "reference": rule.reference,
        "version": rule.version,
        "domain": rule.domain,
        "jurisdiction": rule.jurisdiction,
        "document_type": rule.document_type,
        "text": rule.description,
        "conditions": rule.conditions,
        "tags": rule.tags,
        "deterministic": rule.deterministic,
        "requires_llm": rule.requires_llm,
        "severity": rule.severity,
        "rule_metadata": rule.metadata,
        "source_hint": source_hint,
        "content_hash": rule.content_hash,
        "raw_payload": rule.raw,
    }
    if existing is None:
        session.add(RuleRecord(rule_id=rule.rule_id, **payload))
        return "inserted"

    for key, value in payload.items():
        setattr(existing, key, value)
    return "updated"


def get_rule_details(session: Session, rule_id: str) -> dict[str, Any] | None:
    record = session.scalar(select(RuleRecord).where(RuleRecord.rule_id == rule_id))
    if record is None:
        return None
    return {
        "rule_id": record.rule_id,
        "rulebook": record.rulebook,
        "article": record.article,
        "reference": record.reference or record.article,
        "title": record.title,
        "text": record.text,
        "domain": record.domain,
        "jurisdiction": record.jurisdiction,
        "document_type": record.document_type,
        "tags": record.tags or [],
        "metadata": record.rule_metadata or {},
    }


def load_rules_for_retrieval(
    session: Session,
    domain: str | None = None,
    jurisdiction: str | None = None,
    document_type: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    stmt = select(RuleRecord)
    if domain:
        stmt = stmt.where(RuleRecord.domain == domain)
    if jurisdiction:
        stmt = stmt.where(or_(RuleRecord.jurisdiction == jurisdiction, RuleRecord.jurisdiction == "global"))
    if document_type:
        stmt = stmt.where(or_(RuleRecord.document_type == document_type, RuleRecord.document_type == "other"))
    stmt = stmt.order_by(RuleRecord.rulebook.asc().nullslast(), RuleRecord.reference.asc().nullslast())
    if limit is not None:
        stmt = stmt.limit(max(1, limit))
    return [_serialize_rule_record(record) for record in session.scalars(stmt).all()]
