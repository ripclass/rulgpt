# RuleGPT Product Anchorpoint

Last updated: 2026-03-26
Status: Prototype -> Product transition
Owner: Ripon
Working repo root: `J:\Enso Intelligence\rulgpt`
Launch domain: `tfrules.com`

## 1. What This Is

RuleGPT is a citation-first trade finance answer product for daily operators, not just subject-matter experts.

It should help users:
- ask trade finance questions in plain English
- get short, precise answers first
- see the exact rule behind the answer
- understand what still depends on transaction facts

It is not:
- a generic AI chat wrapper
- a document-validation tool
- a billboard for TRDR Hub or RulHub inside chat

## 2. Product Promise

Core promise:

`Ask trade rules in plain English. Get precise, source-backed answers in seconds.`

Non-negotiables:
- citation is the product
- short answer first
- no hallucinated certainty
- uncertainty must be explicit
- chat must feel human and useful, not like an AI memo
- landing can reference the Enso ecosystem subtly
- chat stays standalone

## 3. Naming And Domain Direction

Current product name:
- RuleGPT

Domain reality:
- `rulegpt.com`, `rulgpt.com`, and close `.ai` variants are likely not practical
- `tfrules.com` and `tradefinancepilot.com` are the current backup directions

Decision:
- Primary launch domain: `tfrules.com`
- Product name: `RuleGPT`

Why `tfrules.com`:
- shorter
- easier to type and remember
- closer to the core use case
- better for a focused, citation-first rules product

Why not `tradefinancepilot.com` as primary:
- too long
- weaker recall
- "pilot" overlaps mentally with LCopilot and creates product confusion

Best branding approach:
- public brand: `RuleGPT`
- domain: `tfrules.com`
- footer copy: `RuleGPT by Enso Intelligence`

## 4. What Exists Today

Working today:
- deployed backend
- deployed frontend
- DB-first retrieval path
- embeddings stored in Supabase/pgvector
- live `/api/query`
- shorter answer contract

Still prototype-level:
- FAQ depth and pricing detail
- polished chat UX
- live provider verification
- onboarding
- billing production validation
- analytics and ops hardening
- admin review loop

## 5. V1 Product Definition

V1 is launch-ready when:
- homepage clearly explains the product in under 10 seconds
- chat works with anonymous first use
- answers are short by default and longer only when needed
- citations are clickable and useful
- history works like a proper chat product
- signup, save, and billing flows work
- legal and support surfaces exist
- basic analytics and monitoring are live

## 6. Workstreams

### A. Positioning And Marketing

Must ship:
- homepage hero and value proposition
- problem / trust / use-case sections
- pricing page
- FAQ
- contact page
- legal pages

Nice later:
- case studies
- customer stories
- richer comparison pages

### B. Chat Product UX

Must ship:
- `/chat` as primary product surface
- centered first-prompt experience
- GPT-style left history rail
- new chat
- saved answers
- citation drawer
- mobile chat usability
- short answer presentation
- dynamic follow-ups

Must not ship:
- noisy sidebars
- ecosystem promotion inside answers
- too many prompts or buttons

### C. User System

Must ship:
- auth
- session continuity
- onboarding
- query history
- saved answers
- account settings

Suggested onboarding questions:
- your role
- your geography
- your main use case

### D. Revenue

Must ship:
- Stripe checkout
- billing page
- subscription state handling
- upgrade / downgrade flow
- receipt / confirmation email

Important pricing rule:
- do not bundle heavy API usage into low-cost chat plans

### E. Trust And Quality

Must ship:
- citation chips
- confidence badge
- "What still depends on your transaction"
- feedback on answers
- low-confidence review queue

### F. Content And SEO

Must ship:
- blog
- sitemap
- metadata
- OG images
- 5 to 10 high-intent trade finance articles

Initial article themes:
- UCP600 explained
- ISBP745 explained
- OFAC trade screening basics
- RCEP origin rules basics
- Incoterms vs LC obligations

### G. Ops

Must ship:
- domain setup
- email setup
- monitoring
- analytics
- error tracking
- backups / DB hygiene

Recommended stack:
- domain: primary custom domain + redirect aliases
- mail: `hello@`, `support@`, `billing@`
- analytics: PostHog
- errors: Sentry
- uptime: basic health monitor

## 7. Build Order

### Phase 1. Trustworthy Public Front Door

- landing page copy
- homepage design cleanup
- pricing page
- FAQ
- legal pages
- contact page

### Phase 2. Real Chat Product

- `/chat` route
- history rail
- better session UX
- saved answers
- citation drawer polish
- mobile polish

### Phase 3. User And Revenue

