# CLAUDE.md — RuleGPT Codebase Reference

## WHAT THIS IS

RuleGPT is a citation-first conversational AI for trade finance rules. Users ask questions about ICC standards (UCP600, ISBP745), sanctions (OFAC), FTAs (RCEP, CPTPP), customs, and bank-specific LC rules. They get short, grounded answers with exact rule citations. No account needed for first 20 queries per month.

Built by a Codex agent from a product brief. This document describes what was actually built, not what was planned.

## ECOSYSTEM CONTEXT

Four products in the Enso Intelligence ecosystem:

**RULHUB** (Infrastructure)
- Path: `J:\Enso Intelligence\ICC Rule Engine`
- What: API-only global trade rules engine. 4,000+ curated rulesets. No UI.
- Relationship: RuleGPT's RAG pipeline currently reads rules from a LOCAL PostgreSQL table (`rulegpt_rules`) populated from JSON files. The RulHub API client exists and is fully implemented but is a secondary/fallback source. The eventual target is making RulHub API the primary source. There is NO single `RULES_SOURCE` toggle variable — the migration path uses `include_api` and `include_local` booleans in the embedding sync.

**TRDR HUB** (SME compliance platform)
- Path: `H:\.openclaw\workspace\trdrhub.com`
- What: 15 AI-powered trade compliance tools including LCopilot.
- Relationship: RuleGPT is TRDR Hub's top of funnel. The `show_trdr_cta` field exists in the query model but is currently hardcoded to `False` in the pipeline. The CTA text and URL are defined in schemas but never surfaced.

**RULEGPT** (This repo — `J:\Enso Intelligence\rulgpt`)
- What: This codebase. FastAPI backend + React frontend.
- Launch domain target: `tfrules.com`

**ICE** (Future product — not this repo)
- What: Proprietary trade finance LLM.
- Relationship: The `ice_training_eligible` flag exists in the `rulegpt_queries` table and is set to `True` when a query receives `thumbs_up` feedback AND has `high` confidence AND has at least one citation. This logic lives in `rulegpt-api/app/routers/feedback.py`.

## ACTUAL STATE

### Built and working (code exists, logic is complete)
- FastAPI backend with 25+ endpoints, all wired to the app
- RAG pipeline: classify → retrieve → generate → cite
- 6 database tables with Alembic migrations
- pgvector semantic search + lexical fallback retrieval
- Rule normalization and embedding sync from local JSON files
- RulHub API client with caching, retries, and filesystem fallback
- Anthropic client with Claude classification and generation
- OpenAI client for embeddings and GPT-4.1 fallback generation
- OpenRouter routing layer (all AI calls can go through OpenRouter)
- In-memory sliding-window rate limiting
- Supabase JWT verification (code complete, needs env vars)
- Stripe checkout + webhook handling (code complete, needs env vars)
- React frontend with chat UI, citation panel, sidebar, history, saved answers
- Auth modals (login/signup with email + Google/LinkedIn OAuth)
- Landing page, pricing, FAQ, contact, privacy, terms pages
- Mobile responsive layout with drawer navigation
- Frontend telemetry and error reporting
- Admin endpoints for embedding sync, analytics, conversion tracking
- 17 backend test files, 5 frontend test files

### Built but not yet verified live
- Supabase auth end-to-end (JWT verification code is complete but requires env vars to be set and tested against a real Supabase project)
- Stripe checkout end-to-end (client code is complete but requires Stripe env vars to be set and tested with real Stripe keys)
- Rule data population (database schema exists but rules must be synced via `scripts/sync_local_rules.py` or the admin `/api/embed/sync` endpoint before queries return meaningful results)

### Incomplete or stubbed
- Admin auth uses `ADMIN_SECRET` shared secret — no real RBAC (`rulegpt-api/app/routers/deps.py:45`)
- API usage counting returns hardcoded 0 (`rulegpt-api/app/routers/api_access.py:31`)
- `show_trdr_cta` is always `False` — the CTA trigger logic exists in generator.py but is never set to True in the pipeline response
- Blog scaffold is missing (mentioned in planning docs as next priority)

### Missing entirely
- End-to-end browser tests
- Real RBAC for admin endpoints
- API key management for Pro tier
- Onboarding flow (role, geography, use case questions)
- Blog/content/SEO pages
- Email setup (hello@, support@, billing@)
- PostHog or Sentry integration (telemetry goes to backend log only)

