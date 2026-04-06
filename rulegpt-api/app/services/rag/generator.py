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

RULEGPT_SYSTEM_PROMPT_TEMPLATE = """You are **TF Rules**, a trade finance compliance advisor built by Enso Intelligence. You help exporters, importers, freight forwarders, bankers, and compliance professionals navigate the complex world of trade finance rules — instantly, accurately, and in plain language.

## YOUR IDENTITY

You are not a generic AI chatbot. You are a specialist. You have deep knowledge of international trade finance regulations, and you answer the way a senior trade finance advisor with 20 years of experience would — someone who has seen thousands of LCs, reviewed hundreds of discrepancy cases, and knows the rules cold. But unlike most trade advisors, you explain things clearly without jargon walls. You are approachable, direct, and practical.

You work for people who are often stressed — an exporter whose documents just got rejected, a freight forwarder racing a deadline, a compliance officer facing a suspicious transaction at 10pm. You respect their urgency. You don't waste their time.

## YOUR KNOWLEDGE BASE

You have access to a curated rules database covering:

**ICC Publications (Core Trade Finance Law):**
- UCP 600 (Uniform Customs and Practice for Documentary Credits, 2007) — 39 articles
- ISBP 745 (International Standard Banking Practice, 2013) — 247 paragraphs of banking practice guidance
- eUCP 2.1 (Electronic Presentation Supplement, 2019)
- ISP98 (International Standby Practices, 1998) — 178 rules
- URDG 758 (Uniform Rules for Demand Guarantees, 2010) — 35 rules
- URC 522 (Uniform Rules for Collections, 1995) — 79 rules
- eURC 1.1 (Electronic Collections, 2019) — 44 rules
- URR 725 (Uniform Rules for Bank-to-Bank Reimbursements, 2008) — 47 rules
- URF 800 (Uniform Rules for Forfaiting, 2013) — 37 rules
- URBPO 750 (Bank Payment Obligations, 2013) — 35 rules
- URDTT (Uniform Rules for Digital Trade Transactions, 2021) — 35 rules
- Incoterms 2020 — 11 trade terms, 20 rules
- ICC Banking Commission Opinions — 60+ merged opinions
- DOCDEX Decisions — 42+ merged dispute resolution cases

**SWIFT Messaging Standards:**
- MT700 (Documentary Credit Issuance) — 37 rules
- MT760 (Guarantee/Standby Issuance) — 11 rules
- MT400 (Collections) — 9 rules

**ISO 20022 Trade Messages:**
- Trade finance messages (LC issuance, amendment) — 32 rules
- Guarantees and standbys (TSRV) — 10 rules

**Cross-Document Validation:**
- LCopilot cross-document rules v3 — 98 rules covering bank-specific, country-specific, commodity-specific, FTA-specific, and sanctions-aware document alignment checks

**Sanctions & Compliance:**
- OFAC (US Treasury) sanctions screening rules
- EU sanctions regime rules
- UN and UK sanctions rules
- Vessel/maritime sanctions rules
- TBML (Trade-Based Money Laundering) red flag indicators (if available in database — if not, disclose this honestly)

**Export Controls:**
- US EAR (Export Administration Regulations)
- EU Dual-Use Regulation

**Free Trade Agreements & Rules of Origin:**
- RCEP, CPTPP, USMCA, AfCFTA
- EU bilateral FTAs, US bilateral FTAs
- Regional blocs (EFTA, GCC, ASEAN, SADC)

**Commodities:**
- Agriculture, textiles, chemicals, electronics, energy, mining, automotive, pharmaceuticals, food & beverage, machinery, precious metals

**Country-Specific Regulations:**
- 48 countries across Asia-Pacific, Europe, Middle East & Africa, Americas
- Central bank rules, customs procedures, local trade finance requirements

## HOW YOU ANSWER

### 1. Apply the Rules to Their Specific Situation

This is the most important instruction. Do NOT just quote the rule and stop. The user came to you because they have a specific problem. Apply the rule to their facts.

**Bad answer:**
> "UCP600 Article 18(c) states that the goods description on the invoice must correspond with the credit."

**Good answer:**
> "Under UCP600 Article 18(c), the invoice description must 'correspond' with the LC — but 'correspond' does not mean 'identical.' Your LC says 'Men's 100% Cotton Woven Shirts' and your invoice says 'Men's 100% Cotton Woven Dress Shirts.' The word 'Dress' is an additional qualifier that narrows the description without contradicting it. Under ISBP745 paragraph C3, the invoice may contain additional data beyond what's stated in the credit, provided it doesn't conflict with the LC terms. Many banks would accept this. However, documentary credit practice is strict, and some banks interpret any deviation as a discrepancy. The safest approach: amend the invoice to match the LC exactly. If that's not possible, present with a covering letter explaining the addition and be prepared for the bank to raise it."

### 2. Always Cite Your Sources

Every claim must be traceable. Use the format:
- **[UCP600 Article 14(a)]** for ICC publications
- **[ISBP745 Paragraph C3]** for ISBP
- **[RCEP Chapter 3, Article 3.4]** for FTAs
- **[OFAC SDN List Requirements]** for sanctions
- **[EU IUU Regulation 1005/2008]** for EU regulations

If you retrieve a rule from the database, cite the rule's reference or source_citation field. If you're reasoning from general trade finance knowledge beyond what's in the retrieved rules, say so explicitly.

### 3. Be Honest About What You Don't Know

If the retrieved rules don't cover the user's question:
- Say so clearly: "The rules I have access to do not cover [X] specifically."
- Never fabricate citations or rule references
- Offer what you CAN say from adjacent rules
- Point them to the right source: "This is covered by [specific document/authority] — your compliance team or trade finance advisor should consult that directly."
- Suggest what they should ask or look for

This honesty builds trust. A wrong answer destroys it.

### 4. Separate Banking Compliance from Regulatory Compliance

Users frequently conflate what the LC requires (documentary/banking compliance under UCP600) with what the destination country requires (regulatory compliance under local law). These are different:

- **Banking compliance:** Does this document satisfy the terms of the credit? Will the bank accept or refuse it? Governed by UCP600, ISBP745, and the specific LC terms.
- **Regulatory compliance:** Does this shipment meet the importing country's legal requirements? Governed by local customs, health, safety, environmental, and trade regulations.

When a user mixes these up, untangle them. Example: "The catch certificate is required by EU law for importing seafood — but unless your LC specifically calls for it in Field 46A, the bank cannot refuse your documents for its absence. You still need it for customs clearance, just not for LC compliance."

### 5. Flag Practical Risks Even When Rules Are Clear

Sometimes the rule says one thing but practical reality is different. Flag this:
- "Technically compliant, but in practice many banks in [region] interpret this strictly — be prepared for pushback."
- "The rule allows this, but the applicant's bank may have internal policies that go beyond UCP600."
- "This is a grey area under ISBP745. ICC Opinion [X] addressed a similar case and concluded [Y]."

### 6. Structure Your Answers Clearly

For complex questions, use this structure:

1. **Direct answer** — start with the bottom line. Don't bury it.
2. **Rule basis** — cite the specific articles/paragraphs that apply.
3. **Application to their facts** — how the rule applies to their specific scenario.
4. **Practical considerations** — what they should actually do next.
5. **What still depends on their transaction** — variables you can't know (specific LC terms, bank policies, jurisdiction quirks).

For simple questions, just answer directly with a citation. Don't over-structure simple responses.

### 7. Use Plain Language

Your users range from first-time exporters to seasoned trade finance officers. Default to clear, plain language. You can use technical terms (they're often necessary and precise) but always make sure the meaning is clear from context. Never use jargon to sound impressive.

## WHAT YOU DON'T DO

- **You don't give legal advice.** You explain trade finance rules and their application. If something requires a legal opinion (liability, contractual disputes, litigation risk), tell them to consult a trade finance lawyer.
- **You don't guarantee outcomes.** Banks have discretion. Issuing banks can refuse for reasons you can't predict. Always frame answers as "the rules say X" and "in practice, expect Y" — not "the bank will definitely accept this."
- **You don't make up rules.** If you don't have a rule for something, say so. Never hallucinate a UCP article number or an ISBP paragraph that doesn't exist.
- **You don't replace the bank's examination.** You help users prepare better documents and understand their position. The bank's decision is final under the credit.

## YOUR TONE

- **Confident but not arrogant.** You know these rules deeply. Convey that without being condescending.
- **Direct and practical.** Lead with the answer. The user is often under time pressure.
- **Warm when appropriate.** If someone is clearly stressed about a rejection or deadline, acknowledge it briefly: "That's a frustrating situation — let's work through it." Then get to the answer.
- **Honest always.** If the answer is bad news, deliver it clearly but constructively: "This is a discrepancy. Here's why, and here's what you can do about it."

## CONTEXT ABOUT YOUR ECOSYSTEM

tfrules.com is the free, open gateway to the Enso Intelligence ecosystem. Users who need more than rule lookups — full LC validation, document checking, sanctions screening, HS code classification — can explore TRDR Hub (trdrhub.com), which offers a complete compliance workspace for SMEs.

If a user's question goes beyond what tfrules can answer (e.g., "can you validate my full LC?", "can you screen this party against sanctions lists?", "can you classify my HS code?"), you can mention that TRDR Hub offers those capabilities. Keep it natural and helpful — never pushy. One mention per conversation is enough.

## EDGE CASES

**User asks about a jurisdiction or domain not in your database:**
Say what you know from general trade finance knowledge, clearly marked as general guidance, and point them to the specific authority (central bank, customs office, regulatory body) for the definitive answer.

**User asks you to validate or review an actual LC document:**
You can discuss rules that would apply to their described scenario. For full document validation (uploading and automated checking), suggest TRDR Hub.

**User asks the same question that ICC Banking Commission Opinions or DOCDEX cases have addressed:**
Reference the opinion/case. These are extremely valuable because they show how the ICC itself interprets ambiguous rules.

**User asks about something that changed recently:**
Be transparent about what version of the rules you have. If they mention a recent amendment or new ICC publication you don't have, say so.

**User asks in a language other than English:**
Respond in their language. Trade finance is global.

## REMEMBER

Every answer you give either builds or breaks trust. In trade finance, trust is everything. Be the advisor they wish they had access to — knowledgeable, honest, practical, and available at 11pm when the bank just sent a rejection notice and the shipment deadline is tomorrow.

You are not a search engine for rules. You are an advisor who uses rules to solve problems.

---

## OPERATIONAL CONTEXT

Current date: {current_date}
User tier: {user_tier}

## RETRIEVED RULES (your authoritative source for this query)

{retrieved_rules}

## OUTPUT CONSTRAINTS

- No markdown headings (##, ###) in your response — use bold text or bullets instead.
- Default answer length: 150-250 words. Go longer only when multiple rule points or jurisdictions genuinely require it.
- Never invent a rule reference. If a rule isn't in the retrieved set above, say so.
- Every claim must cite a retrieved rule. If reasoning beyond retrieved rules, mark it explicitly as general guidance.
- No follow-up question section inside the answer body.
- Do not sound like an AI report. No preambles like "Based on the retrieved rules" unless strictly needed for safety.
- CRITICAL: Never confirm or deny a country's membership in any trade agreement (RCEP, CPTPP, USMCA, AfCFTA, EU FTAs, or any other) based on general knowledge. If the retrieved rules do not explicitly list the member countries of the agreement being discussed, state: "I need to verify [country]'s membership in [agreement] — the rules I have don't explicitly confirm this. Please verify with [agreement secretariat / official source] before relying on preferential treatment." Getting membership wrong has direct financial consequences — a wrong answer could lead to denied preferential tariff, customs penalties, or rejected certificate of origin."""


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
        "Keep the answer tight: default to about 150 to 220 words, with 1 short opening paragraph and at most 3 short bullets only if they add real value.\n"
        "Go longer only when the question genuinely needs more detail to stay correct.\n"
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
    text = re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()
    # Normalize common abbreviation variants so "Article 18" matches "Art. 18"
    text = re.sub(r"\barticle\b", "art", text)
    text = re.sub(r"\bparagraph\b", "para", text)
    text = re.sub(r"\bsection\b", "sec", text)
    return text


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
    allowed_rulebooks: set[str] = set()

    for rule in rules:
        ref = rule.reference or ""
        rb = rule.rulebook or ""

        # Full compound reference
        allowed_citations.add(_normalize_citation_token(f"{rb} {ref}"))
        allowed_citations.add(_normalize_citation_token(ref))
        allowed_citations.add(_normalize_citation_token(rb))

        # Rulebook name as standalone allowed token
        rb_norm = _normalize_citation_token(rb)
        if rb_norm:
            allowed_rulebooks.add(rb_norm)

        # Split compound references on comma/semicolon and add each part
        for part in re.split(r"[;,]", ref):
            part = part.strip()
            if part:
                allowed_citations.add(_normalize_citation_token(part))

        # Extract all article/paragraph numbers from reference AND excerpt
        for source_text in (ref, rule.excerpt or ""):
            for match in re.finditer(
                r"(?:article|art\.?|paragraph|para\.?|section|sec\.?)\s+\d+(?:\([a-z0-9]+\))*(?:\([a-z0-9]+\))?",
                source_text,
                flags=re.IGNORECASE,
            ):
                allowed_articles.add(_normalize_citation_token(match.group(0)))

    return allowed_citations, allowed_articles


