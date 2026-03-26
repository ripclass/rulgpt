"""Answer generation service with Claude primary + GPT fallback."""

from __future__ import annotations

from datetime import date
import re
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .models import ClassifierOutput, RetrievedRule
from .query_intent import (
    expected_document_families,
    extract_countries,
    extract_fta_agreement,
    has_partial_coverage_language,
    requires_document_breadth,
)

RULEGPT_SYSTEM_PROMPT_TEMPLATE = """You are RuleGPT, a senior trade finance documentary and compliance specialist built by Enso Intelligence.

Your job is to democratize high-quality trade finance rule interpretation without lowering the standard of accuracy.
You think like an experienced documentary-credit reviewer, sanctions analyst, customs specialist, and trade operations advisor.
You are precise, conservative, and commercially useful.

You answer questions about:
- ICC standards such as UCP600, ISBP745, ISP98, URDG758, URC522, URR725, eUCP 2.1, and Incoterms 2020
- Trade documentation requirements and documentary presentation risk
- Sanctions and restricted-party trade controls
- FTA rules of origin and proof-of-origin requirements
- Customs and import/export rule requirements
- Bank-specific LC and trade operations requirements

Non-negotiable rules:
1. The retrieved rules are your authoritative source. Never invent a rule, article, paragraph, or requirement.
2. If a point is not clearly supported by the retrieved rules, say that explicitly.
3. Distinguish between:
   - what the retrieved rules clearly support
   - what still depends on transaction facts, LC wording, jurisdiction, bank practice, shipment mode, or missing rules
4. Do not present a partial rule set as a complete answer.
5. Never say a transaction is definitely compliant. You explain rules; you do not approve transactions or validate actual documents.
6. If the user appears to need document validation, say that document-level validation is outside this chat and keep the response product-neutral.
7. Write like a first-rate trade finance specialist speaking to a busy operator, not to another expert and not like a generic chatbot.
   Be direct, specific, calm, and commercially useful.
8. No markdown headings. No legalese. No fluffy filler. No follow-up question section inside the answer body.
9. Do not sound like an AI report. Avoid preambles such as "Based on the retrieved rules" or "The retrieved rules clearly support" unless they are strictly needed for safety.

Output style:
- Start with a one- or two-sentence direct answer in plain spoken English.
- Then, if needed, use up to 3 short bullets for distinct rule points.
- If important context is missing, include a short line beginning exactly with:
  What still depends on your transaction:
- For simple and interpretation questions, aim for roughly 60 to 140 words.
- For complex questions, stay under roughly 220 words unless the rules genuinely require more.
- Keep it concise but complete.

Current date: {current_date}
User tier: {user_tier}
Retrieved rules: {retrieved_rules}"""


DISCLAIMER_TEXT = (
    "Based on published trade finance rules and standards. Not legal advice. "
    "Consult a qualified trade finance professional for your specific transaction."
)


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


def _build_user_prompt(
    query: str,
    retrieved_rules: Sequence[RetrievedRule],
    complexity: str,
    classifier_output: ClassifierOutput,
) -> str:
    gaps = _identify_context_gaps(query, classifier_output)
    detected_context = {
        "domain": classifier_output.domain,
        "jurisdiction": classifier_output.jurisdiction,
        "document_type": classifier_output.document_type,
        "commodity": classifier_output.commodity,
        "complexity": complexity,
    }
    return (
        f"User query: {query}\n"
        f"Detected context: {detected_context}\n"
        f"Important missing facts: {gaps or 'none'}\n"
        "Use only the retrieved rules below. Cite each substantive claim inline using "
        "rulebook name + article/paragraph.\n"
        "Do not mention any article, paragraph, rulebook, or requirement that is not present in the retrieved rules.\n"
        "Write like a capable trade operations person talking to a user. Do not sound like a report, memo, or AI essay.\n"
        "Write plain chat prose. Do not use markdown headings. Do not add a follow-up questions section in the answer body.\n"
        "Open with the answer immediately. Do not start with phrases like 'Based on the retrieved rules' or 'The retrieved rules show'.\n"
        "Keep the answer tight: 1 short opening paragraph, then at most 3 short bullets only if they add real value.\n"
        "If the rules only cover part of the question, say exactly which part is grounded and which part is not covered.\n"
        "If precision depends on missing facts, state them under a line that starts with 'What still depends on your transaction:'.\n"
        "If the user asked a broad trade question, narrow it intelligently into the document, rule, jurisdiction, bank, or shipment facts that matter most.\n\n"
        f"Retrieved rules:\n{_render_retrieved_rules(retrieved_rules)}"
    )


