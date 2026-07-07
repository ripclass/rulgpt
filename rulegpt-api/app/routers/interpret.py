"""MT700 interpreter endpoint — free, rate-limited SWIFT message explainer."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.services.rag.prose import sanitize_outbound
from app.config import settings
from app.database import get_db
from app.models.query import RuleGPTQuery
from app.models.session import RuleGPTSession
from app.routers.deps import client_ip as _resolve_client_ip
from app.schemas.interpret import (
    MT700_CTA_TEXT,
    MT700_CTA_URL,
    MT700_DISCLAIMER_TEXT,
    InterpretResponse,
    MT700Field,
    MT700Flag,
    MT700InterpretRequest,
)
from app.schemas.query import CitationItem
from app.services.integrations.llm_client import LLMUnavailableError, OpenRouterLLMClient
from app.services.mt700 import flag_keywords, flag_soft_clauses, parse_mt700
from app.services.rag.citations import build_citations
from app.services.rag.generator import answer_mentions_unknown_references, compose_citations_only_answer
from app.services.rag.models import ClassifierOutput, RetrievedRule
from app.services.rag.rulhub_retriever import RetrievalUnavailableError, get_rulhub_retriever

router = APIRouter(prefix="/api/interpret", tags=["interpret"])

llm_client = OpenRouterLLMClient()

INVALID_MT700_MESSAGE = (
    "That doesn't look like an MT700 message. Paste the raw SWIFT text including :tag: markers."
)

RETRIEVAL_UNAVAILABLE_MESSAGE = (
    "Rule retrieval is temporarily unavailable. Your interpretation was not counted against "
    "your quota — please try again in a few minutes."
)

MT700_SYSTEM_PROMPT = """You are RulGPT's MT700 interpreter, a senior documentary credit examiner built by Enso Intelligence.

You are given the parsed SWIFT MT700 (documentary credit issuance) fields, any soft-clause flags already detected by a deterministic parser, and a set of retrieved trade finance rules.

Rules:
1. Explain the message field-by-field, but ONLY the fields actually given to you below. Never invent or assume a field that was not parsed.
2. Call out any risky or soft-clause wording explicitly and explain why it matters to a beneficiary or negotiating bank.
3. Cite only the retrieved rules provided below. Never invent a rule, article, or paragraph reference.
4. Write in plain, direct language a trade operations person would use. No legalese, no boilerplate, no markdown headings. Do not use em-dashes anywhere; use commas, colons, or periods instead.
5. End with a short section that starts with the exact line "What to watch:" followed by a short bulleted list of the top risk items in this credit.

Output constraints:
- No markdown headings.
- Keep it tight — explain what matters, skip filler.
- If a field's wording is ambiguous or risky, say so plainly."""