## THE MOST CRITICAL THING

### The rules_service Abstraction and RulHub Migration Path

The abstraction layer is `rulegpt-api/app/services/rag/rule_store.py`. It provides:
- `get_rule_details(session, rule_id)` — queries `rulegpt_rules` table
- `load_rules_for_retrieval(session, domain, jurisdiction, document_type, limit)` — filtered rule loading
- `upsert_rule_record(session, rule)` — upserts normalized rules

**Where rule queries happen:**
1. The retriever (`retriever.py`) uses `rule_store.load_rules_for_retrieval()` for fallback lexical search
2. The retriever uses `rule_store.get_rule_details()` to hydrate semantic search results
3. The retriever also does DIRECT SQL against `rulegpt_rule_embeddings` for pgvector semantic search (retriever.py lines 245-263) — this bypasses rule_store
4. The embedder (`embedder.py`) does direct SQL for embedding upserts and hash checks
5. The rules router (`routers/rules.py`) uses `rule_store.get_rule_details()` with a fallback to `rulhub_client.get_rule()`

**Current data flow:**
```
Local JSON files → sync_local_rules.py → rulegpt_rules table (rule records)
                                        → rulegpt_rule_embeddings table (vectors)
Query arrives → classifier → embeddings table (semantic search)
                           → rules table (fallback lexical search)
                           → rulhub_client (secondary fallback)
```

**There is NO `RULES_SOURCE` toggle variable.** The migration path is controlled by:
- `include_api` and `include_local` booleans passed to `RuleEmbedder.sync_embeddings()`
- The RulHub client already exists and works — it just needs a RulHub API key
- The retriever already falls back to `rulhub_client` when DB lookup fails

**To complete the RulHub migration:**
1. Set `RULHUB_API_KEY` env var
2. Run embedding sync with `include_api=True`
3. Optionally stop using local files by setting `include_local=False`
4. No code changes needed — the architecture already supports both sources

## RAG PIPELINE

### How it works (from `rulegpt-api/app/services/rag/pipeline.py`)

1. **Classification** (`classifier.py`): Heuristic keyword matching first. If Anthropic client is available, runs LLM classification via Claude Haiku, then reconciles with heuristic output. Determines domain, jurisdiction, document_type, complexity, in_scope.

2. **Out-of-scope check**: If classified as out-of-scope, returns: "I specialize in trade finance compliance rules. That question sits outside this product's scope."

3. **LCopilot redirect**: If query matches document-validation markers ("is this lc compliant", "validate my lc", etc.), returns redirect message without TRDR Hub promo.

4. **Retrieval** (`retriever.py`):
   - Embeds query via OpenAI `text-embedding-3-small`
   - Runs pgvector cosine similarity search with hard filters (domain, jurisdiction, document_type)
   - Fetches full rule details for each result from `rulegpt_rules` table
   - Reranks: 70% semantic similarity + 30% lexical overlap
   - Falls back to DB lexical search if semantic search fails
   - Multi-pass filter relaxation (progressively removes jurisdiction, document_type constraints)
   - For document-breadth queries (e.g., "what documents are required for CIF"), requests more results and ensures coverage across document families (invoice, transport, insurance)

5. **Generation** (`generator.py`):
   - For document-breadth queries: uses deterministic `compose_grounded_answer()` (no LLM call)
   - Otherwise: Claude Sonnet primary → GPT-4.1 fallback → deterministic grounded_fallback
   - Post-processing: strips markdown headings, strips follow-up blocks, tightens AI voice, validates that no hallucinated references appear
   - If LLM answer mentions unknown references, falls back to grounded answer

6. **Intent Detection** (`query_intent.py`): Determines query characteristics — `requires_document_breadth()`, `has_partial_coverage_language()`, `extract_fta_agreement()`, `expected_document_families()`. Used by generator and pipeline for specialized handling.

7. **Citations** (`citations.py`): Builds citations from retrieved rules. Prioritizes rules explicitly mentioned in answer text. Max 8 citations. Confidence per citation based on rerank score.

7. **Confidence** (`pipeline.py:_confidence_from_rules`):
   - Always "low" if partial coverage, no rules, or 0 citations
   - "high" requires best_score >= 0.8, average >= 0.6, at least 1 citation
   - "medium" requires best >= 0.5, average >= 0.4
   - Document-breadth queries need >= 2 unique references for "high"