def _render_retrieved_rules(rules: Sequence[RetrievedRule]) -> str:
    if not rules:
        return "[]"
    chunks = []
    for rule in rules:
        chunks.append(
            {
                "rule_id": rule.rule_id,
                "rulebook": rule.rulebook,
                "reference": rule.reference,
                "title": rule.title,
                "excerpt": rule.excerpt[:500],
                "score": round(rule.rerank_score, 4),
            }
        )
    return str(chunks)


def _rule_cta_trigger(query: str) -> bool:
    lowered = query.lower()
    return any(
        marker in lowered
        for marker in (
            "discrepanc",
            "document validation",
            "is this lc compliant",
            "review my lc",
            "validate lc",
        )
    )


def _identify_context_gaps(query: str, classifier_output: ClassifierOutput) -> list[str]:
    lowered = query.lower()
    gaps: list[str] = []

    if classifier_output.domain in {"fta", "customs", "sanctions"} and classifier_output.jurisdiction == "global":
        gaps.append("relevant country or jurisdiction")
    if classifier_output.domain == "bank_specific" and "bank" not in lowered:
        gaps.append("issuing or confirming bank")
    if classifier_output.domain == "icc":
        if classifier_output.document_type == "other" and any(
            token in lowered for token in ("document", "documents", "presentation", "discrep", "comply", "required")
        ):
            gaps.append("which document type is at issue")
        if "lc" not in lowered and "letter of credit" not in lowered and any(
            token in lowered for token in ("invoice", "bill of lading", "insurance")
        ):
            gaps.append("whether this is under an LC or a general trade term question")
    if any(token in lowered for token in ("cif", "fob", "cip", "dap")) and "incoterm" not in lowered:
        gaps.append("whether the Incoterm is being used in the LC wording or only in the sales contract")
    return gaps


def _rule_metadata(rule: RetrievedRule) -> dict[str, Any]:
    raw_detail = rule.metadata.get("raw_detail")
    if isinstance(raw_detail, dict):
        metadata = raw_detail.get("metadata")
        if isinstance(metadata, dict):
            return metadata
    return {}


def _find_fta_scope_rule(rules: Sequence[RetrievedRule], agreement: str | None) -> RetrievedRule | None:
    if agreement is None:
        return None
    for rule in rules:
        haystack = f"{rule.rulebook} {rule.title} {rule.reference}".lower()
        if agreement in haystack and ("membership" in haystack or "scope" in haystack):
            return rule
        metadata = _rule_metadata(rule)
        members = metadata.get("members")
        if isinstance(members, list) and ("membership" in haystack or "scope" in haystack):
            return rule
    return None


def _fta_member_countries(rule: RetrievedRule) -> set[str]:
    metadata = _rule_metadata(rule)
    members = metadata.get("members")
    out: set[str] = set()
    if not isinstance(members, list):
        return out
    for item in members:
        if isinstance(item, dict):
            country = item.get("country")
            if isinstance(country, str) and country.strip():
                out.add(country.strip().lower())
        elif isinstance(item, str) and item.strip():
            out.add(item.strip().lower())
    return out


