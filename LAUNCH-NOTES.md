# LAUNCH-NOTES.md — Manual steps for Ripon

Everything in this file requires a human with dashboard access (Vercel, Render, Supabase, Stripe, RulHub, Google/LinkedIn developer consoles). Nothing here can be done by an agent. Work through it in order — later sections assume earlier ones are done.

Last updated: 2026-07-03, alongside the RulGPT launch (Phase 5 of the launch plan). Code state as of commit `4868fbb`.

---

## 0. Pre-cutover: verify the rules corpus is populated

Do this before touching DNS/Vercel — an unpopulated corpus makes the entire launch pointless even if every other step below is done correctly.

Call `GET /api/embed/status` (admin-authenticated) and confirm `report.counts.stored_rules` is **> 0** while `RETRIEVAL_BACKEND=local` (the current Render pin — see §5). This endpoint only counts the local `rulegpt_rules`/`rulegpt_rule_embeddings` tables, so it's only meaningful while retrieval is pinned to `local`; once `RETRIEVAL_BACKEND` flips to `rulhub` (§7), rule content lives in RulHub itself and this count stops being the source of truth.

An empty corpus doesn't error — it silently degrades **every** answer to the static refusal ("I don't have a specific rule covering that...") because the RAG pipeline fails closed on zero retrieved rules (see `CLAUDE.md`, "Empty result handling"). Populate via `scripts/sync_local_rules.py` or `POST /api/embed/sync`, or skip straight to the RulHub flip in §7 if RulHub has already resumed by the time you're cutting over.

## 1. DNS

Point `rulgpt.com` at Vercel:
- `A`/`ALIAS` record for the apex (`rulgpt.com`) → Vercel's IP per their domain-setup instructions (or `ALIAS`/`ANAME` to `cname.vercel-dns.com` if your DNS host supports it).
- `CNAME` for `www.rulgpt.com` → `cname.vercel-dns.com`.

Use Vercel's own "Add Domain" instructions screen for the exact values — they occasionally change the target IP/CNAME.

## 2. Vercel