def answer_mentions_unknown_references(answer: str, rules: Sequence[RetrievedRule]) -> bool:
    """Check if the LLM answer cites references NOT in the retrieved rules.

    Uses relaxed matching: a citation like "[UCP600 Article 18(a)(i)]" is
    allowed if the retrieved rules contain UCP600 with Art 18 anywhere in
    their reference or excerpt.  Only returns True (= hallucinated) when
    a cited article number doesn't appear in ANY retrieved rule.
    """
    allowed_citations, allowed_articles = _allowed_reference_tokens(rules)

    # Build a flat set of all allowed content for containment checks
    all_allowed = allowed_citations | allowed_articles

    # Check bracketed citations like [UCP600 Article 18(a)(i)]
    unknown_count = 0
    for bracketed in re.findall(r"\[([^\]]+)\]", answer):
        normalized = _normalize_citation_token(bracketed)
        if not normalized:
            continue
        # Exact match
        if normalized in all_allowed:
            continue
        # Containment: does any allowed token appear inside this citation or vice versa?
        if any(allowed in normalized or normalized in allowed for allowed in all_allowed):
            continue
        unknown_count += 1

    # Check standalone article references like "Article 18(a)(i)"
    for match in re.finditer(
        r"(?:article|art\.?)\s+\d+(?:\([a-z0-9]+\))*",
        answer,
        flags=re.IGNORECASE,
    ):
        normalized = _normalize_citation_token(match.group(0))
        if not normalized:
            continue
        if normalized in allowed_articles:
            continue
        # Relaxed: check if just the article number (e.g. "art 18") matches
        art_num = re.search(r"art\s+(\d+)", normalized)
        if art_num and any(f"art {art_num.group(1)}" in a for a in allowed_articles):
            continue
        unknown_count += 1

    # Only flag as hallucinated if MULTIPLE unknown references found.
    # A single borderline citation shouldn't kill an otherwise good answer.
    return unknown_count >= 3


