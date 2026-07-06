# RulGPT — rulgpt.com

Citation-first AI for trade finance rules. Users ask questions about ICC standards (UCP600, ISBP 821, ISP98, URDG758), sanctions (OFAC), FTAs (RCEP, CPTPP, USMCA), customs, and bank-specific LC rules. They get short, grounded answers with exact rule citations — plus a workbench for interpreting MT700 messages and turning an answer into a case note or a draft response.

**Live at [rulgpt.com](https://rulgpt.com)** — cutover completed 2026-07-03; tfrules.com and all www variants 301-redirect to rulgpt.com.

## How It Works

```
Query → Classifier → RulHub Retriever → Tier Router → OpenRouter LLM → Citations → Response
```

1. **Classification** — heuristic keyword matching, with an OpenRouter-routed LLM assist (`z-ai/glm-4.7-flash`) reconciling the result. Determines domain, jurisdiction, document type, complexity, in-scope.
2. **Retrieval** — RulHub API is the primary rule source (`RETRIEVAL_BACKEND=rulhub`), not a local database: keyword-variant search against `POST /v1/rules/search`, hydration via `GET /v1/rules/{id}`, ICC anchor-rule injection via `/v1/rules/lookup`, optional embedding re-rank, and a 30-minute in-process TTL cache. **Fail-closed**: if RulHub is unreachable, the query returns "temporarily unavailable" and is **not** counted against the user's quota — it never falls back to answering from stale local data. A local pgvector path (`RETRIEVAL_BACKEND=local`) still exists as a rollback, reading from the `rulegpt_rules`/`rulegpt_rule_embeddings` tables, but is not the default and its sync scripts are deprecated.
3. **Tier-based routing** — `select_model()` picks Haiku/Sonnet/Opus-equivalent tiers by *user subscription tier* first (anonymous/free always get the cheapest tier; Pro and Enterprise get access to the deeper tiers, weighted toward Opus-equivalent for sanctions/TBML/multi-domain queries), plus a $0 template tier for direct single-rule lookups. All generation tiers route through **OpenRouter**, not Anthropic directly — there is no Anthropic SDK dependency in the runtime.
4. **Generation** — primary model + a config-driven fallback chain (`RULGPT_LLM_MODEL` → `RULGPT_LLM_FALLBACKS`), all via OpenRouter. Citation validation retries once in a strict-citation mode, then degrades to a citations-only answer if the model still hallucinates a reference — it never silently ships an unverified citation.
5. **Citations** — exact rule references from retrieved rules only, max 8 per answer.

No account needed for the first 2 answers per day (anonymous, by IP). Free accounts get 5/day. Pro ($29/mo, internal tier name `professional`) gets fair-use Q&A plus unlimited case notes and drafts.

## Workbench

Beyond the core Q&A chat, RulGPT ships a small workbench of paid/free verbs built on the same retrieval + generation stack:

- **MT700 interpreter** (free) — paste a raw SWIFT MT700 message, get a field-by-field explanation with soft-clause risk flags and citations. Rate-limited separately from chat quota (3/day anonymous, 10/day authenticated) and does not consume chat quota.
- **Case Note** ($9 one-off, or free under Pro) — turns a chat answer into a structured case note.
- **Draft** ($19 one-off, or free under Pro) — turns a chat answer into a draft response (5 draft types).
- All artifacts carry an "Advisory only — not legal advice" footer and support print-to-PDF.
- One-off purchases are tracked as credits in the `rulegpt_entitlements` table, granted via Stripe webhook (`mode=payment`) and consumed atomically per use.

## Tech Stack

### Backend (`rulegpt-api/`)
- Python 3.11, FastAPI, SQLAlchemy, Alembic
- PostgreSQL + pgvector (Supabase) — retained for the local-retrieval rollback path and application tables (sessions, queries, entitlements, feedback)
- **OpenRouter** for all LLM calls (classification, generation, MT700, artifacts) — primary `z-ai/glm-5.2`, fallback chain `deepseek/deepseek-v4-pro` → `qwen/qwen3.7-plus`, classifier `z-ai/glm-4.7-flash`. No Anthropic SDK in the runtime.
- OpenAI `text-embedding-3-small` — optional, used only to re-rank RulHub search candidates by embedding similarity
- Stripe for subscriptions (Pro $29/mo) and one-off artifact purchases (Case Note $9, Draft $19)
- Deployed on **Render**

### Frontend (`rulegpt-ui/`)
- React 18, Vite 8, TypeScript
- Tailwind CSS, shadcn/ui (Radix primitives)
- Chat-first landing page (hero = chat input, not a marketing page)
- Supabase Auth (Google + LinkedIn OAuth)
- Deployed on **Vercel**

### Design
- Dark obsidian theme (#0A0A0A) with amber accent (#FF4F00)
- Fonts: DM Sans (body), Fraunces (display), JetBrains Mono (citations)

## Local Development

### Backend

```bash
cd rulegpt-api
cp .env.example .env  # fill in API keys — at minimum OPENROUTER_API_KEY and DATABASE_URL
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd rulegpt-ui
cp .env.example .env.local
npm install
npm run dev
```

### Local retrieval rollback (optional)

RulHub is the default retrieval source and requires `RULHUB_API_KEY`. If you don't have a RulHub key, set `RETRIEVAL_BACKEND=local` and populate the local corpus instead:

```bash
cd rulegpt-api
RULEGPT_LOCAL_RULES_ROOT="/path/to/rule/json/files" python scripts/sync_local_rules.py --local-only
```

## Environment Variables

See `rulegpt-api/.env.example` and `rulegpt-ui/.env.example` for the full list. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (app tables + local-retrieval rollback) |
| `OPENROUTER_API_KEY` | Yes | All LLM calls — classification, generation, MT700, artifacts |
| `SECRET_KEY` | Yes | App secret (must change in production) |
| `RETRIEVAL_BACKEND` | No | `rulhub` (default) or `local` (rollback) |
| `RULHUB_API_KEY` | For `rulhub` backend | RulHub API authentication |
| `OPENAI_API_KEY` | No | Optional embedding re-rank of RulHub search results |
| `SUPABASE_URL` | For auth | Supabase project URL |
| `STRIPE_SECRET_KEY` | For billing | Stripe payments |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | For Pro checkout | Pro $29/mo price ID |
| `STRIPE_CASE_NOTE_PRICE_ID` / `STRIPE_DRAFT_PRICE_ID` | For one-off checkout | $9 / $19 one-off price IDs |

## Deployment

- **Backend**: Auto-deploys to Render on push to `main` (see `render.yaml`)
- **Frontend**: Auto-deploys to Vercel (project root: `rulegpt-ui/`)
- **Database**: Supabase PostgreSQL with pgvector extension
- **CI/CD**: GitHub Actions (backend-ci, frontend-ci, deploy-gate)
- See `LAUNCH-NOTES.md` for the manual dashboard steps (DNS, Vercel domains, Supabase, Stripe, RulHub key) required to go live.

## Project Structure

```
rulegpt-api/          FastAPI backend
  app/
    routers/          API endpoints (query, interpret, artifacts, billing, ...)
    services/rag/      RAG pipeline (classifier, rulhub_retriever, retriever, generator, citations)
    services/integrations/  OpenRouter/LLM client, RulHub, Stripe, Supabase clients
    models/            SQLAlchemy models
    schemas/           Pydantic schemas
  scripts/             Local rule sync (deprecated), golden query testing
  alembic/             Database migrations

rulegpt-ui/            React frontend
  src/
    pages/             Route pages (Home, Blog, Pricing, FAQ, etc.)
    components/
      landing/          Chat-first landing hero
      workbench/         MT700 interpreter, case note / draft views
      chat/              Chat UI, citations, message actions
      auth/              Auth modals
    data/               Static data (65 blog posts)
    lib/                API client, auth, utilities

CLAUDE.md             Codebase reference for AI agents
LAUNCH-NOTES.md        Manual launch steps (dashboards, keys, Stripe prices)
GOLDEN_QUERIES.md     20 test queries for quality benchmarking
```

## License

Proprietary. Copyright Enso Intelligence Labs. All rights reserved.