def _compose_fta_answer(query: str, rules: Sequence[RetrievedRule], partial_coverage: bool) -> str:
    agreement = extract_fta_agreement(query)
    mentioned_countries = extract_countries(query)
    scope_rule = _find_fta_scope_rule(rules, agreement)
    origin_rule = next((rule for rule in rules if "origin" in f"{rule.title} {rule.reference}".lower()), None)
    proof_rule = next(
        (
            rule
            for rule in rules
            if any(token in f"{rule.title} {rule.reference} {rule.excerpt}".lower() for token in ("certificate of origin", "declaration of origin", "coo"))
        ),
        None,
    )

    if scope_rule is None:
        return _compose_generic_grounded_answer(rules, partial_coverage=partial_coverage)

    member_countries = _fta_member_countries(scope_rule)
    non_member_countries = sorted(country for country in mentioned_countries if member_countries and country not in member_countries)
    lines: List[str] = []

    if non_member_countries and agreement:
        country_name = non_member_countries[0].title()
        lines.append(
            f"No. {country_name} is not an {agreement.upper()} member, so goods exported from {country_name} cannot claim {agreement.upper()} preferential treatment on that basis. [{scope_rule.rulebook} {scope_rule.reference}]"
        )
    else:
        lines.append(
            f"Maybe, but only if the product meets the {agreement.upper() if agreement else 'FTA'} origin rule and the proof-of-origin requirements. "
            f"[{scope_rule.rulebook} {scope_rule.reference}]"
        )

    lines.append(f"- Scope: [{scope_rule.rulebook} {scope_rule.reference}] {_first_sentence(scope_rule.excerpt)}")
    if origin_rule is not None:
        lines.append(f"- Origin rule: [{origin_rule.rulebook} {origin_rule.reference}] {_first_sentence(origin_rule.excerpt)}")
    if proof_rule is not None:
        lines.append(f"- Proof: [{proof_rule.rulebook} {proof_rule.reference}] {_first_sentence(proof_rule.excerpt)}")

    dependency_parts: List[str] = []
    if non_member_countries:
        dependency_parts.append("whether you meant another FTA, another production country, or processing in a qualifying member state")
    else:
        dependency_parts.append("the product-specific rule for the garment HS code")
        dependency_parts.append("where the fabric, yarn, and processing steps originate")
    if proof_rule is not None:
        dependency_parts.append("whether the required proof of origin can be issued correctly")

    if dependency_parts:
        lines.append("What still depends on your transaction: " + "; ".join(dependency_parts) + ".")
    elif partial_coverage:
        lines.append("What still depends on your transaction: the retrieved rules only cover part of the agreement analysis.")

    return "\n\n".join(lines).strip()


def _compose_generic_grounded_answer(rules: Sequence[RetrievedRule], partial_coverage: bool = False) -> str:
    top = rules[:3]
    lead_rule = top[0]
    lead_summary = _first_sentence(lead_rule.excerpt) or "Relevant guidance is available in this rule."
    lines: List[str] = []
    lines.append(f"{lead_summary} [{lead_rule.rulebook} {lead_rule.reference}]")
    for rule in top[1:]:
        ref = f"{rule.rulebook} {rule.reference}".strip()
        excerpt = _first_sentence(rule.excerpt) or "Relevant guidance is available in this rule."
        lines.append(f"- [{ref}] {excerpt}")
    if partial_coverage:
        lines.append("What still depends on your transaction: the retrieved rules only cover part of the question, so I would not treat this as complete coverage.")
    return "\n\n".join(lines).strip()


def _normalize_citation_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def _first_sentence(value: str) -> str:
    text = " ".join((value or "").split())
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)
    return parts[0].strip()


def _rule_family(rule: RetrievedRule) -> str:
    haystack = f"{rule.title} {rule.reference} {rule.excerpt}".lower()
    if "insurance" in haystack or "policy" in haystack:
        return "insurance"
    if "invoice" in haystack:
        return "invoice"
    if "bill of lading" in haystack or "transport document" in haystack or "b/l" in haystack:
        return "transport"
    if "discrep" in haystack:
        return "discrepancy"
    return "general"


def _covered_document_families(rules: Sequence[RetrievedRule]) -> set[str]:
    return {family for family in (_rule_family(rule) for rule in rules) if family in {"invoice", "transport", "insurance"}}


def assess_partial_coverage(query: str, rules: Sequence[RetrievedRule]) -> bool:
    if not rules:
        return True
    expected = expected_document_families(query)
    if not expected:
        return False
    return not expected.issubset(_covered_document_families(rules))