def normalize_generated_answer(answer: str) -> str:
    return _tighten_answer_voice(_collapse_whitespace(_strip_followup_block(_strip_markdown(answer))))


def _template_answer(query: str, rules: Sequence[RetrievedRule]) -> Dict[str, Any]:
    """Format a single retrieved rule as a direct answer — no LLM call."""
    rule = rules[0]
    title = rule.title or "Untitled"
    rulebook = rule.rulebook or "unknown"
    reference = rule.reference or "n/a"
    excerpt = rule.excerpt.strip() if rule.excerpt else ""

    # Extract conditions and severity from raw rule metadata if available
    raw_detail = rule.metadata.get("raw_detail", {}) if rule.metadata else {}
    conditions = raw_detail.get("conditions") or raw_detail.get("condition")
    severity = str(raw_detail.get("severity") or "").lower()

    parts: List[str] = []
    parts.append(f"{title} ({rulebook} {reference}): {excerpt}")
    if conditions:
        if isinstance(conditions, list):
            conditions_text = "; ".join(str(c) for c in conditions if c)
        else:
            conditions_text = str(conditions)
        if conditions_text.strip():
            parts.append(f"This applies when: {conditions_text}.")
    if severity == "critical":
        parts.append("Note: this is a hard requirement with no exceptions.")

    return {
        "answer": "\n\n".join(parts),
        "model_used": "template-engine",
        "partial_coverage": False,
        "routing_tier": "template",
    }


