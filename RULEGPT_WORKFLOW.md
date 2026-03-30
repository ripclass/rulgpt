# RuleGPT Workflow

Last updated: 2026-03-27
Domain: `tfrules.com`
Product: `RuleGPT`

## Purpose

This document is the operating workflow for building and shipping RuleGPT.

It is inspired by the useful parts of `gstack`, but adapted for a very specific product:
- citation-first trade finance answers
- fast product iteration
- strict trust and quality gates
- one founder, limited time, limited budget

This is not a generic AI workflow. It is a `RuleGPT` workflow.

## Product Reality

RuleGPT is not:
- a general chatbot
- a legal advice engine
- a document approval tool
- a billboard for other Enso products inside chat

RuleGPT is:
- a trade finance rules answer product
- a trust product
- a citation product
- a conversion surface for future deeper workflows, but not through aggressive chat-side promotion

## Operating Principles

Always:
- answer short first
- show the rule behind the answer
- make uncertainty explicit
- prefer trust over cleverness
- prefer operator usefulness over "AI magic"
- treat landing, chat, auth, billing, and support as one product

Never:
- ship a feature without checking how it changes trust
- let answer quality regress silently
- let landing copy drift from product reality
- let billing/auth/product state become ambiguous

## Build Loop

Every meaningful feature should move through this sequence:

1. Think
2. Plan
3. Build
4. Review
5. QA
6. Ship
7. Retro

If a step is skipped, call it out explicitly.

## Step 1: Think

Before building, answer:
- what user problem is this solving?
- does it improve trust, usability, retention, or conversion?
- is it needed for V1?
- what should the user see change?
- what can go wrong?

If the change does not improve one of:
- trust
- speed
- clarity
- retention
- conversion

it probably waits.

## Step 2: Plan

Before implementation, write a short plan with:
- product goal
- exact routes/pages/components touched
- backend contracts affected
- environment/config dependencies
- acceptance criteria
- explicit non-goals

For answer-quality work, also include:
- example query
- expected answer shape
- expected citations
- confidence expectation

## Step 3: Build

When building:
- make the smallest change that achieves the product goal
- preserve the established design language
- do not add product copy that sounds like a prototype
- do not add marketing noise to chat
- keep logic and UI decoupled where possible

Use these working categories:
- `landing`
- `chat`
- `auth`
- `billing`
- `rag`
- `support`
- `analytics`
- `ops`

## Step 4: Review

Every change gets reviewed against the right lens.

### Product Review

Ask:
- is the value clear in under 10 seconds?
- does the user know what to do next?
- does the copy sound confident, clear, and human?

### Engineering Review

Ask:
- are the interfaces clean?
- are failure states explicit?
- are provider/env dependencies surfaced, not hidden?
- are tests covering the actual regression risk?

### Answer-Quality Review

Ask:
- is the first sentence decisive?
- is every important claim grounded?
- is any uncited inference clearly framed?
- is confidence too high for the actual coverage?
- is the answer too long, vague, or memo-like?

### Security/Billing Review

Ask:
- are auth assumptions explicit?
- are Stripe blockers surfaced clearly?
- are there any silent fallbacks that would be dangerous in production?

## Step 5: QA

There are three QA lanes.

### A. Product QA

Check:
- landing page
- route split
- empty chat state
- first query flow
- history rail
- saved answers
- upgrade page
- support/legal pages

### B. Browser QA

Use real browser checks for:
- signup
- login
- checkout start
- mobile nav
- citation drawer
- history open/restore

### C. Answer QA

Run a small golden set regularly.

Minimum goldens:
- UCP600 transport documents
- ISBP745 invoice compliance
- OFAC with UAE counterparties
- RCEP / non-member threshold issue
- UCP600 discrepancies

For each, verify:
- short answer first
- correct rule family
- no hallucinated certainty
- useful follow-up
- appropriate confidence

## Step 6: Ship

A change is ready to ship only when:
- routes work
- env dependencies are known
- tests pass
- the product state is understandable
- docs reflect the new reality

Minimum ship checklist:
- frontend checks pass
- backend checks pass
- route changes verified
- new env vars documented
- new blockers documented
- anchor docs updated

## Step 7: Retro

At the end of a block, write:
- what shipped
- what still feels weak
- which answer failures remain
- which UX friction points remain
- what to do next

This should be short and honest.

## RuleGPT-Specific Workstreams

### 1. Landing Workflow

Goal:
- make the product understandable fast

Success criteria:
- hero is clear
- trust surfaces exist
- pricing is coherent
- FAQ handles obvious objections
- contact/legal are visible

### 2. Chat Workflow

Goal:
- daily operator can ask a question immediately

Success criteria:
- centered first prompt
- history rail works
- query restore works
- mobile drawer works
- answer area feels calm and product-grade

### 3. Auth Workflow

Goal:
- user can move from anonymous to signed-in without friction

Success criteria:
- login/signup routes from landing and chat work
- auth blockers are visible
- protected actions fail clearly, not silently

### 4. Billing Workflow

Goal:
- upgrade path is understandable and trustworthy

Success criteria:
- pricing page is coherent
- upgrade page shows blockers cleanly
- checkout starts only when actually ready
- no fake billing state

### 5. RAG Workflow

Goal:
- answers are grounded and useful

Success criteria:
- decisive answer first
- correct retrieval
- no made-up rule references
- clear "what still depends on your transaction" line when needed
- confidence tracks actual coverage

## Answer-Quality Escalation Rules

Escalate and fix immediately if any of these happen:
- wrong rule cited
- answer claims certainty without coverage
- threshold issue missed
- out-of-scope follow-up classified incorrectly
- answer becomes long and generic
- conversion copy leaks into chat answer body

## Weekly RuleGPT Retro

Every week, review:
- top user questions
- low-confidence answers
- failed queries
- missing rules
- weak follow-ups
- auth/billing support issues
- top landing drop-off points

Then classify work into:
- product copy
- retrieval/data
- model/prompt
- UI/UX
- auth/billing
- support/ops

## Live-Env Checklist

These are not code-complete until verified live:
- Supabase sign-up
- Supabase login
- JWT-protected route access
- Stripe checkout start
- Stripe success/cancel return
- telemetry event intake
- frontend error intake
- saved answers
- history fetch

## Current Next Priorities

1. Live Supabase auth verification
2. Live Stripe checkout verification
3. Blog scaffold and SEO pages
4. Golden-query answer QA pass
5. Support inbox and mail setup
