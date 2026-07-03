"""Artifact generation — case notes and draft correspondence built from a
previously answered chat query. Pure generation logic; HTTP orchestration
(entitlement gating, 404s, response shaping) lives in `app.routers.artifacts`.
"""

from __future__ import annotations

from typing import Any, Sequence

from app.services.integrations.llm_client import LLMUnavailableError
from app.services.rag.generator import answer_mentions_unknown_references, compose_citations_only_answer
from app.services.rag.models import RetrievedRule

CASE_NOTE_HEADINGS = [
    "Short answer",
    "Rule basis",
    "Risk level",
    "Reasoning",
    "Action steps",
    "Assumptions / missing facts",
]

CASE_NOTE_SYSTEM_PROMPT = f"""You are RulGPT's case note generator, writing an internal case file memo for a trade operations professional.

You are given a previously answered trade finance question, RulGPT's answer to it, and the citations that grounded that answer.

Structure the memo with EXACTLY these six headings, in this order, each on its own line followed by its content:
{chr(10).join(CASE_NOTE_HEADINGS)}

Rules:
1. Cite only the citations provided below. Never invent a rule, article, or paragraph reference.
2. Ground every claim in the stored question, answer, and citations given — do not introduce new facts.
3. Keep the whole memo to 450 words or fewer.
4. Write like a trade operations professional writing an internal case file note. No legalese, no filler, no AI-report preambles.
5. Use the exact heading text given above, one per line, immediately followed by that section's content."""

_DRAFT_DESCRIPTIONS: dict[str, str] = {
    "bank_response": (
        "a formal response to a bank's discrepancy or documentary query, written from the "
        "beneficiary's or presenting bank's side"
    ),
    "buyer_email": (
        "a professional email to the buyer/applicant explaining a documentary or shipment "
        "issue and what happens next"
    ),
    "waiver_request": (
        "a waiver request letter asking the applicant or issuing bank to waive a specific "
        "discrepancy and accept the documents as presented"
    ),
    "amendment_request": (
        "a formal request to the applicant or issuing bank asking for a specific amendment to "
        "the documentary credit"
    ),
    "discrepancy_explanation": (
        "a plain-language explanation of a documentary discrepancy addressed to a counterparty "
        "who needs to understand what went wrong and why"
    ),
}


def _draft_system_prompt(draft_type: str) -> str:
    description = _DRAFT_DESCRIPTIONS[draft_type]
    return (
        "You are RulGPT's trade finance correspondence drafter.\n\n"
        f"Draft {description}, grounded in the stored question, answer, and citations given below.\n\n"
        "Rules:\n"
        "1. Write in a professional correspondence voice — the tone of a competent trade "
        "operations professional, not a generic AI assistant.\n"
        "2. Ground every claim in the stored question, answer, and citations — do not introduce "
        "facts that aren't there.\n"
        "3. Cite only the citations provided. Never invent a rule, article, or paragraph reference.\n"
        "4. Use bracketed placeholders like [Bank name], [LC number], [Date] for any specific "
        "detail that isn't in the stored context.\n"
        "5. Keep the whole draft to 350 words or fewer.\n"
        "6. No markdown headings. Write it as a ready-to-send letter or email body."
    )


DRAFT_SYSTEM_PROMPTS: dict[str, str] = {
    draft_type: _draft_system_prompt(draft_type) for draft_type in _DRAFT_DESCRIPTIONS
}

_STRICT_CITATION_SUFFIX = (
    "\nSTRICT CITATION MODE: You may cite ONLY the exact [rulebook reference] pairs present "
    "in the citations below. Do not mention any other article, publication, paragraph, or rule number."
)


def _render_citations(citations: Sequence[dict]) -> str:
    if not citations:
        return "[]"
    chunks = []
    for c in citations:
        chunks.append(
            {
                "rulebook": c.get("rulebook"),
                "reference": c.get("reference"),
                "excerpt": (c.get("excerpt") or "")[:400],
            }
        )
    return str(chunks)