### Exact model strings used in code
- Classifier: `claude-haiku-4-5-20251001` (config: `RULEGPT_CLASSIFIER_MODEL`)
- Generator (Haiku tier): `claude-haiku-4-5-20251001` (config: `RULEGPT_HAIKU_MODEL`)
- Generator (Sonnet tier): `claude-sonnet-4-6` (config: `RULEGPT_GENERATOR_MODEL`)
- Generator (Opus tier): `claude-opus-4-6` (config: `RULEGPT_OPUS_MODEL`)
- Complex: `claude-sonnet-4-6` (config: `RULEGPT_COMPLEX_MODEL`)
- Fallback: `gpt-4.1` (config: `RULEGPT_FALLBACK_MODEL`)
- Embeddings: `text-embedding-3-small` (config: `RULEGPT_EMBEDDING_MODEL`)
- Template engine: no model — deterministic formatting ($0.000)

### Exact system prompt (from `generator.py` lines 18-58)
```
You are RuleGPT, a senior trade finance documentary and compliance specialist built by Enso Intelligence.

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
- Default answer length should usually stay around 150 to 220 words.
- Only go longer when the question genuinely needs multiple rule points, multiple jurisdictions, or multiple conditions to avoid being misleading.
- For complex questions, you may go longer, but only when the extra detail materially improves correctness.
- Keep it concise but complete.

Current date: {current_date}
User tier: {user_tier}
Retrieved rules: {retrieved_rules}
```

### Empty result handling
When retrieval finds no matching rules:
- Answer: "I don't have a specific rule covering that. Here's what related rules say: no closely matching rule was found in the current ruleset."
- model_used: "fallback"
- confidence_band: "low"
- citations: empty
- The pipeline does NOT fall through to model general knowledge. This is correct behavior.

### ICE pipeline
- `ice_training_eligible` defaults to `False` on every new query
- Set to `True` only in `routers/feedback.py` when ALL three conditions are met:
  1. `feedback_type == "thumbs_up"`
  2. `confidence_band == "high"`
  3. `citations` list is non-empty
- The flag is stored on the `rulegpt_queries` row

## AI ROUTING STACK

### Smart Four-Tier Routing (pipeline.py → generator.py)

After retrieval, a deterministic classifier (`_classify_complexity` in pipeline.py) selects the cheapest model capable of answering the query. No LLM call for classification — pure rule count, confidence, and keyword logic.

```
Query → Classifier → Retriever → Smart Router → Generator
                                      │
                                      ├── Tier 0: Template ($0.000)
                                      │   1 rule, high confidence, direct lookup
                                      │   model_used: "template-engine"
                                      │
                                      ├── Tier 1: Haiku (~$0.001)
                                      │   2-4 rules, single domain, high/medium confidence
                                      │   model: claude-haiku-4-5-20251001
                                      │
                                      ├── Tier 2: Sonnet (~$0.011)
                                      │   5+ rules, multi-domain, or low confidence
                                      │   model: claude-sonnet-4-6
                                      │
                                      └── Tier 3: Opus (~$0.25)
                                          fraud/TBML + complex/interpretation only
                                          model: claude-opus-4-6
```

**Routing signals** (in priority order):
1. Opus gate: fraud/TBML keyword AND complex/interpretation complexity
2. Template gate: direct article lookup regex + 1 rule + high confidence
3. Rule count matrix: 1 rule→template/haiku, 2-4→haiku, 5+→sonnet
4. Domain/jurisdiction diversity: 2+ unique domains or jurisdictions → upgrade one tier
5. Low confidence → upgrade one tier

**Special cases:**
- 0 rules → "fallback" (static NO_RULE_MESSAGE, $0.000)
- Document-breadth queries → "grounded" (deterministic answer, $0.000)

**Rollback:** `RULEGPT_ENABLE_SMART_ROUTING=false` → all queries use Sonnet (pre-routing behavior).

**The `routing_tier` field** is stored on each `rulegpt_queries` row for analytics. Values: `template`, `haiku`, `sonnet`, `opus`, `fallback`, `grounded`.

### Provider Routing

```
Query → Classifier ─── OpenRouter/Anthropic/Heuristic ── claude-haiku-4-5-20251001
Query → Embedder ───── OpenAI/OpenRouter ──────────────── text-embedding-3-small (1536d)
Query → Generator ──── Claude primary (tier-selected) ─── haiku/sonnet/opus
                   └─── GPT fallback ─────────────────── gpt-4.1
                   └─── Grounded fallback ────────────── deterministic (no LLM)
```