1. Project → Settings → Domains: add `rulgpt.com` and `www.rulgpt.com`. Set `rulgpt.com` as the **primary domain**.
2. **Keep `tfrules.com` and `www.tfrules.com` attached to the project** (do not remove them). Once `rulgpt.com` is primary, Vercel automatically 301-redirects the old domains to it. This is intentional and is *not* configured in `vercel.json` — see "Why the host redirect isn't in the repo" below.
3. Project → Settings → Environment Variables:
   - `VITE_PREVIEW_MODE=false` (already the default in `.env.example`, but confirm the Vercel dashboard value isn't overriding it to `true`)
   - `VITE_API_BASE_URL=https://<render-api-url>` (the Render service URL from step 4 below, e.g. `https://rulegpt-api.onrender.com`)
   - Confirm `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are set (needed for step 3)
4. Redeploy after changing env vars — Vercel does not hot-reload build-time `VITE_*` values.

**Why the host redirect isn't in `vercel.json`:** `rulegpt-ui/vercel.json` only carries the legacy blog-slug redirect (`/blog/compliant-commercial-invoice-isbp745` → `...-isbp821`). A `tfrules.com` → `rulgpt.com` host redirect was deliberately left out of the repo during Phase 1 — hardcoding it there would have started redirecting **live production traffic on tfrules.com away from itself before DNS for rulgpt.com existed**, breaking the only working domain mid-launch. The domain-level 301 belongs to Vercel's primary-domain setting, which only activates once you do step 2 above.

## 3. Supabase

Auth → URL Configuration:
- Site URL: `https://rulgpt.com`
- Redirect URLs: add `https://rulgpt.com/**`. Keep the existing `https://tfrules.com/**` entry during the transition (don't delete it yet — anyone with a cached tfrules.com session should still complete OAuth).

## 4. OAuth apps (Google + LinkedIn)

- Google Cloud Console → OAuth consent screen / Credentials: update the authorized JavaScript origins and app branding (name, logo, support email) to reflect `rulgpt.com`. The OAuth **callback URL stays unchanged** — it points at `https://<supabase-project>.supabase.co/auth/v1/callback`, not at the frontend domain, so it does not need editing.
- LinkedIn Developer Console: same — update authorized redirect origins/branding to `rulgpt.com`. Callback URL unchanged for the same reason.
- Note: `VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED` currently defaults to `false` in `rulegpt-ui/.env.example` — flip it to `true` in Vercel once the LinkedIn app is confirmed working, or leave it off if LinkedIn login isn't ready.

## 5. Render environment

**Deploy sequencing:** the backend (Render) must finish deploying before the frontend's chat-first UI goes live — the UI calls `/api/interpret` (MT700) and `/api/artifacts` (case notes/drafts), and those routes 404 against an older backend that predates them. On a normal push to `main`, both Render and Vercel deploy off the same commit and this isn't a concern. It only matters if you deploy backend and frontend selectively (e.g. re-running just the Vercel build, or rolling back one side independently) — in that case, deploy Render first and confirm it's live before deploying/promoting the frontend.

Render service `rulegpt-api` already has most Phase 1-4 keys wired in `render.yaml` (either as literal values or `sync: false` placeholders you must fill in via the dashboard). Checklist:

**Must set now (site is broken without these):**
- `DATABASE_URL` — Supabase Postgres connection string
- `OPENROUTER_API_KEY` — every LLM call (classification, generation, MT700, case notes, drafts) goes through OpenRouter now; nothing works without this key
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ISSUER`, `SUPABASE_JWKS_URL`, `SUPABASE_JWT_AUDIENCE`
- `ADMIN_SECRET` — required in production or admin endpoints hard-reject everything

**Set once RulHub resumes (2026-07-05) — see section 6:**
- `RULHUB_API_KEY` — create an **Internal-tier key** (unlimited, $0 Enso-ecosystem plan) in the RulHub admin dashboard. Do not use a metered/external-tier key.
- Flip `RETRIEVAL_BACKEND` from `local` to `rulhub` (currently pinned to `local` in `render.yaml` — see the comment there — because RulHub is suspended until 2026-07-05 morning)

**Remove:**
- `ANTHROPIC_API_KEY` — no longer used anywhere in the runtime. The Anthropic SDK was dropped from the codebase in the 2026-07 OpenRouter swap. `render.yaml` still lists it as a `sync: false` placeholder for now; delete the value from the Render dashboard (or leave it unset — the app ignores unknown env keys either way, it just costs you nothing to remove it).

**Already correct, no action needed:**
- `RULGPT_LLM_MODEL=z-ai/glm-5.2`, `RULGPT_LLM_FALLBACKS=deepseek/deepseek-v4-pro,qwen/qwen3.7-plus`, `RULGPT_CLASSIFIER_LLM_MODEL=z-ai/glm-4.7-flash` — verified live against the OpenRouter catalog on 2026-07-03
- `ANONYMOUS_DAILY_LIMIT=2`, `FREE_TIER_DAILY_LIMIT=5`, `MT700_DAILY_LIMIT_ANON=3`, `MT700_DAILY_LIMIT_AUTH=10`
- `RULGPT_RETRIEVAL_CACHE_TTL=1800`, `RULGPT_RERANK_EMBEDDINGS=true`
- `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` already include both `rulgpt.com` and `tfrules.com`

**Optional (embed re-rank only, not required for launch):**
- `OPENAI_API_KEY` — only used to re-rank RulHub search results by embedding similarity (`RULGPT_RERANK_EMBEDDINGS`). Retrieval works without it; re-rank silently degrades to lexical-only scoring if the key is absent.

## 6. Stripe (account: Enso Intelligence Labs, `acct_1T4IAtBG8gnvAJXa`)

**STATUS 2026-07-07: the three live-mode prices and the live webhook endpoint exist** (created via API 2026-07-06 ~10:16 PM). What remains is verifying the IDs below are set in Render, and clearing the "Payouts paused — required task past due" banner on the Stripe account.

| Price | Live price ID | Product |
|---|---|---|
| Pro $29/mo | `price_1TqFBaBG8gnvAJXa3I6t8gkI` | `prod_Upv1dSBzNka8Pl` RulGPT Pro |
| Case Note $9 | `price_1TqFBcBG8gnvAJXaEpYo8dBc` | `prod_Upv1cfhTCo9urC` RulGPT Case Note |
| Draft $19 | `price_1TqFBdBG8gnvAJXaSU2YYGfi` | `prod_Upv1dAtTrt0GHh` RulGPT Draft Response |

Live webhook: `we_1TJQW6BG8gnvAJXa6WDURVlT` ("inspiring-victory") → `https://rulegpt-api.onrender.com/api/billing/webhook`, listening to `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.

**Original checklist (kept for reference):**
1. **Pro** — $29/month recurring price → set `STRIPE_PRO_MONTHLY_PRICE_ID` in Render
2. **Case Note** — $9 one-off price → set `STRIPE_CASE_NOTE_PRICE_ID` in Render
3. **Draft** — $19 one-off price → set `STRIPE_DRAFT_PRICE_ID` in Render

**⚠️ Do not reuse an old price ID.** A stale local `.env` used during Phase 4 development had `STRIPE_PRO_MONTHLY_PRICE_ID` pointing at the *old Enterprise* price by copy-paste error. That was caught and fixed locally, but it means: when you create the real Pro price in the Stripe dashboard, copy its ID carefully and double check it against the Products page — don't reuse anything already in `render.yaml`'s `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` / `STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID` values.

**⚠️ `billing_status` does not gate on the Pro price specifically.** `GET /api/billing/status` computes `checkout_ready` from the four legacy Professional/Enterprise price IDs only — it does **not** check whether `STRIPE_PRO_MONTHLY_PRICE_ID` is set. This means the frontend's Pro upgrade button can render as "ready" even when `STRIPE_PRO_MONTHLY_PRICE_ID` is still empty, and the checkout call will 503 when clicked. Set the Pro price ID before testing the upgrade flow, don't rely on `/api/billing/status` to tell you it's missing.

**⚠️ The four legacy Professional/Enterprise price IDs are hardcoded test-mode defaults, not empty placeholders.** `config.py:101-104` (`STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID`, `STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID`, `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`, `STRIPE_ENTERPRISE_ANNUAL_PRICE_ID`) ship with real-looking `price_...` string defaults baked into the code, unlike `STRIPE_PRO_MONTHLY_PRICE_ID`/`STRIPE_CASE_NOTE_PRICE_ID`/`STRIPE_DRAFT_PRICE_ID` which default to `None` and fail loudly if unset. Because they have non-empty defaults, the app won't error or warn if Render's env doesn't override them — on the live-key flip (step 6 below), if these four aren't explicitly set to the live-mode price IDs in Render, checkout silently keeps referencing the old test-mode prices against your live Stripe key, which will fail at checkout (test-mode prices don't exist under a live key) instead of failing at boot where you'd notice it immediately.

4. Webhook endpoint: `https://<render-api-url>/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Render
5. Test mode first: run through the full checkout for Pro, Case Note, and Draft with a [Stripe test card](https://stripe.com/docs/testing) and confirm:
   - Pro checkout sets the user's tier to `professional` (the internal tier name — "Pro" is a marketing label only, this is intentional, see CLAUDE.md's 2026-05-02 lesson about half-done tier renames)
   - Case Note / Draft checkout writes a `rulegpt_entitlements` row with 1 credit, consumable from the workbench
6. Only after test-mode checkout works end-to-end: flip `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to live keys, recreate the three prices live (test-mode and live-mode prices have different IDs), and update the live price IDs in Render.

## 7. Post-resume acceptance (2026-07-05, after RulHub comes back online)

Do this in order — each step depends on the last:

1. **RulHub key + smoke test.** Create the Internal-tier `RULHUB_API_KEY` (section 5), set it in Render, then smoke-test directly against the API before touching the app:
   ```bash
   curl -H "X-API-Key: $RULHUB_API_KEY" -H "RulHub-Version: 2026-04-28" \
     "https://api.rulhub.com/v1/stats"
   curl -X POST -H "X-API-Key: $RULHUB_API_KEY" -H "RulHub-Version: 2026-04-28" \
     -H "Content-Type: application/json" -d '{"query":"UCP600 discrepancy notice","per_page":5}' \
     "https://api.rulhub.com/v1/rules/search"
   curl -H "X-API-Key: $RULHUB_API_KEY" -H "RulHub-Version: 2026-04-28" \
     "https://api.rulhub.com/v1/rules/lookup?source=ucp600&per_page=5"
   ```
   All three should return 200 with real data, not an `API_KEY_REQUIRED` or schema-violation error envelope.
2. **Flip retrieval backend.** Only after the smoke test passes: change `RETRIEVAL_BACKEND` from `local` to `rulhub` in Render and redeploy.
3. **Golden queries.** Run all 20:
   ```bash
   python rulegpt-api/scripts/run_golden_queries.py --base-url https://<render-api-url>
   ```
   Expect zero `Fail` on GQ-01 through GQ-10 (the pass bar), citations present and non-hallucinated, and check the printed `cost_usd` per query — average should be under $0.002 (cross-check against `llm_cost` log lines if you have log access).
4. **MT700 paste demo.** Paste a sample MT700 message into the workbench MT700 interpreter and confirm field-by-field explanation + soft-clause flags + LCopilot CTA render correctly.
5. **Full funnel walkthrough (Stripe test mode):** anonymous user asks 2 questions (hits the 2/day wall) → signs up → gets 5/day as free tier → upgrades to Pro ($29/mo test-mode checkout) → confirms fair-use Q&A and case-note/draft generation work post-upgrade.
6. **Cost check.** Confirm the `llm_cost` log line average (`cost_usd` field) across the acceptance run stays under $0.002/answer. If it's meaningfully higher, check whether template-tier routing (`RULGPT_TEMPLATE_ENGINE_ENABLED`) or the OpenRouter fallback chain is behaving as expected before going wider.

## 8. Content follow-ups

- **ISBP 821 paragraph numbers**: blog posts were relabeled from ISBP 745 → ISBP 821 (2023 revision) during the rebrand. The relabeling was a straight find-and-replace of the publication name — the specific paragraph numbers cited in each post have **not** been individually re-verified against the 2023 revision's actual paragraph numbering (ISBP 821 renumbered some sections relative to ISBP 745). Spot-check the highest-traffic posts before or shortly after launch.
- **Mailboxes**: `hello@rulgpt.com`, `support@rulgpt.com`, `billing@rulgpt.com`, `privacy@rulgpt.com` — these are referenced in UI copy (footer, pricing "Contact us" mailto link, privacy policy) but need to actually exist and route somewhere you check.
- **GTM playbook pointer**: the launch prompt that kicked off this plan references `ICC Rule Engine/docs/gtm/GTM-PLAYBOOK-2026-07.md` (i.e. `J:\Enso Intelligence\ICC Rule Engine\docs\gtm\GTM-PLAYBOOK-2026-07.md`). That file does not exist on disk. Either write it, or fix whatever downstream process/prompt points at it so it doesn't silently 404.

---

## Quick reference: what's already done vs. what's on you

**Already shipped in code, nothing to do:**
- Rebrand, redirects (except the host-level 301, see §2), CORS for both domains
- RulHub-native retrieval code (fail-closed, caching, anchors, re-rank) — just needs the key + flag flip in §7
- OpenRouter LLM swap — zero Anthropic runtime dependency, cost logging, template tier, citation retry/degrade
- Daily quota windows, MT700 interpreter, entitlements table, Pro/one-off checkout code, print-to-PDF, advisory disclaimers

**On you, in order:** Verify rules corpus is populated → DNS → Vercel domains/env → Supabase URLs → OAuth app branding → Render env (keys + RulHub flip after 07-05) → Stripe prices + webhook → acceptance run → mailboxes/content spot-checks.