_STRICT_CITATION_SUFFIX = (
    "\nSTRICT CITATION MODE: You may cite ONLY the exact [rulebook reference] pairs present "
    "in the retrieved rules below. Do not mention any other article, publication, paragraph, "
    "or rule number."
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _day_start(dt: datetime) -> datetime:
    return dt.replace(hour=0, minute=0, second=0, microsecond=0)


def _client_ip(request: Request) -> str:
    return _resolve_client_ip(request) or "unknown"


def _mt700_calls_today_by_user(db: Session, user_id) -> int:
    day_start = _day_start(_utc_now())
    total = db.scalar(
        select(func.count(RuleGPTQuery.id)).where(
            RuleGPTQuery.user_id == user_id,
            RuleGPTQuery.routing_tier == "mt700",
            RuleGPTQuery.created_at >= day_start,
        )
    )
    return int(total or 0)


def _mt700_calls_today_by_ip(db: Session, client_ip: str) -> int:
    day_start = _day_start(_utc_now())
    total = db.scalar(
        select(func.count(RuleGPTQuery.id))
        .join(RuleGPTSession, RuleGPTQuery.session_id == RuleGPTSession.id)
        .where(
            RuleGPTSession.client_ip == client_ip,
            RuleGPTQuery.routing_tier == "mt700",
            RuleGPTQuery.created_at >= day_start,
        )
    )
    return int(total or 0)


def _render_rules(rules: list[RetrievedRule]) -> str:
    if not rules:
        return "[]"
    chunks = []
    for rule in rules:
        chunks.append(
            {
                "rulebook": rule.rulebook,
                "reference": rule.reference,
                "title": rule.title,
                "excerpt": rule.excerpt[:500],
            }
        )
    return str(chunks)


def _build_user_prompt(fields: list[dict], flags: list[dict], retrieved_rules: list[RetrievedRule]) -> str:
    field_lines = "\n".join(f":{f['tag']}: ({f['name']}) {f['content']}" for f in fields)
    flag_lines = "\n".join(f"- {f['tag']} ({f['name']}): {f['note']}" for f in flags) or "None detected."
    return (
        f"Parsed MT700 fields:\n{field_lines}\n\n"
        f"Soft-clause flags already detected by the parser:\n{flag_lines}\n\n"
        f"Retrieved rules (cite only these):\n{_render_rules(retrieved_rules)}\n\n"
        "Explain this documentary credit issuance message field-by-field, flag the risky wording, "
        "cite only the retrieved rules above, and end with a 'What to watch:' list."
    )


async def _generate_mt700_answer(fields: list[dict], flags: list[dict], retrieved_rules: list[RetrievedRule]) -> str:
    prompt = _build_user_prompt(fields, flags, retrieved_rules)
    try:
        first_res = await llm_client.generate_answer(prompt, MT700_SYSTEM_PROMPT, max_tokens=1200, temperature=0.2)
        answer = sanitize_outbound((first_res.text or "").strip())
        if answer and answer_mentions_unknown_references(answer, retrieved_rules):
            strict_prompt = MT700_SYSTEM_PROMPT + _STRICT_CITATION_SUFFIX
            retry_res = await llm_client.generate_answer(prompt, strict_prompt, max_tokens=1200, temperature=0.2)
            retry_answer = sanitize_outbound((retry_res.text or "").strip())
            if retry_answer and answer_mentions_unknown_references(retry_answer, retrieved_rules):
                return compose_citations_only_answer("MT700 interpretation", retrieved_rules)
            return retry_answer
        if not answer:
            return compose_citations_only_answer("MT700 interpretation", retrieved_rules)
        return answer
    except LLMUnavailableError:
        return compose_citations_only_answer("MT700 interpretation", retrieved_rules)


def _persist_mt700_result(
    db: Session,
    request: Request,
    raw_text: str,
    fields: list[dict],
    flags: list[dict],
    answer: str,
    citation_items: list[CitationItem],
    retrieved_rules: list[RetrievedRule],
) -> None:
    user_id = getattr(request.state, "user_id", None)
    tier = getattr(request.state, "user_tier", "anonymous")
    ip = _client_ip(request)

    session_obj = RuleGPTSession(
        session_token=str(uuid.uuid4()),
        user_id=user_id,
        tier=tier,
        client_ip=ip,
        language="en",
        started_at=_utc_now(),
        last_active_at=_utc_now(),
    )
    query_row = RuleGPTQuery(
        session=session_obj,
        user_id=user_id,
        query_text=raw_text,
        query_domain="icc",
        query_jurisdiction="global",
        query_complexity="interpretation",
        retrieved_rule_ids=[r.rule_id for r in retrieved_rules],
        answer_text=answer,
        confidence_band="medium" if citation_items else "low",
        citations=[c.model_dump() for c in citation_items],
        model_used="mt700-interpreter",
        classifier_model="heuristic",
        show_trdr_cta=False,
        ice_training_eligible=False,
        routing_tier="mt700",
    )
    db.add(session_obj)
    db.add(query_row)
    db.commit()


@router.post("/mt700", response_model=InterpretResponse)
async def interpret_mt700(
    payload: MT700InterpretRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> InterpretResponse:
    fields = parse_mt700(payload.text)
    if len(fields) < 3:
        raise HTTPException(status_code=422, detail=INVALID_MT700_MESSAGE)

    flags = flag_soft_clauses(fields)

    user_id = getattr(request.state, "user_id", None)
    is_authenticated = bool(getattr(request.state, "is_authenticated", False)) and user_id is not None
    client_ip = _client_ip(request)

    if is_authenticated:
        limit = settings.MT700_DAILY_LIMIT_AUTH
        used = _mt700_calls_today_by_user(db, user_id)
    else:
        limit = settings.MT700_DAILY_LIMIT_ANON
        used = _mt700_calls_today_by_ip(db, client_ip)

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"You've used your {limit} free MT700 interpretations for today. "
                "Try again tomorrow, or upgrade to Pro for a higher daily limit."
            ),
        )

    classification = ClassifierOutput(
        domain="icc",
        jurisdiction="global",
        document_type="lc",
        complexity="interpretation",
        in_scope=True,
        commodity=None,
        reason=None,
    )

    search_queries = ["documentary credit issuance UCP600 examination"]
    if flags:
        keywords = flag_keywords(flags)
        if keywords.strip():
            search_queries.append(keywords)

    retriever = get_rulhub_retriever()
    retrieved_rules: list[RetrievedRule] = []
    seen_ids: set[str] = set()
    try:
        for search_query in search_queries:
            results = await retriever.retrieve(session=db, query=search_query, classification=classification, top_k=5)
            for rule in results:
                if rule.rule_id not in seen_ids:
                    seen_ids.add(rule.rule_id)
                    retrieved_rules.append(rule)
    except RetrievalUnavailableError:
        return InterpretResponse(
            fields=[MT700Field(**f) for f in fields],
            flags=[MT700Flag(**f) for f in flags],
            answer=RETRIEVAL_UNAVAILABLE_MESSAGE,
            citations=[],
            disclaimer=MT700_DISCLAIMER_TEXT,
            cta_text=MT700_CTA_TEXT,
            cta_url=MT700_CTA_URL,
        )

    answer = await _generate_mt700_answer(fields, flags, retrieved_rules)

    citations = build_citations(answer=answer, retrieved_rules=retrieved_rules, max_items=8)
    citation_items = [CitationItem(**c.model_dump()) for c in citations]

    _persist_mt700_result(db, request, payload.text, fields, flags, answer, citation_items, retrieved_rules)

    return InterpretResponse(
        fields=[MT700Field(**f) for f in fields],
        flags=[MT700Flag(**f) for f in flags],
        answer=answer,
        citations=citation_items,
        disclaimer=MT700_DISCLAIMER_TEXT,
        cta_text=MT700_CTA_TEXT,
        cta_url=MT700_CTA_URL,
    )
