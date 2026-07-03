# RulGPT Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relaunch tfrules.com as RulGPT at rulgpt.com — rebranded, retrieving exclusively from the live RulHub API (fail-closed), generating with cheap OpenRouter models (zero Anthropic runtime calls), behind a chat-first landing with an MT700 interpreter (free) and Case Note / Draft artifacts (paid via Stripe).

**Architecture:** Backend `rulegpt-api/` (FastAPI, Python 3.11) gets a new `RulHubRetriever` (feature-flagged `RETRIEVAL_BACKEND=rulhub|local`), a generic `OpenRouterLLMClient` replacing the Anthropic/OpenAI clients in the runtime path, daily quota windows, an MT700 interpreter endpoint, artifact endpoints gated by a new entitlements table fed by Stripe one-off checkouts. Frontend `rulegpt-ui/` (React 18 + Vite) gets a chat-first landing (hero = chat input), mode switcher, artifact views with print-to-PDF, and a full brand sweep.

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0, Alembic, httpx, React 18, Vite, Tailwind, shadcn/ui, Stripe Checkout (hosted), OpenRouter (GLM primary), Supabase auth (unchanged).

## Global Constraints (verbatim from spec — every task inherits these)

- **Citation-first is the product.** Every substantive answer carries exact rule citations from retrieved rules only. Keep the anti-hallucination/citation-validation layer. If retrieval returns nothing usable, the answer says so — never bluff. Fail closed.
- **No document uploads in RulGPT.** Document packs belong to LCopilot (trdrhub.com). Cross-CTA: *"Need the full document check? → LCopilot"* (link to trdrhub.com/lcopilot).
- **ISBP 821**, never 745, in all copy. ICC set: UCP 600, ISBP 821, URDG 758, ISP98, eUCP 2.1, URC 522.
- Every generated artifact (case note, draft) footer: *"Advisory only — not legal advice."*
- **No Anthropic/Claude API dependency in the runtime path** (cost mandate). OpenRouter only.
- Keep Supabase auth (Google + LinkedIn OAuth) as-is.
- Commit and push after each completed phase; small commits with clear messages.
- RulHub base `https://api.rulhub.com` is **suspended until Sunday 2026-07-05** — build with mocked transports; live integration tests run after resume.
- Corpus copy: *"a 15,000-rule grounded corpus with verbatim regulatory citations"* — never claim all rules are executable. Landing numbers from `GET /v1/stats`, fallback "10,000+".
- Product line: *"Before the bank rejects it, ask RulGPT."*
- Keep visual identity: dark obsidian tokens as-is (`#0A0A0A` in code; spec cites `#050B14` — do NOT churn backgrounds), amber unified on `#FF4F00`, DM Sans / Fraunces / JetBrains Mono.

## Recon deltas the implementer must know (verified 2026-07-03)

1. `retriever.py` ALREADY calls RulHub `search_rules()` as Stage 1 primary; pgvector is Stage 2 supplement. Phase 2 = make RulHub the *only* content source behind a flag + fail-closed, not a greenfield port.
2. `rulhub_client.search_rules()` sends `{"query", "limit", ...}` — the v1 contract (`schemas/rules-search.v1.json`, `additionalProperties: false`) accepts `per_page`, NOT `limit`. **Bug; fix in Task 2.1.**
3. Smart routing is `select_model(user_tier, query, retrieved_rules) -> Literal["template","haiku","sonnet","opus","fallback","grounded"]` at `pipeline.py:81`. It never returns `"template"` — dead tier; Task 3.4 re-wires it.
4. Retrieved-rule shape is `RetrievedRule` (rag/models.py:45): `rule_id, rulebook, reference, title, excerpt, domain, jurisdiction, document_type, similarity_score, rerank_score, metadata`.
5. `VITE_PREVIEW_MODE` defaults `true` (`rulegpt-ui/src/lib/config.ts`) — production chat is stubbed. Task 4.7 flips the default; Ripon must also set it in Vercel.
6. Landing hero textarea already exists (`PreviewLanding.tsx` L224-275) and navigates to `/chat` with `state.initialQuery` which `Home.tsx` L326-348 auto-submits. Reuse this seam.
7. Stripe→Supabase entitlement (`set_user_tier`, tiers `{free, professional, enterprise}`) is complete for subscriptions. One-off credits are new (Task 4.3).
8. GOLDEN_QUERIES.md has **15** queries (GQ-01..GQ-15), not 20. Task 5.3 adds GQ-16..GQ-20.
9. The system prompt (`generator.py` `RULEGPT_SYSTEM_PROMPT_TEMPLATE`, lines 18-229) contains "TF Rules", tfrules.com funnel copy, and ISBP745 refs. CLAUDE.md gates prompt changes on Ripon approval; the pasted launch prompt from Ripon explicitly mandates the brand/ISBP wording changes, so brand-string-only edits are authorized. **Do not alter behavior rules, output style, or safety lines.**
10. Tests never hit a real DB or API — fakes/MockTransport only. Keep that pattern.
11. GTM playbook `docs/gtm/GTM-PLAYBOOK-2026-07.md` does not exist anywhere on disk — proceed on the launch prompt alone; flag in LAUNCH-NOTES.md.

## Commit / push protocol

Work directly on `main` (solo repo, existing convention). After each task: run the tests named in the task, commit with the message given. After each phase: `git push`. First commit of Phase 1 includes the pycache untracking below.

---

## Phase 0 — Housekeeping

### Task 0.1: Untrack compiled Python files

**Files:** none created; git index only.

- [ ] **Step 1:** `git rm -r --cached "rulegpt-api/**/__pycache__" 2>$null` (PowerShell) or `git rm -r --cached $(git ls-files "*.pyc" "*__pycache__*")` (bash). Verify `.gitignore` already covers `__pycache__/` (it does).
- [ ] **Step 2:** Commit: `chore: untrack compiled __pycache__ artifacts`

---

## Phase 1 — Rebrand + domain migration

### Task 1.1: Backend config + deploy config domain cutover

**Files:**
- Modify: `rulegpt-api/app/config.py` (CORS block)
- Modify: `rulegpt-api/.env.example` (CORS samples)
- Modify: `render.yaml` (CORS env values)

- [ ] **Step 1:** In `config.py` set:

```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "https://www.rulgpt.com",
    "https://rulgpt.com",
    "https://www.tfrules.com",   # legacy domain kept during 301 transition
    "https://tfrules.com",
]
CORS_ORIGIN_REGEX: str = (
    r"^https://([a-z0-9-]+\.)*vercel\.app$"
    r"|^https://([a-z0-9-]+\.)?rulgpt\.com$"
    r"|^https://([a-z0-9-]+\.)?tfrules\.com$"
)
```

Mirror the same values into `.env.example` and `render.yaml` (the two `CORS_*` env entries).

- [ ] **Step 2:** Run backend tests: `cd rulegpt-api && python -m pytest tests -x -q`. Expected: pass (CORS not asserted in tests).
- [ ] **Step 3:** Commit: `feat(rebrand): add rulgpt.com CORS origins, keep tfrules during transition`

### Task 1.2: vercel.json — 301 host redirect + SPA rewrite

**Files:**
- Modify: `rulegpt-ui/vercel.json`

- [ ] **Step 1:** Replace content with:

```json
{
  "redirects": [
    { "source": "/:path*", "has": [{ "type": "host", "value": "tfrules.com" }], "destination": "https://rulgpt.com/:path*", "permanent": true },
    { "source": "/:path*", "has": [{ "type": "host", "value": "www.tfrules.com" }], "destination": "https://rulgpt.com/:path*", "permanent": true },
    { "source": "/:path*", "has": [{ "type": "host", "value": "www.rulgpt.com" }], "destination": "https://rulgpt.com/:path*", "permanent": true }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

(Redirects run before rewrites on Vercel; prerendered physical files under `dist/<route>/index.html` still win over the rewrite. Ripon must additionally add rulgpt.com + keep tfrules.com as domains on the Vercel project — LAUNCH-NOTES.)

- [ ] **Step 2:** Commit: `feat(rebrand): 301 tfrules.com and www hosts to rulgpt.com`

### Task 1.3: SEO surfaces — index.html, SEOHead, prerender, sitemap, robots, llms.txt

**Files:**
- Modify: `rulegpt-ui/index.html` (18 refs: title/desc/canonical/OG/Twitter/JSON-LD — keep tag *structure* intact; prerender.ts regex-matches it)
- Modify: `rulegpt-ui/src/components/shared/SEOHead.tsx` (`BASE_URL='https://www.rulgpt.com'` → use `https://rulgpt.com`; `og:site_name` → `RulGPT`)
- Modify: `rulegpt-ui/scripts/prerender.ts` (`BASE_URL='https://rulgpt.com'`; every `— TFRules` / `| TFRules` suffix → `| RulGPT`; JSON-LD publisher `RulGPT`; also ADD sitemap generation: after writing routes, emit `dist/sitemap.xml` from the exact route list with `https://rulgpt.com` locs)
- Delete: `rulegpt-ui/public/sitemap.xml` (replaced by generated one)
- Modify: `rulegpt-ui/public/robots.txt` (`Sitemap: https://rulgpt.com/sitemap.xml`, llms comment)
- Modify: `rulegpt-ui/public/llms.txt` (name RulGPT, URLs rulgpt.com; ALSO fix stale pricing — new lineup: Free $0 · 5 questions/day, Pro $29/mo, one-off Case Note $9 / Draft $19)