def _compose_document_breadth_answer(query: str, rules: Sequence[RetrievedRule], partial_coverage: bool) -> str:
    expected = expected_document_families(query)
    family_labels = {
        "invoice": "Commercial invoice",
        "transport": "Transport document / bill of lading",
        "insurance": "Insurance document",
    }
    representative_rules: dict[str, RetrievedRule] = {}
    fallback_rules: list[RetrievedRule] = []
    for rule in rules:
        family = _rule_family(rule)
        if family in expected and family not in representative_rules:
            representative_rules[family] = rule
        elif family == "general" and len(fallback_rules) < 2:
            fallback_rules.append(rule)

    lines: List[str] = []
    if partial_coverage:
        lines.append("I can only confirm part of the document set for this CIF/UCP600-style question.")
    else:
        lines.append("Here is the document set I can clearly support from the rules I retrieved.")

    supported_lines: List[str] = []
    for family in ("invoice", "transport", "insurance"):
        rule = representative_rules.get(family)
        if rule is None:
            continue
        summary = _first_sentence(rule.excerpt) or "Relevant guidance is available in this rule."
        supported_lines.append(f"- {family_labels[family]}: [{rule.rulebook} {rule.reference}] {summary}")

    for rule in fallback_rules:
        summary = _first_sentence(rule.excerpt) or "Relevant guidance is available in this rule."
        supported_lines.append(f"- [{rule.rulebook} {rule.reference}] {summary}")

    if supported_lines:
        lines.extend(supported_lines)

    missing = [family_labels[family].lower() for family in ("invoice", "transport", "insurance") if family in expected and family not in representative_rules]
    if missing:
        missing_text = ", ".join(missing[:-1]) + (f" and {missing[-1]}" if len(missing) > 1 else missing[0])
        lines.append(
            "What still depends on your transaction: "
            f"the current retrieval does not clearly cover {missing_text}, and the LC wording, field 46A, bank practice, or missing rules may change the full document set."
        )

    return "\n\n".join(lines).strip()


def compose_grounded_answer(query: str, rules: Sequence[RetrievedRule], partial_coverage: bool = False) -> str:
    if not rules:
        return (
            "I don't have a specific rule covering that. Here's what related rules say: no closely matching rule was found in the current ruleset.",
        )

    if extract_fta_agreement(query):
        return _compose_fta_answer(query, rules, partial_coverage)

    if requires_document_breadth(query):
        return _compose_document_breadth_answer(query, rules, partial_coverage)

    return _compose_generic_grounded_answer(rules, partial_coverage=partial_coverage)


def _strip_markdown(answer: str) -> str:
    cleaned_lines: List[str] = []
    for raw_line in answer.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        if re.match(r"^#{1,6}\s+", stripped):
            stripped = re.sub(r"^#{1,6}\s+", "", stripped)
        if stripped in {"---", "***", "___"}:
            continue
        stripped = stripped.replace("**", "").replace("__", "")
        if stripped.startswith("> "):
            stripped = stripped[2:].strip()
        cleaned_lines.append(stripped)
    return "\n".join(cleaned_lines)


def _strip_followup_block(answer: str) -> str:
    lines = answer.splitlines()
    marker_prefixes = (
        "follow-up",
        "follow up",
        "questions you might have",
        "relevant follow-up",
    )
    filtered: List[str] = []
    for line in lines:
        lowered = line.strip().lower().rstrip(":")
        if any(lowered.startswith(prefix) for prefix in marker_prefixes):
            break
        filtered.append(line)

    end = len(filtered)
    while end > 0 and not filtered[end - 1].strip():
        end -= 1

    start = end
    while start > 0:
        stripped = filtered[start - 1].strip()
        if not stripped:
            break
        if (
            stripped.endswith("?")
            or stripped.lower().startswith(("would you like", "do you want", "should i"))
            or re.match(r"^\d+\.\s+.*\?$", stripped)
        ):
            start -= 1
            continue
        break

    if end - start >= 2:
        del filtered[start:end]

    return "\n".join(filtered)


def _collapse_whitespace(answer: str) -> str:
    lines = [line.rstrip() for line in answer.splitlines()]
    compacted: List[str] = []
    previous_blank = False
    for line in lines:
        if not line.strip():
            if not previous_blank:
                compacted.append("")
            previous_blank = True
            continue
        compacted.append(line.strip())
        previous_blank = False
    return "\n".join(compacted).strip()