def _generation_token_budget(complexity: str, partial_coverage: bool) -> int:
    if complexity == "complex":
        return 560
    if partial_coverage:
        return 220
    return 220 if complexity == "interpretation" else 180


def _query_deserves_long_form(
    query: str,
    rules: Sequence[RetrievedRule],
    classifier_output: ClassifierOutput,
) -> bool:
    lowered = query.lower()
    if classifier_output.complexity == "complex":
        return True
    if len(rules) >= 6:
        return True
    long_markers = (
        "compare",
        "difference",
        "versus",
        " vs ",
        "step by step",
        "checklist",
        "article by article",
        "country pair",
        "beneficial owner",
        "secondary sanctions",
        "all documents",
        "full document set",
        "requirements for trading",
    )
    return any(marker in lowered for marker in long_markers)


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
        model: str | None = None,
    ) -> Optional[str]:
        prompt = _build_user_prompt(query, retrieved_rules, complexity, classifier_output)
        if hasattr(client, "generate_answer"):
            try:
                output = await _maybe_await(
                    client.generate_answer(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        max_tokens=max_tokens,
                        temperature=0.1,
                        extended_thinking=complexity == "complex",
                        model=model,
                    )
                )
            except TypeError:
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
            try:
                output = await _maybe_await(
                    client.generate_fallback(
                        prompt=prompt,
                        system_prompt=system_prompt,
                        max_tokens=max_tokens,
                        temperature=0.1,
                        model=model,
                    )
                )
            except TypeError:
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
        routing_tier: str = "sonnet",
    ) -> Dict[str, Any]:
        partial_coverage = assess_partial_coverage(query, retrieved_rules)
        # Document-breadth deterministic bypass removed — all queries go through
        # the LLM now. The system prompt handles document-set questions better
        # than any keyword heuristic.

        # Smart routing: template tier — no LLM call
        if routing_tier == "template":
            from app.config import settings as _settings
            if _settings.RULEGPT_TEMPLATE_ENGINE_ENABLED:
                return _template_answer(query, retrieved_rules)
            routing_tier = "haiku"  # fallback if template engine is disabled

        # Resolve model string for the selected tier
        from app.config import settings as _settings
        model_for_tier = {
            "haiku": _settings.RULEGPT_HAIKU_MODEL,
            "sonnet": _settings.RULEGPT_GENERATOR_MODEL,
            "opus": _settings.RULEGPT_OPUS_MODEL,
        }.get(routing_tier, _settings.RULEGPT_GENERATOR_MODEL)

        token_budget = _generation_token_budget(classifier_output.complexity, partial_coverage)
        if _query_deserves_long_form(query, retrieved_rules, classifier_output):
            token_budget = max(token_budget, 360 if classifier_output.complexity != "complex" else 560)
        # Opus gets a larger budget for complex analytical queries
        if routing_tier == "opus":
            token_budget = max(token_budget, 560)

        import logging
        _log = logging.getLogger("rulegpt.generator")

        rendered_rules = _render_retrieved_rules(retrieved_rules)
        system_prompt = RULEGPT_SYSTEM_PROMPT_TEMPLATE.format(
            current_date=date.today().isoformat(),
            user_tier=user_tier,
            retrieved_rules=rendered_rules,
        )
        prompt_tokens_est = len(system_prompt.split()) + len(query.split())
        _log.info(
            "[GEN] query=%r model=%s tier=%s rules=%d prompt_words_est=%d token_budget=%d",
            query[:80], model_for_tier, routing_tier, len(retrieved_rules), prompt_tokens_est, token_budget,
        )

        fallback_reasons: list[str] = []

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
                    model=model_for_tier,
                )
                if answer:
                    normalized = normalize_generated_answer(answer)
                    if normalized and not answer_mentions_unknown_references(normalized, retrieved_rules):
                        return {
                            "answer": normalized,
                            "model_used": model_for_tier,
                            "partial_coverage": partial_coverage,
                            "routing_tier": routing_tier,
                        }
                    elif normalized:
                        reason = f"Anthropic ({model_for_tier}): answer contained hallucinated references, dropped"
                        _log.warning("[GEN] %s | query=%r", reason, query[:80])
                        fallback_reasons.append(reason)
                    else:
                        reason = f"Anthropic ({model_for_tier}): answer was empty after normalization"
                        _log.warning("[GEN] %s | query=%r", reason, query[:80])
                        fallback_reasons.append(reason)
                else:
                    reason = f"Anthropic ({model_for_tier}): returned empty/None"
                    _log.warning("[GEN] %s | query=%r", reason, query[:80])
                    fallback_reasons.append(reason)
            except Exception as exc:
                reason = f"Anthropic ({model_for_tier}): {type(exc).__name__}: {exc}"
                _log.error("[GEN] %s | query=%r", reason, query[:80], exc_info=True)
                fallback_reasons.append(reason)
        else:
            fallback_reasons.append("Anthropic client not available")

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
                    model=model_for_tier,
                )
                if answer:
                    normalized = normalize_generated_answer(answer)
                    if normalized and not answer_mentions_unknown_references(normalized, retrieved_rules):
                        return {
                            "answer": normalized,
                            "model_used": "gpt-4.1",
                            "partial_coverage": partial_coverage,
                            "routing_tier": routing_tier,
                            "fallback_reasons": fallback_reasons,
                        }
                    elif normalized:
                        reason = "GPT-4.1: answer contained hallucinated references, dropped"
                        _log.warning("[GEN] %s | query=%r", reason, query[:80])
                        fallback_reasons.append(reason)
                    else:
                        reason = "GPT-4.1: answer was empty after normalization"
                        _log.warning("[GEN] %s | query=%r", reason, query[:80])
                        fallback_reasons.append(reason)
                else:
                    reason = "GPT-4.1: returned empty/None"
                    _log.warning("[GEN] %s | query=%r", reason, query[:80])
                    fallback_reasons.append(reason)
            except Exception as exc:
                reason = f"GPT-4.1: {type(exc).__name__}: {exc}"
                _log.error("[GEN] %s | query=%r", reason, query[:80], exc_info=True)
                fallback_reasons.append(reason)
        else:
            fallback_reasons.append("OpenAI client not available")

        _log.error("[GEN] ALL MODELS FAILED, using grounded fallback | reasons=%s | query=%r", fallback_reasons, query[:80])
        answer = compose_grounded_answer(query, retrieved_rules, partial_coverage=partial_coverage)
        return {
            "answer": answer,
            "model_used": "fallback",
            "partial_coverage": partial_coverage,
            "routing_tier": routing_tier,
            "fallback_reasons": fallback_reasons,
        }

    @staticmethod
    def suggested_followups(query: str, classifier: ClassifierOutput, partial_coverage: bool = False) -> List[str]:
        lowered = query.lower()
        if partial_coverage or classifier.complexity == "complex":
            limit = 3
        elif requires_document_breadth(query) or classifier.domain in {"sanctions", "fta"}:
            limit = 2
        elif any(marker in lowered for marker in ("difference", "compare", "requirements", "qualify")):
            limit = 2
        else:
            limit = 1

        if requires_document_breadth(query):
            options = [
                "Want this mapped document by document?",
                "Should I separate UCP600 from Incoterms obligations?",
                "Do you want the missing document types flagged clearly?",
            ]
            return options[:limit]
        if classifier.domain == "sanctions":
            options = [
                "Which regime matters most here: OFAC, EU, UN, or UK?",
                "Do you want a screening checklist for parties, banks, and vessels?",
                "Should I compare this across sanctions regimes?",
            ]
            return options[:limit]
        if classifier.domain == "fta":
            options = [
                "Which country pair and HS code are you testing?",
                "Do you want the proof-of-origin checklist?",
                "Should I separate agreement scope from product-specific origin rules?",
            ]
            return options[:limit]
        if _rule_cta_trigger(query):
            options = [
                "Do you want the discrepancy points mapped article by article?",
                "Should I turn this into likely bank examination points?",
                "Do you want document issues separated from the rule explanation?",
            ]
            return options[:limit]
        if classifier.domain == "icc":
            options = [
                "Which document are you checking first: invoice, BL, or insurance?",
                "Is this under a specific LC or just the general rule?",
                "Should I separate hard rule requirements from bank-practice issues?",
            ]
            return options[:limit]
        options = [
            "Which country or jurisdiction does this involve?",
            "Should I break this into an operational checklist?",
            "Do you want the closest related rules if coverage is partial?",
        ]
        return options[:limit]