def _citations_to_retrieved_rules(citations: Sequence[dict]) -> list[RetrievedRule]:
    rules: list[RetrievedRule] = []
    for c in citations:
        rules.append(
            RetrievedRule(
                rule_id=c.get("rule_id") or "",
                rulebook=c.get("rulebook") or "unknown",
                reference=c.get("reference") or "",
                title=c.get("rulebook") or "",
                excerpt=c.get("excerpt") or "",
            )
        )
    return rules


def _build_user_prompt(query_text: str, answer_text: str, citations: Sequence[dict]) -> str:
    return (
        f"Original question: {query_text}\n\n"
        f"RulGPT's answer: {answer_text}\n\n"
        f"Citations (cite only these):\n{_render_citations(citations)}\n"
    )


async def _generate_with_citation_validation(
    llm_client: Any,
    system_prompt: str,
    user_prompt: str,
    retrieved_rules: list[RetrievedRule],
    max_tokens: int,
) -> tuple[str, bool]:
    """Retry-once-then-citations-only degrade, mirroring the pattern used
    for chat generation (`AnswerGenerator.generate`) and the MT700
    interpreter (`app.routers.interpret._generate_mt700_answer`).

    Returns `(body_text, degraded)`. `degraded=True` means the LLM path
    never produced a clean, citation-valid synthesis and the caller fell
    back to `compose_citations_only_answer` — a non-synthesized artifact.
    The router uses this to avoid burning a one-off credit on a degraded
    result (see `app.routers.artifacts`).
    """
    try:
        first_res = await llm_client.generate_answer(user_prompt, system_prompt, max_tokens=max_tokens, temperature=0.2)
        text = (first_res.text or "").strip()
        if text and answer_mentions_unknown_references(text, retrieved_rules):
            strict_prompt = system_prompt + _STRICT_CITATION_SUFFIX
            retry_res = await llm_client.generate_answer(user_prompt, strict_prompt, max_tokens=max_tokens, temperature=0.2)
            retry_text = (retry_res.text or "").strip()
            if retry_text and answer_mentions_unknown_references(retry_text, retrieved_rules):
                return compose_citations_only_answer("artifact", retrieved_rules), True
            return retry_text, False
        if not text:
            return compose_citations_only_answer("artifact", retrieved_rules), True
        return text, False
    except LLMUnavailableError:
        return compose_citations_only_answer("artifact", retrieved_rules), True


async def generate_case_note(llm_client: Any, query_text: str, answer_text: str, citations: Sequence[dict]) -> dict[str, Any]:
    retrieved_rules = _citations_to_retrieved_rules(citations)
    user_prompt = _build_user_prompt(query_text, answer_text, citations)
    body, degraded = await _generate_with_citation_validation(
        llm_client, CASE_NOTE_SYSTEM_PROMPT, user_prompt, retrieved_rules, max_tokens=900
    )
    return {
        "title": f"Case note: {query_text[:80]}",
        "body_markdown": body,
        "citations": list(citations),
        "degraded": degraded,
    }


async def generate_draft(
    llm_client: Any, query_text: str, answer_text: str, citations: Sequence[dict], draft_type: str
) -> dict[str, Any]:
    system_prompt = DRAFT_SYSTEM_PROMPTS[draft_type]
    retrieved_rules = _citations_to_retrieved_rules(citations)
    user_prompt = _build_user_prompt(query_text, answer_text, citations)
    body, degraded = await _generate_with_citation_validation(
        llm_client, system_prompt, user_prompt, retrieved_rules, max_tokens=700
    )
    return {
        "title": f"Draft ({draft_type.replace('_', ' ').title()}): {query_text[:80]}",
        "body_markdown": body,
        "citations": list(citations),
        "draft_type": draft_type,
        "degraded": degraded,
    }