def _tighten_answer_voice(answer: str) -> str:
    tightened = answer.strip()
    tightened = re.sub(r"^Based on the retrieved rules,\s*", "", tightened, flags=re.IGNORECASE)
    tightened = re.sub(r"^The retrieved rules (?:clearly )?(?:say|show|support) that\s*", "", tightened, flags=re.IGNORECASE)
    tightened = re.sub(r"^What the retrieved rules clearly (?:say|support):\s*", "", tightened, flags=re.IGNORECASE)
    tightened = re.sub(r"\n{3,}", "\n\n", tightened)
    return tightened.strip()


def _allowed_reference_tokens(rules: Sequence[RetrievedRule]) -> tuple[set[str], set[str]]:
    allowed_citations: set[str] = set()
    allowed_articles: set[str] = set()
    for rule in rules:
        allowed_citations.add(_normalize_citation_token(f"{rule.rulebook} {rule.reference}"))
        allowed_citations.add(_normalize_citation_token(rule.reference))
        allowed_articles.update(
            _normalize_citation_token(match.group(0))
            for match in re.finditer(r"article\s+\d+(?:\([a-z0-9]+\))?", rule.reference, flags=re.IGNORECASE)
        )
    return allowed_citations, allowed_articles


def answer_mentions_unknown_references(answer: str, rules: Sequence[RetrievedRule]) -> bool:
    allowed_citations, allowed_articles = _allowed_reference_tokens(rules)
    for bracketed in re.findall(r"\[([^\]]+)\]", answer):
        normalized = _normalize_citation_token(bracketed)
        if normalized and normalized not in allowed_citations:
            return True
    for match in re.finditer(r"article\s+\d+(?:\([a-z0-9]+\))?", answer, flags=re.IGNORECASE):
        normalized = _normalize_citation_token(match.group(0))
        if normalized and normalized not in allowed_articles:
            return True
    return False


def normalize_generated_answer(answer: str) -> str:
    return _tighten_answer_voice(_collapse_whitespace(_strip_followup_block(_strip_markdown(answer))))


def _generation_token_budget(complexity: str, partial_coverage: bool) -> int:
    if complexity == "complex":
        return 520
    if complexity == "interpretation":
        return 340
    if partial_coverage:
        return 260
    return 220


