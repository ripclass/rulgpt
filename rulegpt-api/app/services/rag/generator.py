"""Answer generation service with Claude primary + GPT fallback."""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .models import ClassifierOutput, RetrievedRule

RULEGPT_SYSTEM_PROMPT_TEMPLATE = """You are RuleGPT, a trade finance compliance 
assistant built by Enso Intelligence. You help 
exporters, importers, freight forwarders, C&F 
agents, and trade finance professionals 
understand trade compliance rules.

You answer questions about:
- ICC standards (UCP600, ISBP745, ISP98, 
  URDG758, Incoterms 2020, and all related)
- SWIFT messaging standards for trade finance
- International sanctions (OFAC, EU, UN, UK)
- Free Trade Agreement rules of origin
- Customs and import/export requirements 
  by country
- Trade documentation requirements
- Bank-specific LC requirements

Your rules:
1. Only answer based on rules in your context.
   Never invent or guess rules.
2. Always cite the specific rule:
   rulebook name + article/paragraph number.
3. Use plain language. Users are trade 
   professionals, not lawyers.
4. If provided rules don't cover the question,
   say so clearly. Suggest what to look for.
5. Never give legal advice. Never say something 
   is definitely compliant for a specific 
   transaction. You explain rules, 
   not review documents.
6. If user seems to need document validation,
   redirect to LCopilot on TRDR Hub.
7. Keep answers concise but complete.
   Short paragraphs. Bullets only for 
   multiple distinct items.
8. End every answer with 2-3 relevant 
   follow-up questions.

Out of scope: cryptocurrency, general business 
law, accounting, non-trade taxation, anything 
outside trade finance compliance.

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
) -> str:
    return (
        f"User query: {query}\n"
        f"Complexity: {complexity}\n"
        "Use only the retrieved rules below. Cite each substantive claim inline using "
        "rulebook name + article/paragraph. If the rules are incomplete, say so clearly.\n\n"
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


def _fallback_answer(query: str, rules: Sequence[RetrievedRule]) -> Tuple[str, str]:
    if not rules:
        return (
            "I don't have a specific rule covering that. Here's what related rules say: no closely matching rule was found in the current ruleset.",
            "fallback",
        )

    top = rules[:3]
    lines: List[str] = []
    for rule in top:
        ref = f"{rule.rulebook} {rule.reference}".strip()
        excerpt = (rule.excerpt or "Relevant guidance is available in this rule.").strip()
        lines.append(f"According to [{ref}], {excerpt}")
    lines.append("Would you like me to narrow this to a specific jurisdiction or document type?")
    lines.append("Do you want a checklist view for operational use?")
    lines.append("Do you need document-level validation support in LCopilot?")
    return ("\n\n".join(lines), "fallback")


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
    ) -> Optional[str]:
        prompt = _build_user_prompt(query, retrieved_rules, complexity)
        if hasattr(client, "generate_answer"):
            output = await _maybe_await(
                client.generate_answer(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    extended_thinking=complexity == "complex",
                )
            )
            return str(output) if output else None
        if hasattr(client, "generate_fallback"):
            output = await _maybe_await(
                client.generate_fallback(
                    prompt=prompt,
                    system_prompt=system_prompt,
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
                )
                if answer:
                    return {"answer": answer, "model_used": "claude-sonnet-4-6"}
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
                )
                if answer:
                    return {"answer": answer, "model_used": "gpt-4.1"}
            except Exception:
                pass

        answer, model_used = _fallback_answer(query, retrieved_rules)
        return {"answer": answer, "model_used": model_used}

    @staticmethod
    def suggested_followups(query: str, classifier: ClassifierOutput) -> List[str]:
        if classifier.domain == "sanctions":
            return [
                "Do you want jurisdiction-specific sanctions screening steps?",
                "Should I compare OFAC, EU, and UN treatment for this case?",
                "Do you need an operational checklist for counterparties and vessels?",
            ]
        if classifier.domain == "fta":
            return [
                "Which origin criterion applies to your product in this FTA?",
                "Do you want a document checklist for proving origin?",
                "Should I compare this FTA with an alternative market route?",
            ]
        if _rule_cta_trigger(query):
            return [
                "Do you want a discrepancy checklist by article?",
                "Should I map this to likely bank review points?",
                "Do you need document-level validation in LCopilot?",
            ]
        return [
            "Do you want this narrowed to a specific jurisdiction?",
            "Should I map this answer to required documents step-by-step?",
            "Do you want the closest related rules if coverage is partial?",
        ]