- [ ] **Step 1:** Apply the string swaps above. Canonical brand strings: product name `RulGPT`, domain `rulgpt.com`, tagline `Before the bank rejects it, ask RulGPT.`, site description mentions "a 15,000-rule grounded corpus with verbatim regulatory citations".
- [ ] **Step 2:** Sitemap generator appended to `prerender.ts` (complete code):

```typescript
const sitemapEntries = [...STATIC_ROUTES.map(r => r.path), '/', '/blog', ...posts.map(p => `/blog/${p.slug}`)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${
  sitemapEntries.map(p => `  <url><loc>${BASE_URL}${p === '/' ? '' : p}</loc></url>`).join('\n')
}\n</urlset>\n`
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap)
```

(Adapt identifier names to what prerender.ts actually uses — `STATIC_ROUTES`/`posts`/`DIST` stand for its existing route array, blog post array, and dist dir variable.)

- [ ] **Step 3:** `cd rulegpt-ui && npm run build` — verify `dist/sitemap.xml` exists and contains `rulgpt.com` locs and 70+ URLs; verify `dist/pricing/index.html` title says RulGPT.
- [ ] **Step 4:** Commit: `feat(rebrand): rulgpt.com SEO surfaces + generated sitemap`

### Task 1.4: UI wordmarks, copy, emails, theme key

**Files (all Modify, rulegpt-ui/src/...):** `components/preview/PreviewLanding.tsx`, `pages/Blog.tsx`, `pages/Contact.tsx`, `pages/Privacy.tsx`, `pages/Pricing.tsx`, `pages/Faq.tsx`, `pages/Terms.tsx`, `pages/Home.tsx`, `pages/ApiAccess.tsx`, `components/chat/RuleGPTMessage.tsx`, `components/layout/PublicFooter.tsx`, `components/layout/Sidebar.tsx`, `components/layout/PublicPageShell.tsx`, `components/auth/AuthDialogShell.tsx`, `components/shared/AppErrorBoundary.tsx`, `components/shared/RuxMascot.tsx`, `src/index.css` (header comment), `src/App.tsx` + `src/contexts/ThemeContext.tsx` (`storageKey="rulgpt-theme"`).

Replacement table (apply case-aware):
| Old | New |
|---|---|
| `TFRules`, `TF Rules`, `tfrules` (wordmark/product) | `RulGPT` |
| `tfrules.com` (URLs, share text) | `rulgpt.com` |
| `Try tfrules free` | `Ask RulGPT free` |
| `TFRules Engine` | `RulHub Engine` |
| `hello@/support@/billing@/privacy@tfrules.com` | same mailbox `@rulgpt.com` |
| `— via tfrules.com` (share suffix) | `— via rulgpt.com` |
| `TFRules Answer` (navigator.share title) | `RulGPT Answer` |

- [ ] **Step 1:** Apply the table across the listed files. Grep to verify no user-facing `tfrules` remains: `grep -ri tfrules rulegpt-ui/src` → expect zero hits.
- [ ] **Step 2:** Unify brand orange: in `src/index.css`, change token `#D97706` occurrences that drive `.btn-primary`, `.citation-chip`, `.badge-*`, and the `amber` custom property to `#FF4F00`; in `tailwind.config.ts` update the `amber` extend color to `#FF4F00` (keep `amber-deep/muted/light` derivatives by darkening/lightening `#FF4F00`: deep `#CC3F00`, muted `#FF7A40`, light `#FFB899`).
- [ ] **Step 3:** `npm run test` (vitest, 8 tests) and `npm run build`. Expected: pass.
- [ ] **Step 4:** Commit: `feat(rebrand): RulGPT wordmark, copy, emails, unified #FF4F00 accent`

### Task 1.5: ISBP 745 → ISBP 821 copy sweep (frontend + docs)

**Files:** `rulegpt-ui/src/data/blogPosts.ts` (36 hits), `rulegpt-ui/index.html` (6), `public/llms.txt` (1), `src/components/preview/PreviewLanding.tsx` (2), `pages/Home.tsx` (1), `components/chat/ThinkingIndicator.tsx` (1: `'Matching ISBP 821 paragraphs...'`), `AuthDialogShell.tsx`, `Faq.tsx`, `Pricing.tsx`, `Blog.tsx` (1 each), plus README/SECURITY/CHANGELOG hits if any.

- [ ] **Step 1:** Replace `ISBP745`/`ISBP 745` → `ISBP 821` in the files above (both spellings; normalize to spaced form `ISBP 821`). Do NOT touch backend files in this task (backend sweep is Task 1.6 with the prompt edit).
- [ ] **Step 2:** `grep -ri "isbp ?745" rulegpt-ui/src rulegpt-ui/index.html rulegpt-ui/public` → zero hits.
- [ ] **Step 3:** Commit: `fix(copy): ISBP 821 (2023 revision) replaces ISBP 745 across UI copy`
- [ ] **Caveat for LAUNCH-NOTES:** blog paragraph-number citations were authored against ISBP 745; numbering mostly carries over but must be spot-verified against 821 — list as a Ripon/content follow-up.

### Task 1.6: Backend brand strings — system prompt (scoped), citation labels, misc

**Files:**
- Modify: `rulegpt-api/app/services/rag/generator.py` — in `RULEGPT_SYSTEM_PROMPT_TEMPLATE` ONLY these strings: `TF Rules` → `RulGPT`; `tfrules.com` → `rulgpt.com` (funnel lines L183/185); `ISBP745`/`ISBP 745` → `ISBP 821` (6 hits). No other prompt edits.
- Modify: `rulegpt-api/app/services/rag/retriever.py` — synthetic rulebook labels `"tfrules-checklist"` → `"rulgpt-checklist"`, `"tfrules-glossary"` → `"rulgpt-glossary"` (user-visible in citation panel).
- Modify: `rulegpt-api/app/services/rag/{embedder.py,pipeline.py}` + `app/services/integrations/rulhub_client.py` — ISBP 745→821 string hits (rulebook display labels / publication lists; verify each hit is a label, not a data key, before changing).
- Modify: `rulegpt-api/scripts/run_golden_queries*.py` — harness strings.

- [ ] **Step 1:** Apply edits. Check `_KNOWN_PUBLICATIONS` in generator.py: it must accept BOTH `ISBP821` and legacy `ISBP745` tokens (retrieved rules from RulHub are 821-tagged; old local rows may still say 745 — the hallucination guard must not reject either while the local backend flag exists).
- [ ] **Step 2:** `python -m pytest tests -x -q` in rulegpt-api. Expected: pass (fix any test asserting old strings — update the assertion, same commit).
- [ ] **Step 3:** `grep -ri tfrules rulegpt-api/app` → zero hits.
- [ ] **Step 4:** Commit: `feat(rebrand): RulGPT brand + ISBP 821 in backend prompt strings and labels`

### Task 1.7: Root docs rebrand

**Files:** Modify `README.md` (title `# RulGPT — rulgpt.com`), `SECURITY.md`, `CHANGELOG.md` (add Unreleased entry "Rebrand tfrules.com → RulGPT at rulgpt.com"), `LICENSE` (contact email), `CLAUDE.md` (domain refs only — full architecture rewrite happens in Task 5.2).

- [ ] **Step 1:** Apply; `grep -ri tfrules *.md LICENSE` at repo root → only CHANGELOG historical entries + CLAUDE.md history lessons may retain the old name (historical record is fine; current-state text must say RulGPT/rulgpt.com).
- [ ] **Step 2:** Commit: `docs(rebrand): RulGPT naming in root docs` — then **push Phase 1**: `git push`.

---

## Phase 2 — Run fully on RulHub (retrieval migration)

### Task 2.1: Fix search contract + add lookup/stats to RulHubClient

**Files:**
- Modify: `rulegpt-api/app/services/integrations/rulhub_client.py`
- Test: `rulegpt-api/tests/integrations/test_rulhub_client.py` (extend)

**Interfaces produced (later tasks rely on exactly these):**
- `async def search_rules(self, query: str, filters: dict | None = None, limit: int = 10, allow_fallback: bool = True) -> list[dict]` — body now `{"query": q, "per_page": min(limit,100)}` + whitelisted filter keys `{"domain","industry","sub_domain","jurisdiction","document_type","source","rule_family","include_superseded","page"}`; never sends `limit`. When `allow_fallback=False`, any transport/HTTP error raises `RulHubClientError` (no `_search_rules_local`, no filesystem).
- `async def lookup_rules(self, *, source: str | None = None, jurisdiction: str | None = None, sub_domain: str | None = None, per_page: int = 20, allow_fallback: bool = True) -> list[dict]` — `GET /v1/rules/lookup` with those query params, returns `data.get("results", [])`.
- `async def get_stats(self) -> dict | None` — `GET /v1/stats`, returns parsed JSON or `None` on any error (never raises).
- `async def get_rule(self, rule_id: str, allow_fallback: bool = True) -> dict | None` — add the `allow_fallback` param; `False` skips filesystem fallback and returns `None` on 404, raises `RulHubClientError` on transport failure.