class AnswerGenerator:
    """Answer generation with model fallback and deterministic local fallback."""

    def __init__(self, anthropic_client: Optional[Any] = None, openai_client: Optional[Any] = None) -> None:
        self.anthropic_client = anthropic_client
        self.openai_client = openai_client

    async def _get_anthropic_client(self) -> Optional[Any]:
        if self.anthropic_client is not None:
            return self.anthropic_client
        try:
            from app.services.integrations.anthropic_client import AnthropicClient  # type: ignore

            self.anthropic_client = AnthropicClient()
            return self.anthropic_client
        except Exception:
            return None

    async def _get_openai_client(self) -> Optional[Any]:
        if self.openai_client is not None:
            return self.openai_client
        try:
            from app.services.integrations.openai_client import OpenAIClient  # type: ignore

            self.openai_client = OpenAIClient()
            return self.openai_client
        except Exception:
            return None

    async def _call_generation_method(
        self,
        client: Any,
        query: str,
        system_prompt: str,
        retrieved_rules: Sequence[RetrievedRule],
        complexity: str,
        classifier_output: ClassifierOutput,
        max_tokens: int,
    ) -> Optional[str]:
        prompt = _build_user_prompt(query, retrieved_rules, complexity, classifier_output)
        if hasattr(client, "generate_answer"):
            output = await _maybe_await(
                client.generate_answer(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=0.1,
                    extended_thinking=complexity == "complex",
                )
            )
            return str(output) if output else None
        if hasattr(client, "generate_fallback"):
            output = await _maybe_await(
                client.generate_fallback(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    max_tokens=max_tokens,
                    temperature=0.1,
                )
            )
            return str(output) if output else None
        if hasattr(client, "generate"):
            output = await _maybe_await(
                client.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                )
            )
            return str(output) if output else None
        return None

    async def generate(
        self,
        query: str,
        retrieved_rules: Sequence[RetrievedRule],
        classifier_output: ClassifierOutput,
        user_tier: str = "anonymous",
    ) -> Dict[str, Any]:
        partial_coverage = assess_partial_coverage(query, retrieved_rules)
        if requires_document_breadth(query):
            return {
                "answer": compose_grounded_answer(query, retrieved_rules, partial_coverage=partial_coverage),
                "model_used": "grounded_fallback",
                "partial_coverage": partial_coverage,
            }

        token_budget = _generation_token_budget(classifier_output.complexity, partial_coverage)

        system_prompt = RULEGPT_SYSTEM_PROMPT_TEMPLATE.format(
            current_date=date.today().isoformat(),
            user_tier=user_tier,
            retrieved_rules=_render_retrieved_rules(retrieved_rules),
        )

        anthropic = await self._get_anthropic_client()
        if anthropic is not None:
            try:
                answer = await self._call_generation_method(
                    anthropic,
                    query=query,
                    system_prompt=system_prompt,
                    retrieved_rules=retrieved_rules,
                    complexity=classifier_output.complexity,
                    classifier_output=classifier_output,
                    max_tokens=token_budget,
                )
                if answer:
                    normalized = normalize_generated_answer(answer)
                    if normalized and not answer_mentions_unknown_references(normalized, retrieved_rules):
                        if partial_coverage and not has_partial_coverage_language(normalized):
                            normalized = compose_grounded_answer(query, retrieved_rules, partial_coverage=True)
                            return {
                                "answer": normalized,
                                "model_used": "grounded_fallback",
                                "partial_coverage": True,
                            }
                        return {
                            "answer": normalized,
                            "model_used": "claude-sonnet-4-6",
                            "partial_coverage": partial_coverage,
                        }
            except Exception:
                pass

        openai = await self._get_openai_client()
        if openai is not None:
            try:
                answer = await self._call_generation_method(
                    openai,
                    query=query,
                    system_prompt=system_prompt,
                    retrieved_rules=retrieved_rules,
                    complexity=classifier_output.complexity,
                    classifier_output=classifier_output,
                    max_tokens=token_budget,
                )
                if answer:
                    normalized = normalize_generated_answer(answer)
                    if normalized and not answer_mentions_unknown_references(normalized, retrieved_rules):
                        if partial_coverage and not has_partial_coverage_language(normalized):
                            normalized = compose_grounded_answer(query, retrieved_rules, partial_coverage=True)
                            return {
                                "answer": normalized,
                                "model_used": "grounded_fallback",
                                "partial_coverage": True,
                            }
                        return {
                            "answer": normalized,
                            "model_used": "gpt-4.1",
                            "partial_coverage": partial_coverage,
                        }
            except Exception:
                pass

        answer = compose_grounded_answer(query, retrieved_rules, partial_coverage=partial_coverage)
        return {"answer": answer, "model_used": "fallback", "partial_coverage": partial_coverage}

    @staticmethod
    def suggested_followups(query: str, classifier: ClassifierOutput) -> List[str]:
        if requires_document_breadth(query):
            return [
                "Do you want each document requirement mapped article by article?",
                "Should I separate UCP600 requirements from Incoterms-only obligations?",
                "Do you want the missing document types flagged explicitly if coverage is partial?",
            ]
        if classifier.domain == "sanctions":
            return [
                "Which sanctions regime matters most here: OFAC, EU, UN, or UK?",
                "Do you want a screening checklist for counterparties, banks, and vessels?",
                "Should I compare how this issue is treated across multiple sanctions regimes?",
            ]
        if classifier.domain == "fta":
            return [
                "Which country pair and HS classification are you testing under this FTA?",
                "Do you want the proof-of-origin and document checklist?",
                "Should I separate agreement scope from product-specific origin rules?",
            ]
        if _rule_cta_trigger(query):
            return [
                "Do you want the discrepancy points mapped article by article?",
                "Should I translate this into likely bank examination points?",
                "Do you want the document-level issues separated from the rule explanation?",
            ]
        if classifier.domain == "icc":
            return [
                "Which document are you checking first: invoice, bill of lading, or insurance?",
                "Is this under a specific LC, or are you asking about the rule generally?",
                "Should I separate mandatory rule requirements from bank-practice issues?",
            ]
        return [
            "Which jurisdiction or country does this transaction involve?",
            "Should I break this down into an operational checklist?",
            "Do you want the closest related rules if the coverage is only partial?",
        ]
