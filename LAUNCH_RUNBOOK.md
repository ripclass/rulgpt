# Launch Runbook

Last updated: 2026-03-27
Domain: `tfrules.com`
Goal: give RuleGPT a clean, low-chaos public launch.

## Launch Objective

At launch, a stranger should be able to:
- land on `tfrules.com`
- understand the product quickly
- ask a real trade finance question
- get a short, source-backed answer
- trust the product boundary

## Environments

- Frontend: Vercel
- Backend: Render
- Database: Supabase
- Payments: Stripe
- Auth: Supabase Auth
- Mail: provider TBD, but `hello@`, `support@`, `billing@` must exist

## Preflight

### 1. Domain

- [ ] `tfrules.com` connected to Vercel
- [ ] `www.tfrules.com` redirects correctly
- [ ] TLS active
- [ ] canonical host chosen

### 2. Frontend

- [ ] `VITE_API_BASE_URL` points to live Render backend
- [ ] `VITE_PREVIEW_MODE=false`
- [ ] `VITE_SUPABASE_URL` set
- [ ] `VITE_SUPABASE_ANON_KEY` set
- [ ] optional telemetry envs set if used
- [ ] production build deployed without cache

### 3. Backend

- [ ] Render deploy healthy
- [ ] `/health` returns OK
- [ ] `DATABASE_URL` valid
- [ ] `CORS_ORIGINS` correct
- [ ] `CORS_ORIGIN_REGEX` correct for Vercel
- [ ] OpenRouter envs set
- [ ] Stripe envs set
- [ ] Supabase envs set

### 4. Database / Retrieval

- [ ] `pgvector` enabled
- [ ] migrations applied
- [ ] rules imported
- [ ] embeddings synced
- [ ] sample query returns grounded answer

## Launch-Day Smoke Tests

Run these in order.

### Product

1. Open `/`
- [ ] hero loads
- [ ] CTA works

2. Open `/chat`
- [ ] composer loads
- [ ] suggestions load

3. Anonymous query
- [ ] query succeeds
- [ ] answer is short and grounded
- [ ] citations visible

### Auth

4. Sign up
- [ ] account created
- [ ] user returns to chat correctly

5. Sign in
- [ ] session persists on refresh

6. Protected actions
- [ ] history loads
- [ ] save answer works

### Billing

7. Upgrade flow
- [ ] upgrade page loads
- [ ] checkout session starts
- [ ] cancel path returns cleanly

8. Webhooks
- [ ] subscription event processed
- [ ] subscription state visible

### Monitoring

9. Telemetry
- [ ] page view received
- [ ] chat event received

10. Error reporting
- [ ] test error reaches intake

## Launch Metrics To Watch

First 72 hours:
- landing-to-chat clickthrough
- first-query completion rate
- query success rate
- low-confidence answer rate
- auth conversion rate
- upgrade click rate
- checkout start rate
- checkout completion rate
- top failed queries

## Support Playbook

If users report:

### Wrong answer

Do:
- capture the exact query
- capture the answer
- capture citations returned
- add it to `GOLDEN_QUERIES.md`
- classify failure as:
  - retrieval
  - prompt/generation
  - missing rules
  - UI presentation

### Login issue

Do:
- verify Supabase auth settings
- verify frontend envs
- verify JWT-protected route behavior

### Billing issue

Do:
- verify Stripe checkout session creation
- verify webhook delivery
- verify stored subscription state

## Rollback Rules

Rollback if any of these happen:
- query route is broadly failing
- auth is broken for most users
- billing is initiating broken checkout sessions
- answers are clearly hallucinating or citing wrong rules

Rollback options:
1. revert latest frontend deploy
2. revert latest backend deploy
3. temporarily force preview/public-info-only mode if trust is at risk

## First Week Priorities After Launch

1. Audit top 25 real queries
2. Fix the 5 worst answer failures
3. Add those failures to `GOLDEN_QUERIES.md`
4. Review landing drop-off points
5. Review auth and upgrade friction
6. Publish first 3 blog posts

## Doc Links

Use these together:
- `PRODUCT_ANCHORPOINT.md`
- `RULEGPT_WORKFLOW.md`
- `PHASE_1_CHECKLIST.md`
- `GOLDEN_QUERIES.md`
- `deploy/launch_checklist.md`