When `OPENROUTER_API_KEY` is set, ALL AI calls route through OpenRouter. Model names are auto-mapped:
- `claude-haiku-4-5-20251001` → `anthropic/claude-haiku-4.5`
- `claude-sonnet-4-6` → `anthropic/claude-sonnet-4.6`
- `claude-opus-4-6` → `anthropic/claude-opus-4.6`
- `gpt-4.1` → `openai/gpt-4.1`
- `text-embedding-3-small` → `openai/text-embedding-3-small`

This mapping is in `rulegpt-api/app/services/integrations/openrouter.py`.

## USER TIERS AND RATE LIMITING

As actually implemented:

**Tiers:** `anonymous`, `free`, `starter`, `pro`

**Monthly query limits:**
- Anonymous: 20 queries per calendar month per session (`FREE_TIER_MONTHLY_LIMIT`)
- Free: 20 queries per calendar month
- Starter: 500 queries per calendar month (`STARTER_TIER_MONTHLY_LIMIT`)
- Pro: 2,000 queries per calendar month (`PRO_TIER_MONTHLY_LIMIT`)
- Pro API: 10,000 queries (`PRO_TIER_API_LIMIT`)

Enforced in `routers/query.py:_anonymous_queries_this_month()`. When exceeded, returns HTTP 429 with message "Anonymous monthly query limit reached. Please register to continue."

**Per-minute rate limiting:** In-memory sliding window in `middleware/rate_limit.py`:
- Anonymous: 30 requests/minute
- Authenticated (free/starter/pro): 120 requests/minute
- Key: IP + fingerprint + tier + path
- Exempt paths: /health, /docs, /openapi.json

**Important:** Rate limiting is in-memory only. It resets on server restart and does not work across multiple backend instances.

**Note:** Pro API usage counting returns hardcoded 0 (`api_access.py:31`). Real counting not yet implemented.

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
- **Not verified live** — requires `SUPABASE_URL`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars

### Frontend auth
- `useAuth` hook manages Supabase auth state, access tokens, tier
- LoginModal and SignupModal support email/password and Google/LinkedIn OAuth
- Falls back to local-only auth when Supabase env vars are missing
- Access token persisted in localStorage as `rulegpt_auth_access_token`

### What works now without Supabase
- Dev header auth (non-production only)
- Local auth fallback in frontend (creates local user object, no real auth)

## TECH STACK

