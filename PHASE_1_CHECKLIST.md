# Phase 1 Checklist

Last updated: 2026-03-27
Owner: Ripon
Domain: `tfrules.com`
Goal: turn the current prototype into a credible public product shell fast.

## Success Definition

Phase 1 is done when:
- `/` is a credible public landing page
- `/chat` feels like a real product, not a demo
- history and saved-answer flows feel stable
- auth works live
- billing works live
- legal and support surfaces exist and are linked
- analytics and error reporting are receiving events
- the golden query set is mostly green

## Rules

Always:
- ship only what improves trust, clarity, retention, or conversion
- keep chat standalone and product-neutral
- keep answers short by default
- surface blockers honestly

Never:
- bury live blockers behind optimistic copy
- ship billing/auth in "probably works" mode
- let chat turn into a promo surface

## Workstreams

### 1. Public Front Door

- [x] Lock launch domain to `tfrules.com`
- [x] Make `/` the landing page
- [x] Move product experience to `/chat`
- [x] Keep public navigation coherent
- [x] Rewrite launch copy so it reads like a product
- [ ] Lock final tagline
- [ ] Lock final pricing summary copy
- [ ] Lock final FAQ copy

Acceptance:
- user understands the product in under 10 seconds
- CTA is obvious
- landing does not sound like a prototype

### 2. Chat Product Shell

- [x] Centered first-prompt experience
- [x] GPT-style left history rail
- [x] New chat action
- [x] Saved answers surface
- [x] Mobile drawer flow
- [x] Cleaner chat header
- [ ] Final citation drawer polish
- [ ] Final empty-state polish
- [ ] Final answer rendering polish

Acceptance:
- first screen is calm
- prior chats can be reopened reliably
- answer area feels product-grade

### 3. Auth

- [x] Auth UI wired from landing and chat
- [x] Auth status endpoint exists
- [ ] Live email signup verified
- [ ] Live email login verified
- [ ] Live Google login verified if enabled
- [ ] Live LinkedIn login verified if enabled
- [ ] Protected routes verified with real JWT

Acceptance:
- user can move from anonymous to signed-in without confusion
- protected actions fail clearly when auth is missing

### 4. Billing

- [x] Upgrade surface exists
- [x] Billing status endpoint exists
- [x] Stripe checkout wiring exists
- [ ] Live monthly checkout verified
- [ ] Live annual checkout verified
- [ ] Success return verified
- [ ] Cancel return verified
- [ ] Webhook event handling verified
- [ ] Subscription state refresh verified

Acceptance:
- user can see whether billing is ready
- upgrade path reaches a valid checkout session
- subscription state is not fake or stale

### 5. Trust And Support

- [x] Privacy page
- [x] Terms page
- [x] Contact page
- [ ] Support inboxes created:
  - `hello@tfrules.com`
  - `support@tfrules.com`
  - `billing@tfrules.com`
- [ ] Footer and nav links verified

Acceptance:
- a cautious buyer can find legal/support surfaces immediately

### 6. Analytics And Monitoring

- [x] Frontend telemetry hooks added
- [x] Frontend error reporting hooks added
- [x] Backend telemetry intake routes added
- [ ] Telemetry arriving in live environment
- [ ] Error intake arriving in live environment
- [ ] Health monitoring configured
- [ ] Basic alert path configured

Acceptance:
- page views, chat starts, upgrade clicks, and frontend errors are visible somewhere real

### 7. Quality Gate

- [x] Short-answer contract tightened
- [x] CTA removed from chat answers
- [x] FTA threshold handling improved
- [ ] Golden query pass completed
- [ ] Low-confidence review queue defined
- [ ] First post-launch answer audit completed

Acceptance:
- core goldens do not fail embarrassingly
- low-confidence answers are reviewable

## Live Verification Board

Run these in order:

1. Landing
- [ ] Home page renders on `tfrules.com`
- [ ] `/chat` renders
- [ ] `/pricing` renders
- [ ] `/faq` renders
- [ ] `/contact` renders

2. Chat
- [ ] Anonymous query works
- [ ] Suggestions load
- [ ] History rail opens prior chat
- [ ] Saved answer flow works

3. Auth
- [ ] Sign up
- [ ] Sign in
- [ ] Session restored on refresh
- [ ] Protected save/history route works

4. Billing
- [ ] Upgrade click opens Stripe checkout
- [ ] Success return behaves correctly
- [ ] Cancel return behaves correctly

5. Monitoring
- [ ] Page view event received
- [ ] Query event received
- [ ] Forced frontend error received

## Blockers

These block a true Phase 1 close:
- live auth not verified
- live Stripe not verified
- telemetry not verified live
- golden query pass not completed

## Done / Next

Done:
- landing and chat are split
- history rail exists
- legal/support pages exist
- billing and auth surfaces exist
- telemetry plumbing exists

Next:
1. live Supabase auth verification
2. live Stripe checkout verification
3. golden query pass
4. blog scaffold