- auth
- onboarding
- Stripe
- billing page
- account settings

### Phase 4. Growth And Operations

- blog
- SEO
- analytics
- error tracking
- support email
- launch checklist

### Phase 5. Quality Loop

- answer feedback
- low-confidence review
- golden-question evaluation set
- regression suite for core trade queries

## 8. Immediate Sprint

Do these first:

- [x] finalize domain decision
- [x] write final homepage copy
- [x] split routes cleanly: landing vs chat
- [x] implement GPT-style history rail
- [x] wire auth
- [x] wire Stripe
- [x] add legal pages
- [x] add analytics + monitoring
- [x] add contact/support surfaces
- [ ] add blog scaffold

## 9. Product Rules

Always:
- optimize for trust over cleverness
- optimize for operator usefulness over technical showmanship
- keep answers short unless detail is required for correctness
- keep chat product-neutral
- make every feature serve either trust, retention, or conversion

Never:
- fake completeness
- over-push TRDR Hub in chat
- bloat the interface
- ship "AI magic" without grounded evidence

## 10. Domain Decision Note

Current decision:

1. Locked: `tfrules.com`
2. Backup: `tradefinancepilot.com`

If both are unavailable:
- keep the product name `RuleGPT`
- choose a short, exact, trade-rules-oriented domain
- avoid names that sound like a consultancy or document-review tool

## 11. Phase 1 Execution Checklist

Goal:
- turn the current prototype into a credible public-facing product shell fast
- get the public site, product entry, auth, and billing into a launchable shape

Definition of done for Phase 1:
- `tfrules.com` points to the correct public surface
- `/` is the marketing/landing experience
- `/chat` is the product experience
- landing copy is final enough to launch
- chat has a proper left history rail
- auth works end-to-end
- Stripe upgrade flow works end-to-end
- legal and support essentials exist

### 11.1 Locked Decisions

- [x] launch domain = `tfrules.com`
- [x] product name = `RuleGPT`
- [x] chat stays standalone and product-neutral
- [ ] final tagline locked
- [ ] final pricing page copy locked

### 11.2 Current Phase 1 Build Order

1. Public front door
- [x] make `/` the landing page
- [x] move chat to `/chat`
- [x] keep upgrade at `/upgrade`
- [x] keep API access at `/api-access`
- [x] ensure bad routes redirect sensibly

2. Landing copy and marketing surface
- [x] finalize hero
- [x] finalize trust / how-it-works sections
- [ ] finalize pricing summary
- [ ] finalize FAQ
- [x] remove placeholder / prototype language from public copy

3. Chat product shell
- [x] GPT-style left history rail
- [x] new chat action
- [x] saved answers area
- [x] cleaner chat header
- [x] anonymous-first product flow
- [x] mobile drawer still works cleanly

4. User and billing
- [x] auth modals wired cleanly from landing and chat
- [ ] signup/login flow verified
- [x] upgrade flow wired to Stripe checkout
- [x] billing state shown correctly
- [x] blocked provider/env gaps documented precisely

5. Trust and launch essentials
- [x] privacy page
- [x] terms page
- [x] support/contact page
- [x] basic analytics
- [x] basic error monitoring

### 11.3 Acceptance Criteria By Workstream

Landing:
- user understands product in under 10 seconds
- CTA is obvious
- copy does not read like a prototype

Chat:
- user can start immediately
- first screen is calm and minimal
- prior chats are visible and usable
- response area feels product-grade, not demo-grade

Auth:
- user can sign up, sign in, and return to the same product state

Billing:
- user can click upgrade and reach a valid checkout path

### 11.4 Immediate Active Sprint

In progress now:
- [x] route split: landing vs chat
- [x] final landing copy
- [x] GPT-style history rail
- [x] auth/billing cleanup

Queued next:
- [ ] blog scaffold
- [ ] live Supabase auth verification
- [ ] live Stripe checkout verification

### 11.5 Working Rule

Do not start new growth or content work until:
- landing is credible
- chat route is clean
- history rail is real
- auth and billing are not embarrassing

## 12. Next Review Questions

Before the next build block, decide:
- final product naming line
- final pricing structure
- whether `/` should be landing and `/chat` product, or vice versa
- whether blog lives inside the frontend app or on a separate CMS

## 13. Working Principle

This file is the anchor document.

Execution workflow lives in:
- `RULEGPT_WORKFLOW.md`

Execution docs:
- `PHASE_1_CHECKLIST.md`
- `GOLDEN_QUERIES.md`
- `LAUNCH_RUNBOOK.md`

Any new feature should answer:
- does it improve trust?
- does it improve usability?
- does it improve retention or conversion?
- is it necessary for V1?

If not, it waits.