### Backend
- Python 3.11.10
- FastAPI 0.115.12
- SQLAlchemy 2.0.48 (async-compatible sync sessions)
- Alembic 1.15.2
- Pydantic 2.11.2 + pydantic-settings 2.8.1
- psycopg2-binary 2.9.10
- pgvector 0.3.6
- httpx 0.28.1
- openai >=1.0,<2.0
- anthropic >=0.30,<1.0
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
- Dark obsidian theme (#0A0A0A) with amber accent (#FF4F00), supports dark/light toggle via ThemeContext
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

**AI providers — at least one set needed for queries to work:**
- `ANTHROPIC_API_KEY` — for Claude classification and generation
- `OPENAI_API_KEY` — for embeddings and GPT fallback
- `OPENROUTER_API_KEY` — if set, routes ALL AI calls through OpenRouter (overrides above)
- `OPENROUTER_BASE_URL` — default: `https://openrouter.ai/api/v1`
- `OPENROUTER_HTTP_REFERER` — OpenRouter tracking header
- `OPENROUTER_APP_TITLE` — OpenRouter tracking header

**Model configuration:**
- `RULEGPT_CLASSIFIER_MODEL` — default: `claude-haiku-4-5-20251001`
- `RULEGPT_GENERATOR_MODEL` — default: `claude-sonnet-4-6` (Sonnet tier)
- `RULEGPT_COMPLEX_MODEL` — default: `claude-sonnet-4-6`
- `RULEGPT_HAIKU_MODEL` — default: `claude-haiku-4-5-20251001` (Haiku tier)
- `RULEGPT_OPUS_MODEL` — default: `claude-opus-4-6` (Opus tier)
- `RULEGPT_FALLBACK_MODEL` — default: `gpt-4.1`
- `RULEGPT_EMBEDDING_MODEL` — default: `text-embedding-3-small`

**Smart routing:**
- `RULEGPT_ENABLE_SMART_ROUTING` — default: `true`. Set to `false` to force all queries to Sonnet (rollback switch).
- `RULEGPT_TEMPLATE_ENGINE_ENABLED` — default: `true`. Set to `false` to send template-eligible queries to Haiku instead.

**Supabase auth (optional until auth goes live):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ISSUER`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_AUDIENCE`

**RulHub (optional, for API-sourced rules):**
- `RULHUB_API_URL` — default: `https://api.rulhub.com`
- `RULHUB_API_KEY`
- `RULEGPT_LOCAL_RULES_ROOT` — local JSON rule files path

**Stripe (optional until billing goes live):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STARTER_MONTHLY_PRICE_ID`
- `STRIPE_STARTER_ANNUAL_PRICE_ID`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`

**Admin:**
- `ADMIN_SECRET` — shared secret for admin endpoints. Required in production.

**Rate limiting:**
- `FREE_TIER_MONTHLY_LIMIT` — default: 20
- `STARTER_TIER_MONTHLY_LIMIT` — default: 500
- `PRO_TIER_MONTHLY_LIMIT` — default: 2000
- `PRO_TIER_API_LIMIT` — default: 10000
- `RATE_LIMIT_PER_MIN_ANON` — default: 30
- `RATE_LIMIT_PER_MIN_AUTH` — default: 120

**CORS:**
- `CORS_ORIGINS` — default: `["http://localhost:5173","https://www.tfrules.com","https://tfrules.com"]`
- `CORS_ORIGIN_REGEX` — default: `^https://([a-z0-9-]+\.)*vercel\.app$|^https://([a-z0-9-]+\.)?tfrules\.com$`

### Frontend (from `rulegpt-ui/.env.example`)
- `VITE_API_BASE_URL` — backend URL (default: `http://localhost:8000`)
- `VITE_PREVIEW_MODE` — default: `true`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_GOOGLE_OAUTH_ENABLED` — default: `true`
- `VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED` — default: `true`
- `VITE_ANALYTICS_ENDPOINT` — defaults to `{API_BASE_URL}/api/telemetry/events`
- `VITE_ERROR_REPORTING_ENDPOINT` — defaults to `{API_BASE_URL}/api/telemetry/frontend-errors`

## HOW TO OPERATE

### Starting work
1. Read this CLAUDE.md first
2. Check `git status` and recent commits
3. Check which env vars are set (especially AI provider keys)
4. Verify the database has rules: check if `rulegpt_rules` table has data

### Running locally
```bash
# Backend
cd rulegpt-api
cp .env.example .env  # then fill in API keys
pip install -r requirements.txt
alembic upgrade head
# Populate rules:
RULEGPT_LOCAL_RULES_ROOT="J:\Enso Intelligence\trdrhub.com\Data" python scripts/sync_local_rules.py --local-only
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

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
- Check backend logs first (telemetry routes log errors)
- For RAG failures: check if rules are populated (`GET /api/embed/status`)
- For auth failures: check `GET /api/auth/status` for missing env vars
- For billing failures: check `GET /api/billing/status` for missing env vars

### What requires Ripon approval
- Changes to the system prompt in `generator.py`
- Changes to the ICE training eligibility logic in `feedback.py`
- Changes to tier limits or pricing structure
- Any changes to Stripe webhook handling
- RulHub migration decisions
- Domain or branding changes

## WHAT NOT TO TOUCH

Without explicit approval:
- **System prompt** (`generator.py` RULEGPT_SYSTEM_PROMPT_TEMPLATE) — this is carefully tuned
- **ICE pipeline logic** (`feedback.py` ice_training_eligible) — this feeds the future ICE product
- **Stripe webhook handler** (`stripe_client.py` handle_webhook) — affects real money
- **Supabase auth config** (`supabase_auth.py`) — affects real users
- **RulHub client API contract** (`rulhub_client.py` route paths) — must match actual RulHub API
- **Confidence band calculation** (`pipeline.py` _confidence_from_rules) — trust calibration

## WHAT NOT TO BUILD

Deferred to future phases:
- Blog/content pages
- PostHog or Sentry integration (current telemetry to backend logs is sufficient for launch)
- Real-time collaborative features
- Document upload/validation (this is TRDR Hub's domain, not RuleGPT's)
- Multi-language UI (backend supports en/bn/hi but UI is English-only)
- API key generation and management for Pro tier
- Onboarding flow
- Admin dashboard UI

## RULHUB MIGRATION CHECKLIST

Based on what actually exists in the codebase:

1. **Verify RulHub API is accessible**
   - The client (`rulhub_client.py`) expects endpoints at:
     - `GET /v1/rules` (list/filter)
     - `GET /v1/rules/{rule_id}` (detail)
     - `GET /v1/rulesets` (list rulesets)
   - Test with: set `RULHUB_API_URL` and `RULHUB_API_KEY`, then use the client's `get_rules()` method

2. **Run a dual-source embedding sync**
   - Call `POST /api/embed/sync?include_api=true&include_local=true`
   - This pulls rules from both RulHub API and local files
   - API rules take priority when same `rule_id` exists in both sources
   - Check the sync report for errors

3. **Verify retrieval quality with API-sourced rules**
   - Run golden queries from `GOLDEN_QUERIES.md`
   - Compare answer quality and citation accuracy with local-only data

4. **Switch to API-primary**
   - Run sync with `include_api=true&include_local=false`
   - This means new rules come from RulHub only
   - Existing rules in DB remain unless overwritten by API data

5. **Remove local file dependency**
   - Unset `RULEGPT_LOCAL_RULES_ROOT` if local files are no longer needed
   - The fallback path in `rulhub_client.py` will still try to read local files as a last resort

6. **No code changes required** — the architecture already supports this transition

## KNOWN ISSUES

ISSUE: Admin auth uses shared secret, not real RBAC
FILE: rulegpt-api/app/routers/deps.py (line 45)
DETAIL: `require_admin_user()` uses `ADMIN_SECRET` env var. Better than the old `x-admin=true` header, but still not role-based. Anyone with the secret has full admin access.
PRIORITY: medium
BLOCKED BY: Decision on whether to use Supabase roles or a separate admin system

ISSUE: ~~Global exception handler leaks error details~~ FIXED 2026-04-05
FILE: rulegpt-api/app/exceptions.py
DETAIL: Now logs full exception server-side and returns generic message in production. Dev mode still shows details.

ISSUE: In-memory rate limiting is not distributed
FILE: rulegpt-api/app/middleware/rate_limit.py
DETAIL: Rate limit state lives in process memory. Resets on restart. Does not work across multiple Render instances.
PRIORITY: medium
BLOCKED BY: Decision on whether to use Redis or accept single-instance deployment initially

ISSUE: API usage counting is hardcoded to zero
FILE: rulegpt-api/app/routers/api_access.py (line 31)
DETAIL: `get_usage()` returns `api_queries_used=0` always. No actual query counting for Pro API tier.
PRIORITY: medium
BLOCKED BY: API key management system

ISSUE: show_trdr_cta is always False
FILE: rulegpt-api/app/routers/query.py (line 139)
DETAIL: The TRDR Hub CTA is never shown. The trigger logic exists in `generator.py:_rule_cta_trigger()` but is not wired into the pipeline response.
PRIORITY: low
BLOCKED BY: Product decision on when/how to show CTAs

ISSUE: ~~Hardcoded local rules path~~ FIXED
FILE: rulegpt-api/app/config.py (line 75)
DETAIL: `RULEGPT_LOCAL_RULES_ROOT` now defaults to `None`. No Windows path hardcoded.

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

## SUCCESS CRITERIA

**The single test:** A stranger visits rulegpt.com (or tfrules.com), asks "What documents are required for a CIF shipment under UCP600?", gets a cited answer under 5 seconds, no account needed.

**Performance targets per stage:**
- Classification: < 500ms
- Retrieval: < 1000ms
- Generation: < 3000ms
- Total end-to-end: < 5000ms

**Quality targets:**
- Golden queries (GOLDEN_QUERIES.md): no Fail on GQ-01 through GQ-10
- Out-of-scope queries correctly declined
- Confidence band accurately reflects actual coverage
- Citations only reference rules that were actually retrieved

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
- 74 env vars total (25+ secrets must be set in Render dashboard, marked `sync: false`)

### vercel.json (frontend)
- SPA rewrite: all routes → `/index.html`
- Build/output settings configured in Vercel dashboard

Last audited: 2026-04-05 by Claude Code.
