# CLAUDE.md — RulGPT Codebase Reference

## RESUME — START HERE

**Last updated: 2026-07-03.** Rebrand + architecture relaunch complete on `main` (commits through `4868fbb`, docs/golden-queries in Phase 5). Live site still serves from tfrules.com; rulgpt.com cutover is a manual step (see `LAUNCH-NOTES.md`).

What's done (2026-07 launch, "RulGPT"):
- Rebrand: tfrules.com → RulGPT at rulgpt.com (host-level 301 deferred to Vercel's primary-domain setting at DNS cutover — not in `vercel.json`, see `LAUNCH-NOTES.md` for why)
- Retrieval migrated to RulHub-native: `RETRIEVAL_BACKEND=rulhub` is the code default, fail-closed (no local-data fallback on outage), keyword-variant search, anchor-rule injection, 30-min TTL cache, optional embedding re-rank. Local pgvector path retained only as a rollback (`RETRIEVAL_BACKEND=local`); deploy is currently pinned to `local` in `render.yaml` because RulHub is suspended until 2026-07-05.
- LLM stack swapped to OpenRouter-only: zero Anthropic SDK dependency in the runtime. Primary `z-ai/glm-5`, fallback chain `deepseek/deepseek-v4-pro` → `qwen/qwen3.7-plus`, classifier `z-ai/glm-4.7-flash`. Tier-based model routing (not the old complexity-matrix), $0 template tier kept, citation retry-once-then-degrade, per-query cost logging.
- Daily quota windows: anonymous 2/day (by IP), free 5/day — replacing the old flat monthly-only model for those two tiers. Professional/enterprise stay monthly (500/mo, 2000/mo).
- Workbench v1: free MT700 SWIFT-message interpreter (own daily limit, doesn't touch chat quota), Case Note ($9 one-off) and Draft ($19 one-off) artifact generation, Pro plan ($29/mo, internal tier name stays `professional`), Stripe one-off entitlements via webhook, print-to-PDF, "Advisory only" disclaimers throughout.
- Chat-first landing page (hero is the chat input, not marketing copy)
- 65 blog posts at /blog, per-page SEO meta tags, GOLDEN_QUERIES.md expanded to 20

What's next (see `LAUNCH-NOTES.md` for the full manual checklist):
- DNS + Vercel domain cutover to rulgpt.com
- RulHub resumes 2026-07-05 — create Internal-tier API key, smoke-test, flip `RETRIEVAL_BACKEND` to `rulhub` in Render
- Create the Pro/$29, Case Note/$9, Draft/$19 Stripe prices (do not exist yet) and wire the price IDs into Render
- Post-resume acceptance run: 20 golden queries, MT700 demo, full funnel walkthrough in Stripe test mode
- Spot-verify ISBP 821 (2023 revision) paragraph numbers in blog posts — the rebrand relabeled the publication name but didn't re-verify individual paragraph numbers against the new revision

## WHAT THIS IS

RulGPT is a citation-first conversational AI for trade finance rules, plus a small workbench (MT700 interpreter, case notes, drafts). Users ask questions about ICC standards (UCP600, ISBP 821, ISP98, URDG758), sanctions (OFAC), FTAs (RCEP, CPTPP, USMCA), customs, and bank-specific LC rules and get short, grounded answers with exact rule citations. No account needed for the first 2 answers per day (anonymous, by IP); free accounts get 5/day.

Originally built by a Codex agent from a product brief, then relaunched under the RulGPT brand with RulHub-native retrieval and an OpenRouter LLM stack. This document describes what was actually built, not what was planned.

## ECOSYSTEM CONTEXT

Four products in the Enso Intelligence ecosystem:

**RULHUB** (Infrastructure)
- Path: `J:\Enso Intelligence\ICC Rule Engine`
- What: API-only global trade rules engine. 4,000+ curated rulesets. No UI.
- Relationship: RulHub is now the **primary** retrieval source for RulGPT, not a fallback. `app/services/rag/rulhub_retriever.py` talks to RulHub directly (`POST /v1/rules/search`, `GET /v1/rules/{id}`, `GET /v1/rules/lookup`, `GET /v1/stats`) and is **fail-closed**: if RulHub is unreachable, the query returns a quota-neutral "temporarily unavailable" message rather than answering from local data. The local pgvector corpus (`rulegpt_rules`/`rulegpt_rule_embeddings`) and its sync scripts are deprecated but retained as a rollback (`RETRIEVAL_BACKEND=local`) — do not drop those tables until the RulHub path has run clean in production for a week. RulHub API itself is suspended as of this writing and scheduled to resume 2026-07-05; the Render deploy is pinned to `RETRIEVAL_BACKEND=local` until then even though the code default is `rulhub`.

**TRDR HUB** (SME compliance platform)
- Path: `H:\.openclaw\workspace\trdrhub.com`
- What: 15 AI-powered trade compliance tools including LCopilot.
- Relationship: RulGPT is TRDR Hub's top of funnel. The `show_trdr_cta` field is still hardcoded to `False` everywhere in the chat pipeline (`pipeline.py`, `query.py`) — that mechanism remains dormant. The MT700 interpreter uses a *separate*, always-on CTA (`MT700_CTA_TEXT`/`MT700_CTA_URL` in `schemas/interpret.py`) that points to LCopilot — that one does fire on every MT700 response.

**RULGPT** (This repo — `J:\Enso Intelligence\rulgpt`)
- What: This codebase. FastAPI backend + React frontend.
- Launch domain: `rulgpt.com` (legacy `tfrules.com` still serves production and will 301-redirect once Vercel's primary-domain is switched — see `LAUNCH-NOTES.md`)

**ICE** (Future product — not this repo)
- What: Proprietary trade finance LLM.
- Relationship: unchanged. The `ice_training_eligible` flag exists on the `rulegpt_queries` table, defaults `False`, and is set `True` only in `rulegpt-api/app/routers/feedback.py` when `feedback_type == "thumbs_up"` AND `confidence_band == "high"` AND citations is non-empty.

## ACTUAL STATE

### Built and working (code exists, logic is complete)
- FastAPI backend, 17 router modules, RAG pipeline: classify → retrieve (RulHub-native) → route → generate (OpenRouter) → cite
- RulHub-native retriever: fail-closed, keyword-variant search, anchor injection, TTL cache singleton, optional embedding re-rank
- OpenRouter LLM client: config-driven model + fallback chain, per-model retry, cost accounting from response `usage.cost`
- Tier-based smart routing (`select_model` in `pipeline.py`) + $0 template tier for direct single-rule lookups
- Daily quota windows (anonymous/free) and monthly windows (professional/enterprise), enforced in `routers/query.py`
- MT700 interpreter: deterministic SWIFT field parser + soft-clause flagger + LLM explanation, own daily limit, doesn't touch chat quota
- Case Note / Draft artifact generation behind Pro-or-entitlement gate (`rulegpt_entitlements` table, Stripe one-off webhook credits)
- Stripe: Professional/Enterprise subscription checkout (working, prices exist), Pro $29/mo checkout code (working, **price ID not yet created — see LAUNCH-NOTES**), one-off Case Note/Draft checkout code (same gap)
- Supabase JWT verification (code complete, needs env vars — same as before)
- React frontend: chat-first landing, chat UI with citations, MT700 interpreter view, case-note/draft workbench views, print-to-PDF, pricing/FAQ/contact/privacy/terms pages
- Frontend telemetry and error reporting
- Admin endpoints for embedding sync (local-rollback path only), analytics, conversion tracking
- 29 backend test files, 8 frontend test files

### Built but not yet verified live
- RulHub-native retrieval against a real, unsuspended RulHub API (RulHub itself has been down; resumes 2026-07-05 — see `LAUNCH-NOTES.md` §7 for the acceptance run)
- Pro / Case Note / Draft Stripe checkout end-to-end (code complete; the three price IDs don't exist in Stripe yet)
- Supabase auth end-to-end (same as before — code complete, needs a real Supabase project wired up)
- rulgpt.com DNS/domain cutover (site currently still resolves at tfrules.com)

### Incomplete or stubbed
- Admin auth uses `ADMIN_SECRET` shared secret — no real RBAC (`rulegpt-api/app/routers/deps.py`, `require_admin_user`)
- API usage counting returns hardcoded 0 (`rulegpt-api/app/routers/api_access.py:31`)
- `show_trdr_cta` is always `False` in the chat pipeline (MT700 has its own separate, always-on CTA — see ECOSYSTEM CONTEXT above)
- `GET /api/billing/status` computes `checkout_ready` from the legacy Professional/Enterprise price IDs only — it does not check `STRIPE_PRO_MONTHLY_PRICE_ID`, so the frontend Pro button can render "ready" before that env var is actually set
- `rulegpt-api/app/routers/rules.py` (`GET /api/rules/{rule_id}`) still reads from the local `rule_store` first, falling back to `rulhub_client.get_rule()` — it was never migrated to prefer RulHub the way the main query pipeline was. Low-traffic endpoint, but a real inconsistency if you're auditing "does everything read from RulHub now."

### Missing entirely
- End-to-end browser tests
- Real RBAC for admin endpoints
- API key management for Pro tier (the enterprise-only `/api/v1/query` programmatic API still exists separately from the new Pro plan)
- Onboarding flow (role, geography, use case questions)
- PostHog or Sentry integration (telemetry goes to backend log only)
- rulgpt.com mailboxes (hello@/support@/billing@/privacy@) — referenced in UI copy, not yet provisioned

## THE MOST CRITICAL THING

### Retrieval is RulHub-native behind a rollback flag — there is no local-corpus-primary path anymore

This inverts what used to be true. As of the 2026-07 relaunch, `RulHubRetriever` (`rulegpt-api/app/services/rag/rulhub_retriever.py`) is the **primary and default** retrieval path, selected by `RETRIEVAL_BACKEND` in `app/config.py`:

- `RETRIEVAL_BACKEND=rulhub` (code default) → `RAGPipeline` uses `get_rulhub_retriever()`, a process-wide singleton (constructed once so its 30-minute TTL cache is actually shared across requests — `RAGPipeline` itself is built fresh per query, so a bare `RulHubRetriever()` in `__init__` would give every request its own empty cache).
- `RETRIEVAL_BACKEND=local` (rollback only) → `RAGPipeline` falls back to the old `RuleRetriever` (`retriever.py`), which still does direct SQL against `rulegpt_rule_embeddings` for pgvector search and uses `rule_store.py` for lexical fallback and hydration.
- **The Render deploy is currently pinned to `local`** (see `render.yaml` comment) because RulHub itself has been suspended and resumes 2026-07-05. The code default is `rulhub` — only the deploy config overrides it.

**Fail-closed is the load-bearing design decision here.** If RulHub is unreachable, `RulHubRetriever.retrieve()` raises `RetrievalUnavailableError`, and the pipeline returns a static "temporarily unavailable" answer with `routing_tier="unavailable"` — which is explicitly excluded from quota counting in `routers/query.py`. The retriever never falls through to stale local data or to the LLM's general knowledge. This is intentional: a wrong trade-finance rule citation has real financial consequences, so "no answer" beats "maybe-wrong answer."

**What `RulHubRetriever.retrieve()` actually does, in order:**
1. Builds up to 3 search query variants (`derive_search_queries`): the raw query, a stopword-stripped/expanded version, and — if a known publication is mentioned (UCP600, ISBP 821, URDG758, ISP98, URC522, eUCP) — a keyword variant anchored to that publication.
2. Calls `RulHubClient.search_rules()` (`POST /v1/rules/search`) with domain/jurisdiction filters, `allow_fallback=False` (no client-side local-file fallback — fail-closed applies at every layer).
3. Scores candidates: 70% rank-normalized RulHub relevance + 30% lexical token overlap.
4. Optionally re-ranks by embedding cosine similarity if `RULGPT_RERANK_EMBEDDINGS=true` and an OpenAI/OpenRouter key is present (`_maybe_embed_rerank`) — silently skipped, not failed, if no key.
5. Hydrates the top candidates with full text via `GET /v1/rules/{id}` (`allow_fallback=False`).
6. For ICC-domain queries, injects "anchor" rules (foundational UCP600 articles) via `GET /v1/rules/lookup` if the query trips a trigger phrase and the anchor isn't already in the result set (`anchors.py`).
7. Caches the final result under a 30-minute TTL, keyed on `(query, domain, jurisdiction, document_type, top_k)`.

**The old `rule_store.py` abstraction still exists but is now local-rollback-only plumbing:**
- Used by: `retriever.py` (the local-rollback path), `embedder.py` (deprecated local sync), and `routers/rules.py` (`GET /api/rules/{rule_id}` — this one endpoint was never migrated and still checks local-first, RulHub-fallback, which is backwards relative to everywhere else).
- **Not used** by `rulhub_retriever.py` at all — it talks to `RulHubClient` and normalizes rows itself.

**RulHub API contract actually in use** (`rulhub_client.py`): `GET /v1/rulesets`, `GET /v1/rulesets/{key}`, `GET /v1/rules`, `GET /v1/rules/{rule_id}`, `POST /v1/rules/search`, `GET /v1/rules/lookup`, `GET /v1/rules/intelligence`, `GET /v1/stats`. Auth via `X-API-Key` header; `RulHub-Version` header pinned via `RULHUB_API_VERSION` env var (read with raw `os.getenv`, **not** part of the pydantic `Settings` class in `config.py` — easy to miss when auditing env vars).

## RAG PIPELINE

### How it works (from `rulegpt-api/app/services/rag/pipeline.py`)

1. **Classification** (`classifier.py`): heuristic keyword matching first, reconciled with an OpenRouter LLM assist (`RULGPT_CLASSIFIER_LLM_MODEL`) when available. Determines domain, jurisdiction, document_type, complexity, in_scope.

2. **Document-validation redirect** runs *before* the out-of-scope check: queries like "Is this LC compliant?" get a product-boundary response ("I can't validate actual documents...") rather than a flat rejection — they're in-scope trade questions, just ones the product can't answer directly.

3. **Out-of-scope check**: if not in scope, returns the static `OUT_OF_SCOPE_MESSAGE`.

4. **Retrieval** (`rulhub_retriever.py` by default, `retriever.py` on the local rollback — see THE MOST CRITICAL THING above). `top_k` is 8 for document-breadth queries (e.g. "what documents are required for CIF"), 5 otherwise. A `RetrievalUnavailableError` short-circuits to the quota-neutral "unavailable" response.

5. **Tier-based routing** (`select_model()` in `pipeline.py`, after retrieval): see AI ROUTING STACK below.

6. **Generation** (`generator.py`):
   - Template tier ($0, no LLM call) formats a single high-confidence rule directly.
   - Otherwise: OpenRouter primary model → configured fallback chain, all through `OpenRouterLLMClient`.
   - If the first answer cites a reference not present in the retrieved rules, one retry happens in "strict citation mode." If the retry still hallucinates, the response degrades to a citations-only answer (no synthesis, just the raw retrieved rules) rather than shipping an unverified citation.
   - Post-processing: strips markdown headings, strips follow-up-question blocks, tightens AI-report voice ("Based on the retrieved rules..." etc. stripped).

7. **Intent Detection** (`query_intent.py`): `requires_document_breadth()`, `has_partial_coverage_language()`, `extract_fta_agreement()`, `expected_document_families()` — used by the generator and confidence calculation.

8. **Citations** (`citations.py`): built from retrieved rules only, prioritizing rules explicitly mentioned in the answer text. Max 8. Validated against the retrieved set (`validate_citations`) — citations are dropped entirely, not partially trusted, if validation fails.

9. **Confidence** (`pipeline.py:_confidence_from_rules`) — **unchanged from before, still the trust-calibration logic Ripon must approve changes to**:
   - Always "low" if partial coverage, no rules, or 0 citations
   - "high" requires best_score ≥ 0.8, average ≥ 0.6, at least 1 citation
   - "medium" requires best ≥ 0.5, average ≥ 0.4
   - Document-breadth queries need ≥ 2 unique references for "high"

### Model configuration (from `app/config.py`)

**Live (OpenRouter-routed, 2026-07 stack):**
- Primary generation/classification model: `RULGPT_LLM_MODEL` = `z-ai/glm-5` — verified live against the OpenRouter catalog 2026-07-03, $0.60/$1.92 per 1M tokens, 202k context
- Fallback chain: `RULGPT_LLM_FALLBACKS` = `deepseek/deepseek-v4-pro,qwen/qwen3.7-plus` ($0.435/$0.87 and $0.32/$1.28 per 1M)
- Classifier-tier model: `RULGPT_CLASSIFIER_LLM_MODEL` = `z-ai/glm-4.7-flash` ($0.06/$0.40 per 1M) — also used for the fast suggested-followups call
- Embeddings (optional re-rank only): `RULEGPT_EMBEDDING_MODEL` = `text-embedding-3-small` via OpenAI, gated by `RULGPT_RERANK_EMBEDDINGS`
- Template engine: no model call, deterministic formatting, $0.000

**Dead but present (do not build on these):** `RULEGPT_CLASSIFIER_MODEL`, `RULEGPT_GENERATOR_MODEL`, `RULEGPT_COMPLEX_MODEL`, `RULEGPT_HAIKU_MODEL`, `RULEGPT_OPUS_MODEL`, `RULEGPT_FALLBACK_MODEL` (`gpt-4.1` via `OpenAIClient.generate_fallback`) still exist in `config.py` as unused legacy fields from before the OpenRouter swap. The Anthropic SDK itself has been removed from `requirements.txt` — there is no code path that calls Anthropic directly anymore, regardless of these config values.

### System prompt (`generator.py`, `RULEGPT_SYSTEM_PROMPT_TEMPLATE`, lines 21-232)

Rewritten during the rebrand — this is now a much longer, identity-driven prompt ("You are **RulGPT**, a trade finance compliance advisor built by Enso Intelligence...") rather than the older terse rules-list format. Key structural pieces, for orientation (read the actual file for exact wording before touching it — this is still a **Ripon-approval-required** file):
- An identity/tone section ("not a generic AI chatbot... a specialist")
- A knowledge-base inventory (ICC publications, SWIFT/ISO 20022 messages, sanctions/export-control regimes, FTAs, commodities, country coverage)
- "HOW YOU ANSWER" — apply-rules-to-facts, always cite, honesty about gaps, a contradiction-detection subsection listing 12 foundational UCP600/URDG758/URC522/eUCP rules the model should trust over a possibly-wrong retrieved row, banking-vs-regulatory-compliance separation, practical-risk flagging, structure guidance, plain language
- "WHAT YOU DON'T DO" — no legal advice, no outcome guarantees, no invented rules, no document-validation replacement
- Operational context block: `{current_date}`, `{user_tier}`, `{retrieved_rules}` — same templating mechanism as before
- Output constraints: no markdown headings, 150-250 words by default, never invent a reference, explicit instruction to refuse confirming/denying FTA membership from general knowledge if the retrieved rules don't explicitly list it (this is a financial-consequences guardrail — got it wrong once in an earlier draft and it was called out specifically)

### Empty result handling
Unchanged: when retrieval finds no matching rules, the pipeline still sends the query to the LLM with an empty rules context (marked `partial_coverage=True`) rather than returning a static message — the LLM can offer clearly-marked general guidance. `model_used` reflects whichever OpenRouter model answered (or `"fallback"` if that call also fails).

### ICE pipeline
Unchanged. `ice_training_eligible` defaults `False`, set `True` only in `routers/feedback.py` when `thumbs_up` + `confidence_band == "high"` + non-empty citations.

## AI ROUTING STACK

### Tier-based routing (`select_model()` in `pipeline.py`) — replaces the old complexity-matrix

The old "deterministic complexity classifier picks the cheapest model" description is gone. Routing is now **subscription-tier-first**, with query signals only adjusting *within* what a tier is allowed to use:

```
Query → Classifier → RulHub Retriever → select_model(user_tier, query, retrieved_rules) → Generator
                                              │
                                              ├── 0 rules              → "fallback" (static message, $0)
                                              ├── template gate        → "template" ($0, direct single-rule lookup,
                                              │                           only if RULGPT_TEMPLATE_ENGINE_ENABLED)
                                              │
                                              ├── tier = free/anonymous → "haiku" tier, always (100%)
                                              │
                                              ├── tier = professional   → "opus" tier if sanctions/TBML/involves a
                                              │                           sanctioned jurisdiction keyword, or ≥3 domains;
                                              │                           "haiku" tier if a short definitional lookup
                                              │                           with ≤2 rules/≤1 domain; else "sonnet" tier
                                              │
                                              └── tier = enterprise     → same shape as professional but with a lower
                                                                          bar: also escalates to "opus" on ≥5 rules or
                                                                          on fail-severity rules with ≥3 rules
```

- The `template` gate still exists: `RULEGPT_TEMPLATE_ENGINE_ENABLED=true` (default), exactly 1 retrieved rule, and the query matches `_DIRECT_LOOKUP` (`article|paragraph|rule|field \d+`).
- The tier names (`template`/`haiku`/`sonnet`/`opus`) are now just **routing labels**, not literal Anthropic model selections — every non-template tier ultimately calls `OpenRouterLLMClient.generate_answer()` with the same `RULGPT_LLM_MODEL` + fallback chain. Sanctions-involving jurisdictions checked by keyword: Iran, Russia, North Korea/DPRK, Syria, Cuba, Venezuela, Myanmar, Crimea, Donetsk, Luhansk.
- `RULEGPT_ENABLE_SMART_ROUTING=false` disables tier-based routing entirely — every query routes to `"sonnet"` (the rollback switch still exists and still works the same way).
- **Special cases unchanged**: 0 rules → `"fallback"`; `RetrievalUnavailableError` → `"unavailable"` (quota-neutral); MT700 interpreter calls are persisted with `routing_tier="mt700"` and are excluded from both routing-tier semantics and chat quota counting.
- **The `routing_tier` field** is stored on each `rulegpt_queries` row for analytics. Values now include: `template`, `haiku`, `sonnet`, `opus`, `fallback`, `unavailable`, `mt700`. (`"grounded"` from the old document-breadth deterministic path is a lower-level `model_used` value inside `compose_grounded_answer`, not a `routing_tier` value in the current code — don't confuse the two.)

### Provider routing

```
Query → Classifier ──── OpenRouter (RULGPT_CLASSIFIER_LLM_MODEL) / heuristic
Query → Embedder ─────── OpenAI (optional, re-rank only) ── text-embedding-3-small
Query → Generator ────── OpenRouter primary (RULGPT_LLM_MODEL)
                     └── OpenRouter fallback chain (RULGPT_LLM_FALLBACKS, tried in order)
                     └── Grounded fallback (deterministic, no LLM call) — only on LLMUnavailableError
```

There is no separate "Anthropic direct" vs. "OpenRouter" branch anymore — `OpenRouterLLMClient` (`app/services/integrations/llm_client.py`) is the only LLM transport in the runtime, used for classification, generation, MT700 interpretation, and artifact (case note/draft) generation alike. Each model in the fallback chain gets its own retry budget (`max_retries=2`, exponential backoff) for 429/5xx/timeout before the chain moves to the next model; a non-retryable error also just advances to the next model rather than failing the whole request immediately.

## USER TIERS AND RATE LIMITING

**Tiers:** `anonymous`, `free`, `professional`, `enterprise`. "Pro" ($29/mo) is a **marketing label for the `professional` tier** — there is no separate internal tier value. This is a deliberate choice (see LESSONS LEARNED 2026-05-02 below) to avoid repeating a half-done tier rename.

**Quota windows — now mixed daily/monthly, not uniformly monthly:**
- Anonymous: **2/day**, counted by client IP across all anonymous sessions (`ANONYMOUS_DAILY_LIMIT`)
- Free: **5/day**, counted by user_id if authenticated (`FREE_TIER_DAILY_LIMIT`)
- Professional: 500/**month** (`PROFESSIONAL_TIER_MONTHLY_LIMIT`, unchanged)
- Enterprise: 2000/**month** (`ENTERPRISE_TIER_MONTHLY_LIMIT`, unchanged)

Enforced in `routers/query.py:_tier_limit()` / `_queries_this_month()` (the function name is a holdover from the monthly-only era; it now branches on window type internally). Two query outcomes are explicitly **excluded from quota counting**: `routing_tier == "unavailable"` (RulHub fail-closed — the user didn't get an answer, so it shouldn't cost them a turn) and `routing_tier == "mt700"` (MT700 has its own separate limit, see below). The exclusion uses SQL `is_distinct_from`, not `!=`, so rows with a NULL `routing_tier` are still counted rather than silently dropped by three-valued NULL logic.

**MT700 interpreter limit** (separate from chat quota, `routers/interpret.py`):
- Anonymous: 3/day by IP (`MT700_DAILY_LIMIT_ANON`)
- Authenticated: 10/day by user_id (`MT700_DAILY_LIMIT_AUTH`)

**Per-minute rate limiting:** unchanged — in-memory sliding window in `middleware/rate_limit.py`, 30/min anonymous, 120/min authenticated, resets on restart, not distributed across instances.

**Entitlements (one-off credits, `rulegpt_entitlements` table):** Case Note ($9) and Draft ($19) are one-off Stripe purchases outside the subscription tiers. `consume_or_require_entitlement()` (`routers/deps.py`) lets professional/enterprise users through free; everyone else needs an unconsumed credit row or gets a 402 with `price_usd`/`pro_price_usd` in the body so the frontend can render the paywall without a second round trip. Credits are granted by the Stripe webhook on `mode=payment` checkout completion and consumed with a row-level lock (`FOR UPDATE`) held across the LLM call — a failed generation never burns a credit.

**Tier dependencies (`app/routers/deps.py`):**
- `require_authenticated_user` — any signed-in user
- `require_paid_user` — `professional` or `enterprise` (via the `PAID_TIERS` constant — see the 2026-05-02 lesson on why this is a named constant, not inline tier lists)
- `require_enterprise_user` — `enterprise` only (used by the legacy programmatic `/api/v1/query` API, which is a **different thing from the Pro plan** — don't conflate the two when reasoning about "who can do what")

## AUTH

### Actual implementation
- `TierCheckMiddleware` (`middleware/tier_check.py`) runs on every request
- Extracts bearer token from `Authorization` header
- Calls `SupabaseAuthService.verify_jwt()` which fetches JWKS from Supabase, verifies RS256/ES256 signatures, checks expiry
- Tier is extracted from JWT claims: `app_metadata.rulegpt_tier` or `app_metadata.tier`
- In non-production, falls back to dev headers: `x-user-id` + `x-user-tier`

### Supabase integration status
- JWT verification: **code complete** in `supabase_auth.py` — verified JWKS fetch, token decode, issuer check, kid matching
- User metadata management: **code complete** — `set_user_tier()`, `update_user_metadata()`, `get_user_profile()`
- **Not verified live** — requires `SUPABASE_URL`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars, plus the Site URL / redirect URL / OAuth-app branding updates in `LAUNCH-NOTES.md` §3-4

### Frontend auth
- `useAuth` hook manages Supabase auth state, access tokens, tier
- LoginModal and SignupModal support email/password and Google/LinkedIn OAuth (`VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED` now defaults `false` in `.env.example` — flip on once the LinkedIn app is verified)
- Falls back to local-only auth when Supabase env vars are missing
- Access token persisted in localStorage as `rulegpt_auth_access_token`
- `VITE_PREVIEW_MODE` now defaults `false` (live by default) — it used to default `true`

## TECH STACK

### Backend
- Python 3.11.10
- FastAPI 0.115.12
- SQLAlchemy 2.0.48 (async-compatible sync sessions)
- Alembic 1.15.2
- Pydantic 2.11.2 + pydantic-settings 2.8.1
- psycopg2-binary 2.9.10
- pgvector 0.3.6 (application tables + local-retrieval rollback only, not the primary retrieval path anymore)
- httpx 0.28.1
- openai >=1.0,<2.0 (embedding re-rank only; the `generate_fallback` GPT-4.1 code path is dead-but-present)
- **No `anthropic` package** — removed from `requirements.txt` in the 2026-07 OpenRouter swap
- python-jose 3.3.0 (JWT handling)
- stripe 13.0.0
- pytest 8.3.5 + pytest-asyncio 0.25.3

### Frontend
- React 18.2
- Vite 8.0
- TypeScript ~5.9
- Tailwind CSS 3.4 + tailwindcss-animate
- shadcn/ui (Radix primitives, new-york style)
- @tanstack/react-query 4.35
- react-router-dom 6.16
- @supabase/supabase-js 2.77
- lucide-react 0.286 (icons)
- sonner 2.0 (toasts)
- vitest 2.1 + jsdom + @testing-library/react

### Deployment targets
- Backend: Render (render.yaml)
- Frontend: Vercel (vercel.json)
- Database: Supabase PostgreSQL with pgvector
- Auth: Supabase Auth
- Payments: Stripe

### Design system
- Dark obsidian theme (#0A0A0A) with amber accent (#FF4F00), supports dark/light toggle via ThemeContext — the rebrand spec floated `#050B14` but the team deliberately kept `#0A0A0A`; the rebrand was scoped to naming/domain, not the palette
- Fonts: DM Sans (body), Fraunces (display), JetBrains Mono (citations/code)
- CSS custom properties for colors, spacing (4px base), motion, radii
- Component classes: `.card-dark`, `.card-amber`, `.card-parchment`, `.section-obsidian`, `.section-parchment`
- Grain texture overlay on dark sections, fade/slide animations

## ENVIRONMENT VARIABLES

### Backend (from `rulegpt-api/app/config.py`)

**Critical — app fails without these:**
- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:5432/rulegpt`)
- `SECRET_KEY` — must be changed in production (validated by model_validator)
- `ENVIRONMENT` — `development` or `production`
- `OPENROUTER_API_KEY` — every LLM call (classification, generation, MT700, artifacts) goes through OpenRouter now; without it, `OpenRouterLLMClient.is_available` is `False` and every generation call raises `LLMUnavailableError`

**Retrieval:**
- `RETRIEVAL_BACKEND` — `rulhub` (code default) or `local` (rollback). Render is currently pinned to `local`.
- `RULHUB_API_URL` — default `https://api.rulhub.com`
- `RULHUB_API_KEY` — required for the `rulhub` backend
- `RULHUB_API_VERSION` — **not** in the pydantic `Settings` class; read via raw `os.getenv` in `rulhub_client.py`, default `"2026-04-28"`
- `RULGPT_RETRIEVAL_CACHE_TTL` — default 1800 (seconds), in-process TTL cache on the RulHub retriever singleton
- `RULGPT_RERANK_EMBEDDINGS` — default `true`; embed-rerank RulHub candidates when an OpenAI/OpenRouter key is present
- `RULEGPT_LOCAL_RULES_ROOT` — local JSON rule files path, only used by the local-rollback path and deprecated sync scripts

**LLM / model configuration (live):**
- `RULGPT_LLM_MODEL` — default `z-ai/glm-5`
- `RULGPT_LLM_FALLBACKS` — default `deepseek/deepseek-v4-pro,qwen/qwen3.7-plus` (comma-separated)
- `RULGPT_CLASSIFIER_LLM_MODEL` — default `z-ai/glm-4.7-flash`
- `RULEGPT_EMBEDDING_MODEL` — default `text-embedding-3-small` (re-rank only)
- `OPENAI_API_KEY` — optional, only used for embedding re-rank
- `OPENROUTER_BASE_URL` — default `https://openrouter.ai/api/v1`
- `OPENROUTER_HTTP_REFERER`, `OPENROUTER_APP_TITLE` — OpenRouter tracking headers

**Dead legacy fields (still present in `config.py`, not used by any live code path):** `RULEGPT_CLASSIFIER_MODEL`, `RULEGPT_GENERATOR_MODEL`, `RULEGPT_COMPLEX_MODEL`, `RULEGPT_HAIKU_MODEL`, `RULEGPT_OPUS_MODEL`, `RULEGPT_FALLBACK_MODEL`, `ANTHROPIC_API_KEY` (the latter is not even declared in `Settings` anymore — `extra="ignore"` means a stray value in an env file is silently dropped rather than erroring).

**Smart routing:**
- `RULEGPT_ENABLE_SMART_ROUTING` — default `true`. `false` forces every query to the `"sonnet"` routing label (still OpenRouter under the hood).
- `RULEGPT_TEMPLATE_ENGINE_ENABLED` — default `true`. `false` sends template-eligible queries through the normal tier routing instead.

**Quota windows:**
- `ANONYMOUS_DAILY_LIMIT` — default 2
- `FREE_TIER_DAILY_LIMIT` — default 5
- `PROFESSIONAL_TIER_MONTHLY_LIMIT` — default 500
- `ENTERPRISE_TIER_MONTHLY_LIMIT` — default 2000
- `MT700_DAILY_LIMIT_ANON` — default 3
- `MT700_DAILY_LIMIT_AUTH` — default 10
- `RATE_LIMIT_PER_MIN_ANON` — default 30
- `RATE_LIMIT_PER_MIN_AUTH` — default 120
- `FREE_TIER_MONTHLY_LIMIT` — default 5, legacy field, superseded by `FREE_TIER_DAILY_LIMIT` for the free tier's actual enforcement

**Supabase auth (optional until auth goes live):**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_AUDIENCE`

**Stripe (optional until billing goes live):**
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`, `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`, `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`, `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID` — these four exist and are set
- `STRIPE_PRO_MONTHLY_PRICE_ID` — Pro $29/mo, **does not exist yet**, Ripon creates it (see `LAUNCH-NOTES.md` §6 — watch for the stale-price-ID trap)
- `STRIPE_CASE_NOTE_PRICE_ID`, `STRIPE_DRAFT_PRICE_ID` — $9/$19 one-offs, **do not exist yet**

**Admin:**
- `ADMIN_SECRET` — shared secret for admin endpoints. Required in production.

**CORS:**
- `CORS_ORIGINS` — default includes both `rulgpt.com`/`www.rulgpt.com` and `tfrules.com`/`www.tfrules.com`
- `CORS_ORIGIN_REGEX` — matches `*.vercel.app`, `*.rulgpt.com`, and `*.tfrules.com`

### Frontend (from `rulegpt-ui/.env.example`)
- `VITE_API_BASE_URL` — backend URL (default: `http://localhost:8000`)
- `VITE_PREVIEW_MODE` — default `false` (live by default; set `true` to force the product-shell preview with no live backend calls)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED` — default `true`
- `VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED` — default `false`
- `VITE_ANALYTICS_ENDPOINT` — defaults to `{API_BASE_URL}/api/telemetry/events`
- `VITE_ERROR_REPORTING_ENDPOINT` — defaults to `{API_BASE_URL}/api/telemetry/frontend-errors`

## HOW TO OPERATE

### Starting work
1. Read this CLAUDE.md first
2. Check `git status` and recent commits
3. Check which env vars are set (especially `OPENROUTER_API_KEY` and `RETRIEVAL_BACKEND`)
4. If `RETRIEVAL_BACKEND=local`, verify the database has rules: check if `rulegpt_rules` table has data. If `RETRIEVAL_BACKEND=rulhub`, verify `RULHUB_API_KEY` is set and RulHub is reachable.

### Running locally
```bash
# Backend
cd rulegpt-api
cp .env.example .env  # then fill in API keys — at minimum OPENROUTER_API_KEY and DATABASE_URL
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# If you don't have a RULHUB_API_KEY, set RETRIEVAL_BACKEND=local and populate the local corpus:
# RULEGPT_LOCAL_RULES_ROOT="J:\Enso Intelligence\trdrhub.com\Data" python scripts/sync_local_rules.py --local-only

# Frontend
cd rulegpt-ui
cp .env.example .env.local
npm install
npm run dev
```

### When to use single agent vs swarm
- **Single agent**: UI changes, single-file bug fixes, test additions, config changes
- **Swarm/parallel agents**: Cross-cutting changes that touch both backend and frontend, RAG pipeline changes that require updating tests, migration + model + router changes

### Error handling
- Check backend logs first (telemetry routes log errors; `llm_cost` log lines carry per-query model/cost; routing decisions log to the `rulegpt.routing` logger)
- For RAG failures: check `RETRIEVAL_BACKEND` and, if `rulhub`, whether RulHub itself is reachable (a `RetrievalUnavailableError` surfaces as the "temporarily unavailable" message)
- For auth failures: check `GET /api/auth/status` for missing env vars
- For billing failures: check `GET /api/billing/status` for missing env vars — but remember it does **not** check the Pro/one-off price IDs specifically

### What requires Ripon approval
- Changes to the system prompt in `generator.py`
- Changes to the ICE training eligibility logic in `feedback.py`
- Changes to tier limits or pricing structure
- Any changes to Stripe webhook handling
- RulHub migration / retrieval-backend decisions
- Domain or branding changes

## WHAT NOT TO TOUCH

Without explicit approval:
- **System prompt** (`generator.py` `RULEGPT_SYSTEM_PROMPT_TEMPLATE`) — rewritten during the rebrand, still carefully tuned, still gated
- **ICE pipeline logic** (`feedback.py` `ice_training_eligible`) — this feeds the future ICE product
- **Stripe webhook handler** (`stripe_client.py` `handle_webhook`) — affects real money, now also grants one-off entitlement credits
- **Supabase auth config** (`supabase_auth.py`) — affects real users
- **RulHub client API contract** (`rulhub_client.py` route paths: `/v1/rules`, `/v1/rules/{id}`, `/v1/rules/search`, `/v1/rules/lookup`, `/v1/rulesets`, `/v1/stats`, `/v1/rules/intelligence`) — must match the actual RulHub API
- **Confidence band calculation** (`pipeline.py` `_confidence_from_rules`) — trust calibration, unchanged by the relaunch, still gated

## WHAT NOT TO BUILD

Deferred to future phases:
- PostHog or Sentry integration (current telemetry to backend logs is sufficient for launch)
- Real-time collaborative features
- Document upload/validation (this is TRDR Hub's domain, not RulGPT's)
- Multi-language UI (backend supports en/bn/hi but UI is English-only)
- API key generation and management for Pro tier (distinct from the existing enterprise-only programmatic API)
- Onboarding flow
- Admin dashboard UI

## RETRIEVAL MIGRATION STATUS

The RulHub migration described in earlier versions of this document is **done in code**. What's left is operational, not architectural — tracked in `LAUNCH-NOTES.md` §5-7:

1. RulHub API is suspended; resumes 2026-07-05.
2. Once it resumes: create an Internal-tier `RULHUB_API_KEY`, smoke-test `/v1/stats`, `/v1/rules/search`, `/v1/rules/lookup` directly, then flip `RETRIEVAL_BACKEND` from `local` to `rulhub` in Render.
3. Run all 20 golden queries against the live RulHub path and compare citation accuracy/confidence bands against what shipped on the local corpus.
4. Keep the local corpus (`rulegpt_rules`/`rulegpt_rule_embeddings`) and its rollback path intact until the RulHub path has run clean in production for a week — don't drop those tables early.
5. `GET /api/rules/{rule_id}` (`routers/rules.py`) still checks local-first, RulHub-fallback — this is the one endpoint that was not migrated to RulHub-primary. Low priority to fix (rarely called directly), but worth knowing about if you're asked "does everything read from RulHub now."

## KNOWN ISSUES

ISSUE: Admin auth uses shared secret, not real RBAC
FILE: rulegpt-api/app/routers/deps.py (`require_admin_user`)
DETAIL: Uses `ADMIN_SECRET` env var via `Authorization: Bearer admin:<secret>`. Anyone with the secret has full admin access.
PRIORITY: medium
BLOCKED BY: Decision on whether to use Supabase roles or a separate admin system

ISSUE: In-memory rate limiting is not distributed
FILE: rulegpt-api/app/middleware/rate_limit.py
DETAIL: Rate limit state lives in process memory. Resets on restart. Does not work across multiple Render instances.
PRIORITY: medium
BLOCKED BY: Decision on whether to use Redis or accept single-instance deployment initially

ISSUE: API usage counting is hardcoded to zero
FILE: rulegpt-api/app/routers/api_access.py (line 31)
DETAIL: `get_usage()` returns `api_queries_used=0` always. This is the legacy enterprise-only programmatic API, separate from the new Pro plan.
PRIORITY: medium
BLOCKED BY: API key management system

ISSUE: `billing_status.checkout_ready` is not Pro-price-aware
FILE: rulegpt-api/app/routers/billing.py
DETAIL: `checkout_ready` only checks the four legacy Professional/Enterprise price IDs. It does not check `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_CASE_NOTE_PRICE_ID`, or `STRIPE_DRAFT_PRICE_ID`. The frontend Pro button can render as ready before those env vars are actually set, and the checkout call will 503 when clicked.
PRIORITY: medium
BLOCKED BY: None — straightforward fix, just not yet done

ISSUE: `GET /api/rules/{rule_id}` was not migrated to RulHub-primary
FILE: rulegpt-api/app/routers/rules.py
DETAIL: Reads local `rule_store` first, falls back to `rulhub_client.get_rule()`. Every other retrieval path in the app is RulHub-primary now; this one endpoint is backwards relative to that.
PRIORITY: low
BLOCKED BY: None — low-traffic endpoint

ISSUE: `show_trdr_cta` is always False in the chat pipeline
FILE: rulegpt-api/app/routers/query.py, app/services/rag/pipeline.py
DETAIL: The TRDR Hub CTA trigger logic exists in `generator.py:_rule_cta_trigger()` but is never wired to `True` in any chat response. (The MT700 interpreter has its own separate, always-on LCopilot CTA — that one does fire.)
PRIORITY: low
BLOCKED BY: Product decision on when/how to show the chat-side CTA

## LESSONS LEARNED

_This section should be updated after each significant session. Format:_

```
DATE: YYYY-MM-DD
LESSON: [What was learned]
CONTEXT: [What happened]
ACTION: [What to do differently]
```

DATE: 2026-04-05
LESSON: CLAUDE.md drifted significantly from codebase reality.
CONTEXT: Full audit revealed 12+ factual errors: tiers changed from 3→4 (starter added), anonymous limit 10→20, design system flipped from light cream/burnt orange to dark obsidian/amber, fonts changed from Inter/Space Grotesk to DM Sans/Fraunces, render.yaml existed but wasn't documented, Stripe Starter price IDs existed in config but not render.yaml, local rules path was already fixed to None. No CI/CD existed at all.
ACTION: Update CLAUDE.md after every significant session. Cross-check against actual config.py, not memory. Added GitHub Actions CI/CD (backend-ci, frontend-ci, deploy-gate).

DATE: 2026-05-02
LESSON: A half-done rename is worse than a not-yet-started one — paying customers were silently downgraded to free tier.
CONTEXT: Pricing page + Stripe products had been renamed from `starter`/`pro` → `professional`/`enterprise`, but `tier_check.py` `VALID_TIERS`, `deps.get_request_tier`, `supabase_auth.set_user_tier`, and `supabase_auth._tier_from_claims` still hardcoded the old set `{"free", "starter", "pro"}`. A real Professional checkout would: (1) Stripe webhook computes `tier="professional"`, (2) `set_user_tier` rejects it as "Unsupported tier", (3) even if it wrote, `tier_check` would normalize the JWT claim down to `"free"`, (4) `require_pro_user` (checking `tier != "pro"`) would 403 the paying customer. Net: customer pays $79/mo, gets free tier UX.
ACTION: When renaming a vocabulary that crosses module boundaries (auth, billing, middleware, frontend), grep the entire repo for both old and new names *before* claiming the rename is done. Update tests in the same commit — tests are the canary that catches half-done renames. Use a `PAID_TIERS` named constant in `deps.py` so adding a tier doesn't require touching every gate function. This is also why the 2026-07 "Pro" plan reused the `professional` internal tier value instead of adding a new one — avoids repeating this exact failure mode.

DATE: 2026-07-03
LESSON: This document had drifted from "slightly stale" to actively describing an architecture that no longer existed — the danger isn't just missed updates, it's confidently wrong guidance.
CONTEXT: Launch recon for the RulGPT relaunch found: (1) `select_model()` had already become tier-based (subscription tier first, query signals second), not the "deterministic complexity classifier, cheapest capable model" description that was still in this file; (2) RulHub was already the primary retrieval source behind `RETRIEVAL_BACKEND`, not a secondary/fallback behind a local-corpus-primary design — the "no RULES_SOURCE toggle variable" framing was itself already obsolete language describing a migration that had since completed; (3) the $0 template tier was very much alive (not dead code) but the document said routing was purely complexity-driven, which would have led an agent to assume template-tier logic didn't exist; (4) every Claude model string in the AI ROUTING and RAG PIPELINE sections was dead — the Anthropic SDK had been removed from the runtime entirely in favor of OpenRouter-only generation.
ACTION: Don't trust an "Actual State" section that predates the last 2-3 feature phases — re-verify against `config.py`, `pipeline.py`, and `deps.py` directly before writing docs, the same way the 2026-04-05 lesson said to, but this time the drift was severe enough that a partial read would have produced actively misleading guidance rather than just missing details.

## SUCCESS CRITERIA

**The single test:** A stranger visits rulgpt.com (or tfrules.com during the transition), asks "What documents are required for a CIF shipment under UCP600?", gets a cited answer under 5 seconds, no account needed.

**Performance targets per stage:**
- Classification: < 500ms
- Retrieval: < 1000ms
- Generation: < 3000ms
- Total end-to-end: < 5000ms

**Quality targets:**
- Golden queries (GOLDEN_QUERIES.md, 20 queries): no Fail on GQ-01 through GQ-10
- Out-of-scope queries correctly declined
- Confidence band accurately reflects actual coverage
- Citations only reference rules that were actually retrieved
- Average cost per answer < $0.002 (from `llm_cost` log lines) — new target for the OpenRouter stack, see `LAUNCH-NOTES.md` §7

## CI/CD

**GitHub Actions workflows** (added 2026-04-05):
- `.github/workflows/backend-ci.yml` — Python 3.11, PostgreSQL+pgvector service, pip install, alembic migrate, pytest. Triggers on push/PR to `rulegpt-api/**`.
- `.github/workflows/frontend-ci.yml` — Node 20, npm ci, type-check, lint, test. Triggers on push/PR to `rulegpt-ui/**`.
- `.github/workflows/deploy-gate.yml` — Runs both CI workflows on PRs to `main`. Blocks merge until both pass.

**Deployment:**
- Backend auto-deploys to Render on push to `main` (configured in render.yaml)
- Frontend auto-deploys to Vercel (connected via Vercel dashboard)
- No staging environment yet — preview deployments via Vercel PR previews

## DEPLOYMENT CONFIG

### render.yaml (backend)
- Service: `rulegpt-api`, Python 3.11.10, Oregon region, Starter plan
- Build: `pip install -r requirements.txt`
- Pre-deploy: `alembic upgrade head`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`
- Auto-deploy: on commit
- `RETRIEVAL_BACKEND` is pinned to `local` here (code default is `rulhub`) until RulHub resumes — see `LAUNCH-NOTES.md` §7
- `ANTHROPIC_API_KEY` is still listed as a `sync: false` placeholder but is unused — `LAUNCH-NOTES.md` §5 tells Ripon to remove it
- `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_CASE_NOTE_PRICE_ID`, `STRIPE_DRAFT_PRICE_ID` are `sync: false` placeholders — the actual Stripe prices don't exist yet

### vercel.json (frontend)
- SPA rewrite: all routes → `/index.html`
- Legacy blog-slug redirect only (ISBP 745 → ISBP 821 post slug) — no host-level domain redirect; see `LAUNCH-NOTES.md` §2 for why
- Build/output settings configured in Vercel dashboard

Last audited: 2026-07-03 by Claude Code (Phase 5 of the RulGPT launch plan).