- [ ] **Step 1: Write failing tests** (extend `test_rulhub_client.py`, using the file's existing `httpx.MockTransport` pattern):

```python
@pytest.mark.asyncio
async def test_search_sends_per_page_not_limit():
    captured = {}
    def handler(request):
        captured.update(json.loads(request.content))
        return httpx.Response(200, json={"query": "q", "results": [], "page": 1, "per_page": 12,
            "corpus_stats": {"active": 1, "superseded": 0, "total": 1, "matched": 0, "include_superseded": False},
            "schema_version": "v1.0.0"})
    client = make_client(handler)  # reuse the file's existing factory/fixture
    await client.search_rules("transhipment", limit=12)
    assert captured["per_page"] == 12 and "limit" not in captured

@pytest.mark.asyncio
async def test_search_no_fallback_raises():
    def handler(request):
        return httpx.Response(503, json={"detail": "suspended"})
    client = make_client(handler)
    with pytest.raises(RulHubClientError):
        await client.search_rules("ucp 600 article 20", allow_fallback=False)

@pytest.mark.asyncio
async def test_lookup_rules_builds_query_params():
    seen = {}
    def handler(request):
        seen["url"] = str(request.url)
        return httpx.Response(200, json={"query": "", "results": [], "page": 1, "per_page": 20,
            "corpus_stats": {"active": 0, "superseded": 0, "total": 0, "matched": 0, "include_superseded": False},
            "schema_version": "v1.0.0"})
    client = make_client(handler)
    await client.lookup_rules(source="ucp600", per_page=20)
    assert "/v1/rules/lookup" in seen["url"] and "source=ucp600" in seen["url"]

@pytest.mark.asyncio
async def test_get_stats_swallows_errors():
    def handler(request):
        return httpx.Response(500)
    client = make_client(handler)
    assert await client.get_stats() is None
```

- [ ] **Step 2:** Run: `python -m pytest tests/integrations/test_rulhub_client.py -x -q` → new tests FAIL.
- [ ] **Step 3:** Implement in `rulhub_client.py`: in `search_rules` build the body from `per_page` + whitelisted filters (drop unknown keys defensively — the server contract is `additionalProperties: false`); thread `allow_fallback` through the error paths; add `lookup_rules` and `get_stats` following `get_rules`' `_request_json` pattern; add `allow_fallback` to `get_rule`.
- [ ] **Step 4:** Run full client tests → PASS. Existing fallback tests keep passing (default `allow_fallback=True` preserves behavior for the legacy path).
- [ ] **Step 5:** Commit: `fix(rulhub): honor rules-search v1 contract (per_page), add lookup/stats, opt-out fallbacks`

### Task 2.2: Shared anchors module

**Files:**
- Create: `rulegpt-api/app/services/rag/anchors.py`
- Modify: `rulegpt-api/app/services/rag/retriever.py` (import from it)

- [ ] **Step 1:** Move `_ANCHOR_RULES` and `_ANCHOR_TRIGGERS` constants verbatim from `retriever.py` into `anchors.py` as `ANCHOR_RULES` / `ANCHOR_TRIGGERS`; re-import in retriever (`from app.services.rag.anchors import ANCHOR_RULES as _ANCHOR_RULES, ...`) so existing code is untouched semantically.
- [ ] **Step 2:** `python -m pytest tests -x -q` → pass. Commit: `refactor(rag): extract anchor rules to shared module`

### Task 2.3: RulHubRetriever — fail-closed, keyword variants, TTL cache, hydration, rerank

**Files:**
- Create: `rulegpt-api/app/services/rag/rulhub_retriever.py`
- Test: `rulegpt-api/tests/test_rulhub_retriever.py`

**Interfaces:**
- Consumes: `RulHubClient.search_rules(..., allow_fallback=False)`, `.lookup_rules(...)`, `.get_rule(rule_id, allow_fallback=False)`, `normalize_rule(raw) -> dict`, `ANCHOR_RULES/ANCHOR_TRIGGERS`, `ClassifierOutput`, `RetrievedRule`, optional `OpenAIClient.embed_texts`.
- Produces: `class RetrievalUnavailableError(Exception)` and `class RulHubRetriever` with `async def retrieve(self, session, query: str, classification: ClassifierOutput, top_k: int = 5) -> list[RetrievedRule]` — signature identical to `RuleRetriever.retrieve` (session accepted, unused). Raises `RetrievalUnavailableError` only when every search attempt fails at transport/HTTP level; returns `[]` on a clean zero-match.

- [ ] **Step 1: Failing tests** (`tests/test_rulhub_retriever.py`, fake client objects — no network):

```python
import pytest
from app.services.rag.models import ClassifierOutput
from app.services.rag.rulhub_retriever import RulHubRetriever, RetrievalUnavailableError, derive_search_queries
from app.services.integrations.rulhub_client import RulHubClientError

CLS = ClassifierOutput(domain="icc", jurisdiction="global", document_type="lc",
                       commodity=None, complexity="simple", in_scope=True, reason=None)

def make_row(rule_id, text="Partial shipments are allowed.", rank=0.5):
    return {"rule_id": rule_id, "source": "ucp600", "rule_family": "UCP600", "industry": "banking",
            "sub_domain": "trade_finance", "domain": "icc_core", "jurisdiction": "global",
            "document_type": "lc", "article": "31", "title": "Partial shipment",
            "severity": "info", "approval_status": "approved", "text": text, "rank": rank}

class FakeClient:
    def __init__(self, rows=None, fail=False):
        self.rows, self.fail, self.search_calls = rows or [], fail, []
    async def search_rules(self, query, filters=None, limit=10, allow_fallback=True):
        self.search_calls.append((query, filters))
        if self.fail: raise RulHubClientError("down", status_code=503)
        return self.rows
    async def get_rule(self, rule_id, allow_fallback=True):
        return {**make_row(rule_id), "text": "FULL TEXT " + rule_id}
    async def lookup_rules(self, **kw): return []

@pytest.mark.asyncio
async def test_fail_closed_when_all_searches_error():
    r = RulHubRetriever(rulhub_client=FakeClient(fail=True), openai_client=None)
    with pytest.raises(RetrievalUnavailableError):
        await r.retrieve(None, "Is transhipment allowed under UCP 600?", CLS)

@pytest.mark.asyncio
async def test_zero_matches_returns_empty_not_error():
    r = RulHubRetriever(rulhub_client=FakeClient(rows=[]), openai_client=None)
    assert await r.retrieve(None, "quantum widget tax", CLS) == []

@pytest.mark.asyncio
async def test_dedup_and_hydration():
    rows = [make_row("UCP600-31", rank=0.9), make_row("UCP600-31", rank=0.4), make_row("UCP600-20", rank=0.6)]
    r = RulHubRetriever(rulhub_client=FakeClient(rows=rows), openai_client=None)
    out = await r.retrieve(None, "partial shipment rules", CLS)
    ids = [x.rule_id for x in out]
    assert ids.count("UCP600-31") == 1 and out[0].excerpt.startswith("FULL TEXT")

def test_derive_search_queries_variants():
    qs = derive_search_queries("Can the LC amount be exceeded by about 10%?", CLS)
    assert 1 <= len(qs) <= 3 and qs[0].startswith("Can the LC amount")
    assert any("letter of credit" in q for q in qs[1:])  # lc expansion

@pytest.mark.asyncio
async def test_cache_hits_skip_second_search():
    fc = FakeClient(rows=[make_row("UCP600-31")])
    r = RulHubRetriever(rulhub_client=fc, openai_client=None)
    await r.retrieve(None, "partial shipment", CLS)
    n = len(fc.search_calls)
    await r.retrieve(None, "partial shipment", CLS)
    assert len(fc.search_calls) == n
```

- [ ] **Step 2:** Run → FAIL (module missing).
- [ ] **Step 3: Implement** `rulhub_retriever.py` (complete skeleton — implementer fills only mechanical loops):

```python
"""RulHub-native retriever. Fail-closed: no local corpus, no filesystem fallback."""
from __future__ import annotations
import asyncio, logging, re, time
from typing import List, Optional
from app.config import get_settings
from app.services.integrations.rulhub_client import (RulHubClient, RulHubClientError,
    get_rulhub_client, normalize_rule)
from app.services.rag.anchors import ANCHOR_RULES, ANCHOR_TRIGGERS
from app.services.rag.models import ClassifierOutput, RetrievedRule

logger = logging.getLogger(__name__)

class RetrievalUnavailableError(Exception):
    """RulHub unreachable — pipeline must fail closed, never answer from memory."""

_STOPWORDS = {"the","a","an","is","are","was","be","of","to","in","on","for","and","or",
              "can","do","does","what","when","under","my","our","with","by","it","that"}
_EXPANSIONS = {"lc": "letter of credit", "bl": "bill of lading", "mt700": "documentary credit issuance",
               "coo": "certificate of origin", "dc": "documentary credit"}
_SOURCE_PATTERN = re.compile(r"\b(ucp\s*600|isbp\s*821|urdg\s*758|isp\s*98|urc\s*522|eucp)\b", re.I)
_DOMAIN_FILTERS = {"icc": {"domain": "icc_core"}, "sanctions": {"domain": "sanctions"},
                   "fta": {"domain": "fta"}, "customs": {"domain": "customs"},
                   "bank_specific": {"sub_domain": "trade_finance"}}

def derive_search_queries(query: str, classification: ClassifierOutput) -> list[str]:
    """Original query first, then up to 2 keyword variants (expansion + term-only)."""
    out = [query.strip()[:500]]
    tokens = re.findall(r"[a-z0-9]+", query.lower())
    expanded = " ".join(_EXPANSIONS.get(t, t) for t in tokens if t not in _STOPWORDS)
    if expanded and expanded not in out:
        out.append(expanded[:500])
    m = _SOURCE_PATTERN.search(query)
    if m:
        keywords = " ".join(t for t in tokens if t not in _STOPWORDS)[:400]
        variant = f"{m.group(0)} {keywords}"[:500]
        if variant not in out:
            out.append(variant)
    return out[:3]

class _TTLCache:
    def __init__(self, max_size: int = 256, ttl: float = 1800.0):
        self.max_size, self.ttl, self._d = max_size, ttl, {}
    def get(self, key):
        hit = self._d.get(key)
        if not hit: return None
        exp, val = hit
        if time.monotonic() > exp:
            self._d.pop(key, None); return None
        return val
    def set(self, key, val):
        if len(self._d) >= self.max_size:
            self._d.pop(next(iter(self._d)), None)
        self._d[key] = (time.monotonic() + self.ttl, val)

class RulHubRetriever:
    def __init__(self, rulhub_client: RulHubClient | None = None, openai_client=None):
        settings = get_settings()
        self.client = rulhub_client or get_rulhub_client()
        self.openai_client = openai_client
        self._cache = _TTLCache(ttl=float(settings.RULGPT_RETRIEVAL_CACHE_TTL))

    async def retrieve(self, session, query: str, classification: ClassifierOutput,
                       top_k: int = 5) -> List[RetrievedRule]:
        top_k = max(3, min(top_k, 8))
        key = self._cache_key(query, classification, top_k)
        cached = self._cache.get(key)
        if cached is not None:
            return list(cached)
        rows, errors, attempts = {}, [], 0
        filters = dict(_DOMAIN_FILTERS.get(classification.domain, {}))
        if classification.jurisdiction and classification.jurisdiction != "global":
            filters["jurisdiction"] = classification.jurisdiction
        for i, q in enumerate(derive_search_queries(query, classification)):
            for f in ([filters, {}] if (i == 0 and filters) else [{}]):
                attempts += 1
                try:
                    results = await self.client.search_rules(q, filters=f or None,
                                                             limit=top_k * 2, allow_fallback=False)
                except (RulHubClientError, Exception) as exc:  # httpx errors surface as RulHubClientError
                    errors.append(exc); continue
                for raw in results:
                    rule = normalize_rule(raw)
                    rid = rule.get("rule_id") or rule.get("id")
                    if not rid: continue
                    rank = float(raw.get("rank") or 0.0)
                    if rid not in rows or rank > rows[rid][1]:
                        rows[rid] = (rule, rank)
                if rows and len(rows) >= top_k * 2:
                    break
            if rows and len(rows) >= top_k * 2:
                break
        if not rows and errors and len(errors) == attempts:
            raise RetrievalUnavailableError(str(errors[-1]))
        if not rows:
            return []
        candidates = self._score(query, rows)
        candidates = await self._maybe_embed_rerank(query, candidates)
        selected = sorted(candidates, key=lambda r: r.rerank_score, reverse=True)[: top_k * 2]
        await self._hydrate(selected)
        selected = await self._inject_anchors(query, classification, selected)
        final = sorted(selected, key=lambda r: r.rerank_score, reverse=True)[:top_k]
        self._cache.set(key, list(final))
        return final
```

Remaining methods (implement in same file): `_cache_key` (normalized lowercase query + domain/jurisdiction/document_type + top_k); `_score` (normalize ts_rank by max → `similarity_score`, lexical token-overlap → blend `0.7*sim + 0.3*lex` into `rerank_score`, build `RetrievedRule(rule_id, rulebook=rule["rulebook"] or rule["source"], reference=rule.get("article") and f"Article {article}" or rule_id, title, excerpt=text[:500], domain/jurisdiction/document_type from rule, metadata={"_source": "rulhub_api", "rank": rank})`); `_maybe_embed_rerank` (if `settings.RULGPT_RERANK_EMBEDDINGS` and `self.openai_client` available: embed query + excerpts via `embed_texts`, cosine → replace `similarity_score`, reblend; any exception → log and keep lexical scores); `_hydrate` (for each selected rule, `get_rule(rid, allow_fallback=False)` in `asyncio.gather` with exceptions suppressed per-rule; on success replace `excerpt` with detail text[:1200] and stash detail in `metadata["raw_detail"]`); `_inject_anchors` (if `classification.domain == "icc"` and any ANCHOR_TRIGGERS keyword in query: `lookup_rules(source="ucp600", per_page=50, allow_fallback=True)`, add missing ANCHOR_RULES ids as RetrievedRule with `metadata={"_anchor": True}` and rerank_score just below the current minimum; swallow lookup errors — anchors are enhancement, not availability).

- [ ] **Step 4:** Run `python -m pytest tests/test_rulhub_retriever.py -x -q` → PASS.
- [ ] **Step 5:** Commit: `feat(retrieval): RulHub-native retriever — fail-closed, variants, TTL cache, hydration`

### Task 2.4: Config flag + pipeline switch + fail-closed handling + quota exclusion

**Files:**
- Modify: `rulegpt-api/app/config.py` — add:

```python
RETRIEVAL_BACKEND: str = "rulhub"          # "rulhub" | "local" (rollback switch)
RULGPT_RETRIEVAL_CACHE_TTL: int = 1800     # seconds, in-process retrieval cache
RULGPT_RERANK_EMBEDDINGS: bool = True      # embed-rerank RulHub candidates when OPENAI key present
```

- Modify: `rulegpt-api/app/services/rag/pipeline.py` — in `RAGPipeline.__init__`/retriever construction: `self.retriever = RulHubRetriever(...) if settings.RETRIEVAL_BACKEND == "rulhub" else RuleRetriever(...)`. Wrap the `retrieve` call: `except RetrievalUnavailableError: return QueryResult(answer=RETRIEVAL_UNAVAILABLE_MESSAGE, citations=[], confidence_band="low", model_used="unavailable", routing_tier="unavailable", ...)` with module constant `RETRIEVAL_UNAVAILABLE_MESSAGE = "Rule retrieval is temporarily unavailable. Your question was not counted against your quota — please try again in a few minutes."`
- Modify: `rulegpt-api/app/routers/query.py` — in `_queries_this_month` / `_anonymous_queries_this_month_by_ip` count queries, add filter `RuleGPTQuery.routing_tier != "unavailable"` so failed-retrieval turns don't consume quota.
- Test: extend `rulegpt-api/tests/test_classifier_and_pipeline.py` with a fake retriever raising `RetrievalUnavailableError` → assert answer == unavailable message, `routing_tier == "unavailable"`, no citations.

- [ ] **Step 1:** Failing test → **Step 2:** implement → **Step 3:** `python -m pytest tests -x -q` PASS.
- [ ] **Step 4:** Commit: `feat(retrieval): RETRIEVAL_BACKEND flag, fail-closed pipeline path, quota exclusion`

### Task 2.5: /api/stats proxy for landing numbers

**Files:**
- Create: `rulegpt-api/app/routers/stats.py`; register in `app/main.py` beside other routers.
- Test: `rulegpt-api/tests/test_stats_route.py`

- [ ] **Step 1:** Failing test: monkeypatch client `get_stats` → `{"active": 15234}` → `GET /api/stats` returns `{"total_rules": 15234}`; monkeypatch → `None` → returns `{"total_rules": null}` with 200.
- [ ] **Step 2:** Implement: router with 1-hour in-process cache (module-level `(expires, value)` tuple), body `{"total_rules": stats.get("active") or stats.get("total")}`.
- [ ] **Step 3:** Tests pass. Commit: `feat(api): /api/stats proxy of RulHub corpus stats for landing`

### Task 2.6: Deprecate local sync path + CHANGELOG migration note

**Files:**
- Modify: `rulegpt-api/scripts/sync_local_rules.py`, `upload_rules.py`, `upload_clean_rules.py` — add module docstring header: `DEPRECATED 2026-07: retrieval is RulHub-native (RETRIEVAL_BACKEND=rulhub). Local corpus kept only as rollback; do not sync new data. See CHANGELOG.`
- Modify: `CHANGELOG.md` — Unreleased: "Retrieval migrated to RulHub API (`RETRIEVAL_BACKEND=rulhub`, fail-closed). Local pgvector corpus and sync scripts deprecated; tables retained for rollback. Do not drop `rulegpt_rules`/`rulegpt_rule_embeddings` until the RulHub path has run clean for a week in production."

- [ ] **Step 1:** Apply, commit: `chore(retrieval): deprecate local rule sync; document migration + rollback window` — then **push Phase 2**.

---

## Phase 3 — LLM swap (strong but cheap, OpenRouter only)

### Task 3.1: Verify OpenRouter catalog and lock model IDs

**Files:** none (execution-time verification; results go into Task 3.2 defaults).

- [ ] **Step 1:** `curl -s https://openrouter.ai/api/v1/models` (no auth needed) and grep for `z-ai/glm`, `deepseek/deepseek-chat`, `qwen/qwen3` — confirm exact current IDs and prices. Target: GLM flagship (expect `z-ai/glm-4.7` or newest GLM ≥4.6), fallback 1 DeepSeek V3-class chat model, fallback 2 a large Qwen instruct model, all sub-$1/M output. Record the three IDs + prices in the Phase 3 commit message body.
- [ ] **Step 2:** If `z-ai/glm-4.7` doesn't exist, use the highest-versioned non-preview `z-ai/glm-*` chat model. These IDs become the config defaults in Task 3.2.

### Task 3.2: Config — model settings

**Files:**
- Modify: `rulegpt-api/app/config.py`
- Modify: `rulegpt-api/.env.example`, `render.yaml` (env entries)

- [ ] **Step 1:** Add (spec-mandated names use RULGPT, no E):

```python
RULGPT_LLM_MODEL: str = "z-ai/glm-4.7"                     # primary (verified in Task 3.1)
RULGPT_LLM_FALLBACKS: str = "deepseek/deepseek-chat-v3.1,qwen/qwen3-235b-a22b-instruct"  # comma list, tried in order
RULGPT_CLASSIFIER_LLM_MODEL: str = "z-ai/glm-4.7"          # heuristic-first; LLM assist via OpenRouter
```

Keep the legacy `RULEGPT_*_MODEL` fields (harmless, unused after this phase) — remove in a later cleanup once stable. Add helper on Settings: `def llm_fallback_models(self) -> list[str]: return [m.strip() for m in self.RULGPT_LLM_FALLBACKS.split(",") if m.strip()]`.

- [ ] **Step 2:** Commit with Task 3.3 (below).

### Task 3.3: OpenRouterLLMClient

**Files:**
- Create: `rulegpt-api/app/services/integrations/llm_client.py`
- Test: `rulegpt-api/tests/integrations/test_llm_client.py`

**Interfaces produced:**
- `@dataclass LLMResult: text: str; model: str; prompt_tokens: int; completion_tokens: int; cost_usd: float | None`
- `class LLMUnavailableError(Exception)`
- `class OpenRouterLLMClient:`
  - `__init__(self, api_key: str | None = None, base_url: str | None = None, timeout: float = 60.0, max_retries: int = 2, client: httpx.AsyncClient | None = None)` — key from `settings.OPENROUTER_API_KEY`.
  - `@property def is_available(self) -> bool`
  - `async def generate_answer(self, prompt: str, system_prompt: str, model: str | None = None, max_tokens: int = 1200, temperature: float = 0.2) -> LLMResult` — tries `[model or settings.RULGPT_LLM_MODEL, *settings.llm_fallback_models()]` in order; per-model retry on 429/5xx/timeout (max_retries); raises `LLMUnavailableError` when the whole chain fails.
  - `async def classify(self, query: str, system_prompt: str, model: str | None = None, max_tokens: int = 256, temperature: float = 0.0) -> str` — same chain with `model or settings.RULGPT_CLASSIFIER_LLM_MODEL` first; returns raw text (classifier.py parses JSON as today).
- Request body: OpenAI-style `{"model": m, "messages": [{"role":"system",...},{"role":"user",...}], "max_tokens", "temperature", "usage": {"include": true}}` → `POST {base}/chat/completions` with `Authorization: Bearer`, plus `HTTP-Referer`/`X-Title` from existing `build_openrouter_headers()`. Parse `choices[0].message.content` and `usage.{prompt_tokens,completion_tokens,cost}` (cost may be absent → None).

- [ ] **Step 1: Failing tests** (httpx.MockTransport):

```python
@pytest.mark.asyncio
async def test_generate_answer_returns_cost():
    def handler(request):
        body = json.loads(request.content)
        assert body["usage"] == {"include": True}
        return httpx.Response(200, json={"choices": [{"message": {"content": "UCP 600 Article 20 answer"}}],
                                         "usage": {"prompt_tokens": 900, "completion_tokens": 180, "cost": 0.00042},
                                         "model": body["model"]})
    c = make_llm_client(handler)
    res = await c.generate_answer("q", "system")
    assert res.text.startswith("UCP 600") and res.cost_usd == pytest.approx(0.00042)

@pytest.mark.asyncio
async def test_fallback_chain_on_5xx():
    models_tried = []
    def handler(request):
        m = json.loads(request.content)["model"]; models_tried.append(m)
        if len(models_tried) < 3:  # primary retries exhausted then fallback-1 succeeds
            return httpx.Response(503)
        return httpx.Response(200, json={"choices": [{"message": {"content": "ok"}}],
                                         "usage": {"prompt_tokens": 1, "completion_tokens": 1}, "model": m})
    c = make_llm_client(handler, max_retries=1)
    res = await c.generate_answer("q", "s")
    assert res.text == "ok" and len(set(models_tried)) >= 2

@pytest.mark.asyncio
async def test_all_models_fail_raises_llm_unavailable():
    def handler(request): return httpx.Response(503)
    c = make_llm_client(handler, max_retries=0)
    with pytest.raises(LLMUnavailableError):
        await c.generate_answer("q", "s")
```

- [ ] **Step 2:** FAIL → **Step 3:** implement (~140 lines; reuse `get_openrouter_base_url`/`build_openrouter_headers` from `openrouter.py`; exponential backoff `0.5 * 2**attempt`) → **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat(llm): OpenRouter LLM client with config-driven model + fallback chain and cost accounting`

### Task 3.4: Rewire generator + re-enable template tier + citation retry/degrade + cost log

**Files:**
- Modify: `rulegpt-api/app/services/rag/pipeline.py`
- Modify: `rulegpt-api/app/services/rag/generator.py`
- Modify: `rulegpt-api/app/services/rag/classifier.py`
- Test: extend `rulegpt-api/tests/test_smart_routing.py`, `tests/test_generator_quality.py`

Changes, in order:

1. **`select_model` template gate** (pipeline.py, top of function, before tier logic):

```python
_DIRECT_LOOKUP = re.compile(r"\b(article|paragraph|rule|field)\s+\d+[a-z]?\b", re.I)

# inside select_model, after the 0-rules fallback check:
if (settings.RULEGPT_TEMPLATE_ENGINE_ENABLED and len(retrieved_rules) == 1
        and _DIRECT_LOOKUP.search(query)):
    return "template"
```

Generator already handles `routing_tier == "template"` via `_template_answer` (generator.py:961 area) — verify that branch still short-circuits before any LLM call and sets `model_used="template-engine"`.

2. **Generator client swap**: `AnswerGenerator.__init__(self, llm_client=None, openai_client=None)` — `self.llm_client = llm_client or OpenRouterLLMClient()`. Delete the Anthropic-primary/OpenAI-fallback ladder in `generate()`; new ladder: template gate (unchanged) → `self.llm_client.generate_answer(prompt, system_prompt, model=None, max_tokens=budget, temperature=0.2)` (the client's own fallback chain covers model failures) → on `LLMUnavailableError` → `compose_grounded_answer` deterministic fallback (`model_used="grounded-fallback"`). Keep `calculate_token_budget`, `normalize_generated_answer`, partial-coverage logic untouched. The tier→model map collapses: all LLM tiers use the config chain; tiers keep controlling **token budget** only (haiku-tier 600, sonnet-tier 1200, opus-tier 1800 — preserve existing budget function semantics).

3. **Citation validation: retry once, then degrade** (generator.py, replacing the current single-shot unknown-reference rejection):

```python
answer_res = await self.llm_client.generate_answer(prompt, system_prompt, max_tokens=budget)
answer = normalize_generated_answer(answer_res.text)
if answer_mentions_unknown_references(answer, retrieved_rules):
    strict = system_prompt + ("\nSTRICT CITATION MODE: You may cite ONLY the exact [rulebook reference] "
                              "pairs present in Retrieved rules. Do not mention any other article, "
                              "publication, paragraph, or rule number.")
    retry_res = await self.llm_client.generate_answer(prompt, strict, max_tokens=budget)
    retry_answer = normalize_generated_answer(retry_res.text)
    if answer_mentions_unknown_references(retry_answer, retrieved_rules):
        answer = compose_citations_only_answer(query, retrieved_rules)   # degrade: no synthesis
        model_used = "citations-only"
    else:
        answer, answer_res = retry_answer, retry_res
```

New helper in generator.py:

```python
def compose_citations_only_answer(query: str, rules: list) -> str:
    lines = ["I can't give a synthesized answer with verified citations for this one. "
             "Here are the relevant rules:"]
    for r in rules[:6]:
        lines.append(f"- [{r.rulebook} {r.reference}] {r.title}: {r.excerpt[:180].rstrip()}…")
    return "\n".join(lines)
```

4. **Cost log**: `generate()` returns dict gains `"cost_usd": answer_res.cost_usd, "generation_model": answer_res.model, "tokens": (answer_res.prompt_tokens, answer_res.completion_tokens)` (None/zeros for template/grounded paths — those cost $0.000). pipeline.py logs after generation: `logger.info("llm_cost query_hash=%s tier=%s model=%s prompt_toks=%s completion_toks=%s cost_usd=%s", hashlib.sha1(query.encode()).hexdigest()[:10], routing_tier, gen.get("generation_model"), ..., f"{gen.get('cost_usd') or 0:.6f}")`. Target avg < $0.002/answer.

5. **Classifier**: replace `AnthropicClient` usage with `OpenRouterLLMClient.classify(...)` — heuristic-first behavior, reconciliation, and JSON parsing unchanged. Pipeline stops constructing `AnthropicClient`/`OpenAIClient` for generation (OpenAIClient stays ONLY for `embed_texts` re-ranking).

- [ ] **Step 1: Failing tests** — `test_smart_routing.py`: `select_model("free", "What does Article 20 say?", [one_rule]) == "template"` when flag on, `"haiku"` when flag off; `test_generator_quality.py`: fake llm_client returning hallucinated refs twice → answer is citations-only degrade containing "Here are the relevant rules"; fake returning bad-then-clean → retry answer used; fake raising `LLMUnavailableError` → grounded fallback.
- [ ] **Step 2:** FAIL → implement → `python -m pytest tests -x -q` PASS (update any test constructing `AnswerGenerator(anthropic_client=...)` to the new kwarg).
- [ ] **Step 3:** Commit: `feat(llm): OpenRouter-only generation — template tier live, citation retry/degrade, cost logging`

### Task 3.5: Remove Anthropic from the runtime path

**Files:**
- Delete: `rulegpt-api/app/services/integrations/anthropic_client.py`
- Modify: `rulegpt-api/requirements.txt` (remove `anthropic`), any residual imports (`grep -r "anthropic" rulegpt-api/app`)
- Modify: `rulegpt-api/tests/integrations/test_openrouter_clients.py` (drop Anthropic-client tests; keep OpenAI embed tests)
- Modify: `rulegpt-api/app/config.py` — keep `ANTHROPIC_API_KEY` field with comment `# unused since 2026-07 LLM swap; kept so stale env vars don't crash pydantic` (pydantic-settings ignores extras only if configured — verify; if extras are ignored, delete the field).

- [ ] **Step 1:** Apply; `grep -ri "import anthropic\|from anthropic\|AnthropicClient" rulegpt-api/app` → zero hits.
- [ ] **Step 2:** `python -m pytest tests -x -q` → PASS. **Step 3:** Commit: `chore(llm): drop Anthropic SDK from runtime — OpenRouter only` — then **push Phase 3**.

---

## Phase 4 — Chat-first landing + workbench v1 + Stripe

### Task 4.1: Daily quota windows (anonymous 2/day, free 5/day)

**Files:**
- Modify: `rulegpt-api/app/config.py`:

```python
ANONYMOUS_DAILY_LIMIT: int = 2
FREE_TIER_DAILY_LIMIT: int = 5
```

- Modify: `rulegpt-api/app/routers/query.py` — `_tier_monthly_limit` becomes `_tier_limit(tier) -> tuple[int, str]` returning `(limit, window)` where window ∈ {"day","month"}: anonymous→(2,"day"), free→(5,"day"), professional→(500,"month"), enterprise→(2000,"month"). `_queries_this_month`/`_anonymous_queries_this_month_by_ip` gain a `window_start` param: day window = `datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)`; month window unchanged. `_limit_reached_message`: anonymous → "You've used your 2 free answers for today. Create a free account for 5 questions a day — no card needed."; free → "You've hit today's 5-question limit. Upgrade to Pro ($29/mo) for fair-use Q&A, case notes, and drafts."
- Test: extend `rulegpt-api/tests/test_rate_limit_tiers.py` — anonymous 3rd query same day → 429 with the new message; free 6th query same day → 429; professional stays monthly.

- [ ] **Step 1:** Failing tests → implement → PASS.
- [ ] **Step 2:** Frontend limits mirror: `rulegpt-ui/src/hooks/useTierLimit.ts` — anon 2, free 5 (labels "today" not "this month"); `MainArea.tsx` upsell copy to match. Run `npm run test`.
- [ ] **Step 3:** Commit: `feat(limits): daily windows — anonymous 2/day, free 5/day`

### Task 4.2: MT700 interpreter (backend)

**Files:**
- Create: `rulegpt-api/app/services/mt700.py` (deterministic parser)
- Create: `rulegpt-api/app/routers/interpret.py` (`POST /api/interpret/mt700`); register in `app/main.py`
- Create: `rulegpt-api/app/schemas/interpret.py`
- Test: `rulegpt-api/tests/test_mt700.py`, `tests/routers/test_interpret_route.py`
- Modify: `rulegpt-api/app/config.py`: `MT700_DAILY_LIMIT_ANON: int = 3`, `MT700_DAILY_LIMIT_AUTH: int = 10`

**Parser (`mt700.py`) — complete core:**

```python
MT700_FIELDS = {
    "20": "Documentary Credit Number", "23": "Reference to Pre-Advice",
    "26E": "Number of Amendment", "27": "Sequence of Total", "31C": "Date of Issue",
    "31D": "Date and Place of Expiry", "32B": "Currency Code, Amount",
    "39A": "Percentage Credit Amount Tolerance", "39B": "Maximum Credit Amount",
    "39C": "Additional Amounts Covered", "40A": "Form of Documentary Credit",
    "40E": "Applicable Rules", "41A": "Available With… By… (BIC)", "41D": "Available With… By…",
    "42C": "Drafts at…", "42A": "Drawee (BIC)", "42D": "Drawee", "42M": "Mixed Payment Details",
    "42P": "Negotiation/Deferred Payment Details", "43P": "Partial Shipments",
    "43T": "Transhipment", "44A": "Place of Taking in Charge/Dispatch",
    "44B": "Place of Final Destination/Delivery", "44C": "Latest Date of Shipment",
    "44D": "Shipment Period", "44E": "Port of Loading/Airport of Departure",
    "44F": "Port of Discharge/Airport of Destination", "45A": "Description of Goods and/or Services",
    "46A": "Documents Required", "47A": "Additional Conditions", "48": "Period for Presentation",
    "49": "Confirmation Instructions", "50": "Applicant", "51A": "Applicant Bank",
    "53A": "Reimbursing Bank", "57A": "Advise Through Bank", "59": "Beneficiary",
    "71B": "Charges", "71D": "Charges", "72Z": "Sender to Receiver Information",
    "78": "Instructions to Paying/Accepting/Negotiating Bank",
}
_TAG_RE = re.compile(r"^:(\d{2}[A-Z]?):\s*", re.M)

SOFT_CLAUSE_PATTERNS = [
    (re.compile(r"\bsubject to\b.*\b(approval|satisfaction|discretion)\b", re.I | re.S),
     "Conditional clause dependent on a party's discretion — payment certainty is weakened."),
    (re.compile(r"\bat (our|the issuing bank'?s?) discretion\b", re.I),
     "Bank-discretion wording — a classic soft clause."),
    (re.compile(r"\babout\b|\bapproximately\b|\bcirca\b", re.I),
     "'About/approximately' triggers the ±10% tolerance of UCP 600 Article 30 — confirm the tolerance is intended."),
    (re.compile(r"\bcharter\s*party\b", re.I),
     "Charter party B/L implications — UCP 600 Article 22 applies; banks do not examine charter parties."),
    (re.compile(r"\bstale\b|\bthird party documents (not )?acceptable\b", re.I),
     "Ambiguous documentary wording — ISBP 821 interpretation risk."),
]

def parse_mt700(raw: str) -> list[dict]:
    """Split raw MT700 text into [{tag, name, content}] in order of appearance."""
    parts = _TAG_RE.split(raw)
    fields = []
    # parts = [preamble, tag1, body1, tag2, body2, ...]
    for i in range(1, len(parts) - 1, 2):
        tag, content = parts[i], parts[i + 1].strip()
        fields.append({"tag": tag, "name": MT700_FIELDS.get(tag, "Unrecognised field"),
                       "content": content})
    return fields

def flag_soft_clauses(fields: list[dict]) -> list[dict]:
    flags = []
    for f in fields:
        for pattern, note in SOFT_CLAUSE_PATTERNS:
            if pattern.search(f["content"]):
                flags.append({"tag": f["tag"], "name": f["name"], "note": note})
    return flags
```

**Endpoint flow** (`interpret.py`): request `{"text": str (50..20000)}`. (1) `parse_mt700` — if `len(fields) < 3` → 422 "That doesn't look like an MT700 message. Paste the raw SWIFT text including :tag: markers." (2) daily limit by IP (anon) / user_id (auth) counting `RuleGPTQuery` rows with `routing_tier == "mt700"` today → 429 over limit. (3) retrieval: two RulHub searches (`"documentary credit issuance UCP600 examination"` and, if flags exist, a search built from the first two flag notes' keywords) via the pipeline's retriever — reuse `RulHubRetriever` with a synthetic `ClassifierOutput(domain="icc", jurisdiction="global", document_type="lc", complexity="interpretation", in_scope=True, commodity=None, reason=None)`. (4) one `llm_client.generate_answer` call, system prompt (new module constant `MT700_SYSTEM_PROMPT` — persona "RulGPT MT700 interpreter", rules: explain field-by-field ONLY the parsed fields given, flag risky/soft clauses, cite only retrieved rules, end with "What to watch" list, no legalese) with user prompt embedding the parsed field table + flags + retrieved rules. (5) `answer_mentions_unknown_references` check with retry-once-then-citations-only degrade (same helper as Task 3.4). (6) store a `RuleGPTQuery` row with `routing_tier="mt700"`. Response schema `InterpretResponse`: `{fields: [{tag,name,content}], flags: [...], answer: str, citations: [CitationItem], disclaimer: "Advisory only — not legal advice.", cta_text: "Need the full document check? → LCopilot", cta_url: "https://trdrhub.com/lcopilot"}`.

- [ ] **Step 1:** Failing parser tests (`test_mt700.py`): parse a 12-field sample MT700 (include `:20:`, `:31D:`, `:39A:`, `:43P:`, `:44C:`, `:45A:`, `:46A:`, `:47A:` with a "subject to buyer's approval" clause) → 12 fields in order, correct names; `flag_soft_clauses` flags the 47A clause and an "about USD 500,000" 32B.
- [ ] **Step 2:** Failing route test: fake retriever + fake llm client → 200 with fields, flags, citations, disclaimer, cta; 4th anon call same day → 429; garbage text → 422.
- [ ] **Step 3:** Implement → PASS → Commit: `feat(mt700): free rate-limited MT700 interpreter with soft-clause flags and LCopilot CTA`

### Task 4.3: Entitlements table + Stripe Pro $29 + one-off checkout + webhook credits

**Files:**
- Create: `rulegpt-api/alembic/versions/<gen>_add_entitlements.py` (`alembic revision -m "add rulegpt_entitlements"`)
- Create: `rulegpt-api/app/models/entitlement.py`
- Modify: `rulegpt-api/app/config.py`:

```python
STRIPE_PRO_MONTHLY_PRICE_ID: Optional[str] = None      # Pro $29/mo — Ripon creates in Stripe
STRIPE_CASE_NOTE_PRICE_ID: Optional[str] = None        # $9 one-off
STRIPE_DRAFT_PRICE_ID: Optional[str] = None            # $19 one-off
```

- Modify: `rulegpt-api/app/services/integrations/stripe_client.py`
- Modify: `rulegpt-api/app/routers/billing.py`
- Test: extend `rulegpt-api/tests/test_billing_routes.py`

**Model** (`entitlement.py`, mirror existing model style/Base):

```python
class RuleGPTEntitlement(Base):
    __tablename__ = "rulegpt_entitlements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(64), nullable=False, index=True)
    kind = Column(String(16), nullable=False)              # "case_note" | "draft"
    credits = Column(Integer, nullable=False, default=1)
    consumed = Column(Integer, nullable=False, default=0)
    stripe_session_id = Column(String(255), nullable=True, unique=True)  # idempotency
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

**StripeClient changes:**
1. `_price_id_for_plan_and_interval`: add plan `"pro"` (monthly only) → `STRIPE_PRO_MONTHLY_PRICE_ID`; `_price_to_tier[STRIPE_PRO_MONTHLY_PRICE_ID] = "professional"` (internal tier vocabulary unchanged — "Pro" is the marketing name for tier `professional`; do NOT rename tiers, see CLAUDE.md 2026-05-02 lesson).
2. New `async def create_oneoff_checkout(self, *, user_id, customer_email, kind: str, success_url, cancel_url)`: `mode="payment"`, price = `STRIPE_CASE_NOTE_PRICE_ID` if kind=="case_note" else `STRIPE_DRAFT_PRICE_ID`, metadata `{"supabase_user_id": user_id, "artifact_kind": kind}`.
3. `handle_webhook`: on `checkout.session.completed` branch on `session["mode"]`: `"subscription"` → existing tier path; `"payment"` → insert `RuleGPTEntitlement(user_id=metadata.supabase_user_id, kind=metadata.artifact_kind, credits=1, stripe_session_id=session.id)` — skip if `stripe_session_id` already exists (idempotent). The webhook handler needs a DB session: pass one in from the route (`handle_webhook(payload, signature, db)`).

**billing.py:** new `POST /api/billing/checkout-oneoff` (auth required) body `{kind: "case_note"|"draft"}` → checkout URL. `GET /api/billing/status` gains `"oneoff_prices_configured": bool`.

**Entitlement consumption helper** (put in `app/routers/deps.py`):

```python
def consume_or_require_entitlement(db, user_id: str, tier: str, kind: str) -> None:
    """Pro/enterprise pass free. Otherwise consume one credit or raise 402."""
    if tier in ("professional", "enterprise"):
        return
    row = (db.query(RuleGPTEntitlement)
             .filter(RuleGPTEntitlement.user_id == user_id, RuleGPTEntitlement.kind == kind,
                     RuleGPTEntitlement.credits > RuleGPTEntitlement.consumed)
             .with_for_update().first())
    if row is None:
        raise HTTPException(status_code=402, detail={"error": "payment_required", "kind": kind})
    row.consumed += 1
    db.flush()
```

- [ ] **Step 1:** Failing tests: webhook payment-mode event → entitlement row created, duplicate event → still 1 row; `checkout-oneoff` returns URL and passes kind metadata (AsyncMock on stripe client); consume twice on 1 credit → second raises 402; professional tier consumes nothing.
- [ ] **Step 2:** `alembic revision` + implement → `python -m pytest tests -x -q` PASS (migration applies in CI's postgres job).
- [ ] **Step 3:** Commit: `feat(billing): Pro $29 plan mapping, one-off checkout, entitlement credits via webhook`

### Task 4.4: Artifact endpoints — Case Note + Draft Response

**Files:**
- Create: `rulegpt-api/app/routers/artifacts.py` (register in main.py), `rulegpt-api/app/schemas/artifacts.py`, `rulegpt-api/app/services/artifacts.py`
- Test: `rulegpt-api/tests/routers/test_artifacts.py`

**Endpoints (auth required, `require_authenticated_user`):**
- `POST /api/artifacts/case-note` body `{query_id: UUID}` → loads the user's `RuleGPTQuery` row (404 if not theirs), `consume_or_require_entitlement(db, user_id, tier, "case_note")`, one LLM call with `CASE_NOTE_SYSTEM_PROMPT` (structure the memo with EXACT headings: `Short answer`, `Rule basis`, `Risk level`, `Reasoning`, `Action steps`, `Assumptions / missing facts`; cite only the stored citations; ≤450 words) over the stored query+answer+citations → unknown-reference validation (retry-once-degrade) → response `{title, body_markdown, citations, disclaimer: "Advisory only — not legal advice.", generated_at}`.
- `POST /api/artifacts/draft` body `{query_id: UUID, draft_type: Literal["bank_response","buyer_email","waiver_request","amendment_request","discrepancy_explanation"]}` → same gate with kind `"draft"`, `DRAFT_SYSTEM_PROMPTS[draft_type]` (each: professional correspondence voice, grounded on the stored answer + citations, placeholders like `[Bank name]` for unknowns, ≤350 words) → same response shape + `draft_type`.
- 402 response body includes `{"kind", "price_usd": 9 or 19, "pro_price_usd": 29}` so the UI can build the paywall modal.

- [ ] **Step 1:** Failing tests (fake llm client, seeded query row, monkeypatched tier): pro user gets case note with all six headings + disclaimer; free user without credits → 402 with price info; free user with a credit → 200 and credit consumed; draft with bad `draft_type` → 422; foreign `query_id` → 404.
- [ ] **Step 2:** Implement → PASS → Commit: `feat(artifacts): case note + draft response endpoints behind Pro/one-off entitlements`

### Task 4.5: Chat-first landing (frontend)

**Files:**
- Create: `rulegpt-ui/src/components/landing/ChatFirstLanding.tsx`
- Modify: `rulegpt-ui/src/pages/Landing.tsx` (render ChatFirstLanding; keep `startCheckout`/`onSubmitQuery` wiring)
- Delete: `rulegpt-ui/src/components/preview/PreviewLanding.tsx` (after parity)
- Modify: `rulegpt-ui/src/lib/api.ts` (add `getStats(): Promise<{total_rules: number | null}>` → `GET /api/stats`)
- Test: `rulegpt-ui/src/components/landing/ChatFirstLanding.test.tsx`

**Structure (claude.ai pattern — the hero IS the chat input):**
1. Slim nav: RulGPT wordmark, Blog / Pricing / FAQ links, Sign in button.
2. Hero (min-h-[70vh], obsidian, centered column, max-w-2xl): H1 `Before the bank rejects it, ask RulGPT.`; subline `Cited answers on UCP 600, ISBP 821, URDG 758, ISP98, eUCP 2.1, URC 522, sanctions, FTAs and customs — grounded in a ${stats}-rule corpus with verbatim regulatory citations.` where `stats` = `total_rules.toLocaleString()` or `"10,000+"`; the existing hero textarea + send button (reuse markup/classes from PreviewLanding L224-259) submitting via `onSubmitQuery(query)` → `/chat` navigation with `state.initialQuery`; 4 suggested-query chips; small print `2 free answers, no account needed.`
3. Below the fold — exactly three feature rows: **Ask** (cited Q&A), **Interpret MT700** (paste an LC, field-by-field risk read — Free, links `/chat?mode=mt700`), **Draft** (case notes + bank-ready responses — Pro); each row: heading, 2-line description, mono-font mock snippet.
4. Pricing section: Free ($0 — 5 questions/day with citations, MT700 interpreter, glossary) / Pro ($29/mo — fair-use Q&A, unlimited case notes + drafts, PDF export, "Most Popular") / one-off strip ("No subscription? Case note $9 · Draft $19, pay as you go"). Pro CTA → existing `onStartCheckout("pro", "monthly")`.
5. LCopilot cross-CTA band: `Need the full document check? → LCopilot` linking `https://trdrhub.com/lcopilot`.
6. Footer: reuse `PublicFooter`.
No marketing-brochure hero, no carousel, no fake dashboards. Keep obsidian/amber identity and existing utility classes (`.section-obsidian`, `.card-dark`, `.btn-primary`).

- [ ] **Step 1:** Failing vitest: renders H1 tagline; typing + submit calls `onSubmitQuery` with the text; stats fetch failure renders `10,000+`; pricing shows $29.
- [ ] **Step 2:** Implement; update `Pricing.tsx` and `Upgrade.tsx` to the new lineup (Free/Pro $29; keep Enterprise card as "Contact us" mailto:hello@rulgpt.com — tier stays wired internally); fix `Upgrade.test.tsx` expectations.
- [ ] **Step 3:** `npm run test && npm run build` → PASS. Commit: `feat(landing): chat-first hero, three verbs, new pricing, LCopilot CTA`

### Task 4.6: Workbench UI — mode switcher, MT700 view, artifact actions + paywall + print PDF

**Files:**
- Modify: `rulegpt-ui/src/pages/Home.tsx` (mode state from `?mode=` param: `ask | mt700`)
- Create: `rulegpt-ui/src/components/workbench/Mt700Interpreter.tsx` (textarea paste → `api.interpretMt700(text)` → field table + flag list + answer + citations + CTA + disclaimer)
- Create: `rulegpt-ui/src/components/workbench/ArtifactView.tsx` (renders `body_markdown` with print stylesheet; "Download PDF" button = `window.print()` on a print-isolated route/dialog; footer line always `Advisory only — not legal advice.`)
- Create: `rulegpt-ui/src/components/workbench/PaywallDialog.tsx` (on 402: "Case note — $9 one-off" / "Draft — $19 one-off" / "Go Pro $29/mo" buttons → `api.createOneoffCheckout(kind)` or existing pro checkout)
- Modify: `rulegpt-ui/src/components/chat/MessageActions.tsx` (add `Generate case note` + `Draft response ▾` (5 draft types) actions on assistant messages; wire to `api.createCaseNote(queryId)` / `api.createDraft(queryId, type)`; 402 → PaywallDialog)
- Modify: `rulegpt-ui/src/lib/api.ts` (add `interpretMt700`, `createCaseNote`, `createDraft`, `createOneoffCheckout`)
- Modify: `rulegpt-ui/src/components/layout/Sidebar.tsx` (mode links: Ask, Interpret MT700; disabled item `Matters (soon)`)
- Modify: `rulegpt-ui/src/types/index.ts` (InterpretResponse, ArtifactResponse, DraftType)
- Test: `Mt700Interpreter.test.tsx` (renders fields+flags from mocked response; shows LCopilot CTA), `PaywallDialog.test.tsx` (three options, correct checkout calls)

- [ ] **Step 1:** Failing tests → **Step 2:** implement → `npm run test && npm run build` PASS.
- [ ] **Step 3:** Commit: `feat(workbench): MT700 interpreter view, case note/draft actions, paywall, print-to-PDF`

### Task 4.7: Preview mode off + env plumbing

**Files:**
- Modify: `rulegpt-ui/src/lib/config.ts` — `isPreviewModeEnabled()` default becomes **false** (env value still wins).
- Modify: `rulegpt-ui/.env.example` — `VITE_PREVIEW_MODE=false` + comment.
- Modify: `rulegpt-api/.env.example`, `render.yaml` — add the new env keys: `RETRIEVAL_BACKEND`, `RULGPT_LLM_MODEL`, `RULGPT_LLM_FALLBACKS`, `RULGPT_CLASSIFIER_LLM_MODEL`, `RULGPT_RETRIEVAL_CACHE_TTL`, `RULGPT_RERANK_EMBEDDINGS`, `ANONYMOUS_DAILY_LIMIT`, `FREE_TIER_DAILY_LIMIT`, `MT700_DAILY_LIMIT_ANON`, `MT700_DAILY_LIMIT_AUTH`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_CASE_NOTE_PRICE_ID`, `STRIPE_DRAFT_PRICE_ID` (`sync: false` for secrets in render.yaml).
- [ ] **Step 1:** Apply; `npm run test` (MainArea/SuggestedQueries tests assume preview — set `VITE_PREVIEW_MODE=true` in those tests' env or update assertions).
- [ ] **Step 2:** Commit: `feat(config): live mode by default, new env surface for RulHub/LLM/limits/Stripe` — then **push Phase 4**.

---

## Phase 5 — Finalize

### Task 5.1: LAUNCH-NOTES.md (manual steps for Ripon)

**Files:** Create `LAUNCH-NOTES.md` (repo root). Sections, each with exact click-paths/values:
1. **DNS**: point rulgpt.com (A/ALIAS + www CNAME) at Vercel per Vercel's domain instructions.
2. **Vercel**: add `rulgpt.com` (primary) + `www.rulgpt.com` + keep `tfrules.com`/`www.tfrules.com` attached so the in-repo 301s fire; set env `VITE_PREVIEW_MODE=false`, `VITE_API_BASE_URL=https://<render-api-url>`.
3. **Supabase**: Auth → URL Configuration → Site URL `https://rulgpt.com`; add redirect URLs `https://rulgpt.com/**`, keep tfrules during transition. Google/LinkedIn OAuth apps: add callback `https://<supabase-project>.supabase.co/auth/v1/callback` unchanged, but update authorized origins/branding to rulgpt.com.
4. **Render env**: `RULHUB_API_KEY` (create **Internal-tier key** — unlimited/$0 Enso ecosystem plan — in RulHub admin dashboard after service resumes 2026-07-05), `OPENROUTER_API_KEY`, `RETRIEVAL_BACKEND=rulhub`, the Phase 3/4 keys from Task 4.7, remove `ANTHROPIC_API_KEY`.
5. **Stripe** (acct Enso Intelligence Labs `acct_1T4IAtBG8gnvAJXa`): create Pro $29/mo recurring price, Case Note $9 one-off, Draft $19 one-off (test mode first) → put the three price IDs in Render env; webhook endpoint `https://<api>/api/billing/webhook` with events `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`; flip live keys after test-mode e2e.
6. **Post-resume acceptance (2026-07-05)**: run `python rulegpt-api/scripts/run_golden_queries.py --base-url http://localhost:8000` (all 20 GQs green, citations valid, avg cost < $0.002 from llm_cost logs); MT700 paste demo; anonymous→2-answers→signup→5/day→Pro-upgrade walkthrough in Stripe test mode.
7. **Content follow-ups**: verify blog ISBP 821 paragraph numbers; mailboxes hello@/support@/billing@/privacy@rulgpt.com; GTM playbook file referenced by the launch prompt (`ICC Rule Engine/docs/gtm/GTM-PLAYBOOK-2026-07.md`) does not exist — recreate or correct the pointer.

- [ ] Commit: `docs: LAUNCH-NOTES with manual launch steps`

### Task 5.2: README + CLAUDE.md architecture rewrite

**Files:** Modify `README.md`, `CLAUDE.md`.
- README: RulGPT identity, chat-first product description, RulHub-native retrieval diagram, OpenRouter model config, new env table, workbench verbs, pricing.
- CLAUDE.md: update RESUME block (date, state), ACTUAL STATE, THE MOST CRITICAL THING (retrieval is RulHub-native behind `RETRIEVAL_BACKEND`; local corpus = rollback only), AI ROUTING (tier-based `select_model` + template gate + OpenRouter chain — replace the stale complexity-matrix description and stale model strings), tiers/limits (daily windows, Pro $29 = internal tier `professional`), env vars, LESSONS LEARNED entry (recon deltas: stale CLAUDE.md sections found 2026-07-03).
- [ ] Commit: `docs: README + CLAUDE.md reflect RulHub-native, OpenRouter, workbench architecture`

### Task 5.3: Golden queries to 20 + runner target

**Files:** Modify `GOLDEN_QUERIES.md`, `rulegpt-api/scripts/run_golden_queries.py`.
- Append (renumber if any duplicates an existing GQ — check first):
  - GQ-16: "Explain what MT700 field 46A controls and how strictly banks apply the documents listed there." (ICC)
  - GQ-17: "Under ISBP 821, can the goods description on the invoice differ from the LC wording?" (ICC)
  - GQ-18: "When does a demand under URDG 758 have to be presented, and what makes it non-complying?" (ICC)
  - GQ-19: "What changes under eUCP 2.1 when documents are presented electronically?" (ICC)
  - GQ-20: "What proof of origin does RCEP accept for preferential tariff treatment?" (FTA)
- Runner: add `--base-url` arg (default `http://localhost:8000`), print per-query `cost_usd` if present, exit non-zero on any GQ-01..GQ-10 Fail.
- [ ] Commit: `test(golden): 20 golden queries + local runner target` — then **push Phase 5**. Full suite check: `python -m pytest tests -q` + `npm run test` + `npm run build` all green.

---

## Self-review notes (done at plan time)

- **Spec coverage:** Phase 1 ✓ (rebrand, redirects, CORS, ISBP 821, palette kept); Phase 2 ✓ (rulhub_retriever, keyword variants, embed re-rank optional, lookup anchors, TTL cache, flag, fail-closed, deprecation note, stats); Phase 3 ✓ (config-driven OpenRouter primary+fallbacks, template tier kept, length routing kept, citation retry/degrade, embeddings kept for re-rank, cost logs, zero Anthropic); Phase 4 ✓ (chat-first hero, 2-anon/5-day walls, MT700 free lead magnet + CTA, case note $9, draft $19, Pro $29, hosted Checkout only, webhook entitlements, Matters stub, advisory footers); DoD ✓ via Phase 5.
- **Live acceptance** (20 GQs through the real RulHub path, Stripe test-mode e2e) is blocked on RulHub resuming 2026-07-05 and on Ripon's keys — encoded as LAUNCH-NOTES §6 rather than a plan task.
- **Type consistency:** `RetrievedRule` consumed everywhere; `LLMResult` produced by Task 3.3 consumed in 3.4/4.2/4.4; `consume_or_require_entitlement` produced in 4.3 consumed in 4.4; `RulHubClient.search_rules(allow_fallback=)` produced in 2.1 consumed in 2.3.
- **Deliberate deviations from spec text, with reasons:** (1) anonymous "2 answers" implemented as 2/day per IP — spec gives no window; daily is the defensible reading next to free 5/day. (2) Spec's obsidian `#050B14` not applied — code uses `#0A0A0A` and spec says "the rebrand is not the palette". (3) Internal tier name stays `professional` under the "Pro" label — avoids repeating the 2026-05-02 half-rename incident. (4) GOLDEN_QUERIES.md has 15 queries, not the spec's 20 — five added.

