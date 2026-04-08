# tfrules.com

Citation-first AI for trade finance rules. Users ask questions about ICC standards (UCP600, ISBP745, ISP98, URDG758), sanctions (OFAC), FTAs (RCEP, CPTPP, USMCA), customs, and bank-specific LC rules. They get short, grounded answers with exact rule citations.

**Live at [tfrules.com](https://www.tfrules.com)**

## How It Works

```
Query → Classifier → Retriever (pgvector) → Smart Router → LLM → Citations → Response
```

1. **Classification** — heuristic + Claude Haiku determines domain, jurisdiction, complexity
2. **Retrieval** — pgvector semantic search across 4,400+ curated rules, with anchor rule injection and multi-pass filter relaxation
3. **Smart routing** — selects cheapest capable model: Template ($0) → Haiku (~$0.001) → Sonnet (~$0.011) → Opus (~$0.25)
4. **Generation** — grounded answer with anti-hallucination validation and citation checking
5. **Citations** — exact rule references from retrieved rules only, max 8 per answer

No account needed for the first 5 queries per month.

## Tech Stack

### Backend (`rulegpt-api/`)
- Python 3.11, FastAPI, SQLAlchemy, Alembic
- PostgreSQL + pgvector (Supabase)
- Claude (Haiku/Sonnet/Opus) via Anthropic or OpenRouter
- OpenAI text-embedding-3-small for embeddings
- GPT-4.1 as generation fallback
- Deployed on **Render**

### Frontend (`rulegpt-ui/`)
- React 18, Vite 8, TypeScript
- Tailwind CSS, shadcn/ui (Radix primitives)
- Supabase Auth (Google + LinkedIn OAuth)
- Deployed on **Vercel**

### Design
- Dark obsidian theme (#050B14) with amber accent (#FF4F00)
- Fonts: DM Sans (body), Fraunces (display), JetBrains Mono (citations)

## Local Development

### Backend

```bash
cd rulegpt-api
cp .env.example .env  # fill in API keys
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

### Populate Rules

```bash
cd rulegpt-api
RULEGPT_LOCAL_RULES_ROOT="/path/to/rule/json/files" python scripts/sync_local_rules.py --local-only
```

## Environment Variables

See `rulegpt-api/.env.example` and `rulegpt-ui/.env.example` for the full list. Key variables:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes* | Claude for classification + generation |
| `OPENAI_API_KEY` | Yes* | Embeddings + GPT fallback |
| `OPENROUTER_API_KEY` | Alt* | Routes all AI calls through OpenRouter |
| `SECRET_KEY` | Yes | App secret (must change in production) |
| `SUPABASE_URL` | For auth | Supabase project URL |
| `STRIPE_SECRET_KEY` | For billing | Stripe payments |

*At least one AI provider set required.

## Deployment

- **Backend**: Auto-deploys to Render on push to `main` (see `render.yaml`)
- **Frontend**: Auto-deploys to Vercel (project root: `rulegpt-ui/`)
- **Database**: Supabase PostgreSQL with pgvector extension
- **CI/CD**: GitHub Actions (backend-ci, frontend-ci, deploy-gate)

## Project Structure

```
rulegpt-api/          FastAPI backend
  app/
    routers/          API endpoints
    services/rag/     RAG pipeline (classifier, retriever, generator, citations)
    services/integrations/  Anthropic, OpenAI, RulHub, Stripe, Supabase clients
    models/           SQLAlchemy models
    schemas/          Pydantic schemas
  scripts/            Rule upload, golden query testing
  alembic/            Database migrations

rulegpt-ui/           React frontend
  src/
    pages/            Route pages (Home, Blog, Pricing, FAQ, etc.)
    components/       UI components (chat, auth, shared)
    data/             Static data (65 blog posts)
    lib/              API client, auth, utilities

CLAUDE.md             Codebase reference for AI agents
GOLDEN_QUERIES.md     70 test queries for quality benchmarking
```

## License

Proprietary. Copyright Enso Intelligence Labs. All rights reserved.
