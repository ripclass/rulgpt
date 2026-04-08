# Changelog

## v1.0.0 — 2026-04-07

Production launch of tfrules.com.

### Core
- RAG pipeline: classify, retrieve, generate, cite
- 4,459 active rules across 36+ rulebooks (ICC, sanctions, FTAs, customs, bank-specific)
- pgvector semantic search with lexical fallback and anchor rule injection
- Smart four-tier model routing: Template, Haiku, Sonnet, Opus
- Adaptive token budgets (600-1800 based on complexity)
- Contradiction detection with 12 foundational ICC rules in prompt
- Citation validator with containment matching
- Contextual suggested followups via Haiku

### Frontend
- React 18 + Vite 8 + TypeScript
- Chat UI with citation panel, session history, saved answers
- Landing page with live query input
- 65 blog posts covering all golden queries
- Blog landing with search, tag filters, 3-column grid
- Per-page SEO meta tags (react-helmet-async)
- Pricing, FAQ, Contact, Privacy, Terms pages
- Auth modals (email + Google/LinkedIn OAuth)
- Mobile responsive with drawer navigation
- Dark obsidian theme with amber accent

### Backend
- FastAPI with 25+ endpoints
- Supabase JWT verification
- Stripe checkout + webhook handling
- RulHub API client with caching and fallback
- OpenRouter routing layer
- In-memory sliding-window rate limiting
- Admin endpoints for embedding sync and analytics

### Infrastructure
- Backend on Render (auto-deploy from main)
- Frontend on Vercel (auto-deploy from main)
- Database on Supabase PostgreSQL + pgvector
- GitHub Actions CI/CD (backend-ci, frontend-ci, deploy-gate)

### Quality
- Benchmark: 4.7/5.0 across 70 golden queries, zero auto-fails
- 17 backend test files, 5 frontend test files
