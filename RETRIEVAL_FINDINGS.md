# Retrieval Grounding — Findings & Work Brief

**Date:** 2026-07-08 · **Source:** live-prod eval of 88 real practitioner queries
(42 English verticals GQ-21→62 + 46 native-language, run against rulgpt.com with an
enterprise account). Raw results: `scratchpad/eval_results.json`,
`scratchpad/eval_ml_results.json`.

---

## 0. North Star (read this first — every task below serves it)

> **When a user asks something, RulGPT must _retrieve the actual ruling from RulHub_ and
> generate the answer FROM that ruling. The LLM's job is to apply and explain the
> retrieved rule — NOT to answer from its own training data.**

The LLM should shine at *reasoning over retrieved rules* and writing them in plain,
in-language prose. It must NOT be the source of the rule. Any answer where the citation
does not back the claim, or where retrieval returned nothing and the model answered
anyway from general knowledge, is a **failure of the core promise** ("cited, not
opinion") — even if the answer happens to be correct.

The whole moat is: *the licensed, versioned, structured ICC/trade corpus that isn't on
the open web.* That moat only exists if retrieval actually reaches it. Right now, often
it doesn't.

---

## 1. TL;DR verdict

- **Model + guardrails: launch-strong.** Across 42 adversarial English queries (15
  fail-closed traps): **zero fabrications, zero fail-closed violations.** It declined
  every "certify this HS code / confirm this live sanction / invent this CBAM value"
  trap. Answer *reasoning* is correct on the large majority.
- **Retrieval: the weak link, and it's the whole ballgame.** In ~10/42 English queries
  the citations did **not** back the answer — the model carried it from training data
  while RulHub returned off-topic noise. This is exactly what the North Star forbids.
- **Non-English: effectively broken as a cited tool.** 44/46 native-language queries came
  back LOW confidence; **Turkish 0/10 and Chinese 0/5 retrieved ZERO rules** and fell to
  the English "no rule covering that" refusal — even for questions that pass cleanly in
  English. The corpus has the rules; retrieval can't reach them across languages.

**One line:** *corpus coverage is strong; retrieval precision and cross-language reach
are the work — and they are what turn "a well-guardrailed LLM" into "the grounded,
cited trade-rules engine nothing else can replicate."*

---

## 2. Evidence (the numbers)

**English (42):** ~28 Pass / ~11 Watch / ~2 content-nits / 0 hard fails. Confidence
4 high / 17 med / 21 low (lows correctly cluster on fail-closed declines). Routing
correct — only the 6 sanctions/TBML queries escalated to Opus. Latency (non-streaming)
median 22s, **p90 62s, max 169s**.

**Multilingual (46, 7 languages):** 44 LOW / 2 medium / 0 high.
| Language | Retrieved rules? | Answer language | Verdict |
|---|---|---|---|
| Turkish (10) | **0/10 cited** | English refusal | broken |
| Chinese (5) | **0/5 cited** | English refusal | broken |
| Spanish (8) | 4/8 cited | mixed | coin-flip |
| Russian (5) | 2/5 cited | Russian when it works | coin-flip |
| Vietnamese (9) | mostly cited | Vietnamese | grounded but all LOW, latency to 148s |
| Indonesian (5) | mixed (SKBDN failed) | Indonesian | partial |
| French (4) | mixed, off-topic hits | French | partial |

Proof it's retrieval, not corpus: **the same question passes in English, fails
in-language** — e.g. telex-release risk (English GQ-32 = solid cited answer; Chinese
CN-1 = 0 rules, refusal); tolerance base (English GQ-22 = cited; Spanish ES-1 = refusal).

---

## 3. Root-cause findings (ranked, each with owner)

### F0 — Retrieval is English-only in practice; it disables the non-English moat markets. **[RulGPT fix now → RulHub durable]**
- **Symptom:** non-English (esp. non-Latin) queries match ~nothing in RulHub search →
  pipeline fails closed to the English refusal, OR the model answers ungrounded.
- **Repro:** TR-1 (UCP 600 Art. 10, definitely in corpus) → 0 rules. CN-1 telex release →
  0 rules. ID-4 "pay a project using **SKBDN**" (the emerging-market moat term) → 0 rules.
- **Why:** `RulHubClient.search_rules` is PostgreSQL full-text search that ANDs English
  tokens (see `rulhub_retriever.py` header comment). A Turkish/Chinese/Cyrillic query
  produces no matching English tokens. `derive_search_queries` has no language step. The
  `language` param (`en|bn|hi`) is threaded through the pipeline but **unused** for
  retrieval; generation-side already respects language (system prompt line ~205).
- **Fix (RulGPT, cheap, highest leverage):** detect non-English query → translate /
  extract English trade-finance keywords with the classifier-tier model
  (`z-ai/glm-4.7-flash`) → run RulHub search on the English variant. Keep the ORIGINAL
  query for generation so the answer stays in the user's language. Also localize the
  refusal + disclaimer strings.
- **Fix (RulHub, durable):** re-embed the corpus with a multilingual embedding model so
  semantic match works without translation.

### F1 — Relevance ranking: the right rule is often not in the top-5. **[RulHub]**
- **Symptom:** search returns rules from the wrong domain; the on-point rule that exists
  in the corpus isn't surfaced.
- **Repro:** GQ-25 (UCP 600 **Art. 16** refusal timeline) → bank-KYC/Wolfsberg/BRPD rows,
  zero Art. 16 (Art. 16 exists — it surfaced elsewhere). GQ-37 (HS vs HTS) → Kazakhstan/
  Jordan tariff + ISBP paragraphs. GQ-46 (CBAM steel value) → WTO-CVA (CBAM retrieved
  fine for GQ-48 — **same area, inconsistent**).
- **Why:** ranking/embedding+keyword match quality, not coverage.
- **Fix (RulHub):** improve ranking; ensure domain/publication signal weights the score;
  investigate why identical corpus areas retrieve inconsistently across phrasings.

### F2 — No relevance floor: noise pads every result to top-k. **[RulHub exposes score → RulGPT enforces floor]**
- **Symptom:** a 1-relevant-rule query still returns 5 hits; 4 are noise but get cited.
- **Fix:** RulHub returns a per-hit relevance score; RulGPT drops citations below a
  threshold instead of always showing 5. This is what makes "cited, not opinion" honest —
  better to show 1 real citation (or fail closed) than 5 where 4 are noise.

### F3 — Internal-machinery rows rank as citations and leak into prose. **[RulHub]**
- **Symptom:** `events.*`/`EVAPI-*` (API contracts), `data_quality.*`/`DQ-*`,
  `exceptions.*`/`EXC-*`, bank-behavior `BBEH-*`/`CB-*`/`brpd-*` appear as top hits and
  even inside generated text (`EVAPI-EC-002` in GQ-42, `EVAPI-SC-013` in GQ-54).
- **Mitigation shipped (RulGPT):** `citations.py` now drops `events.*`/`data_quality.*`
  from *display* — but they still occupy retrieval slots, displacing real rules.
- **Fix (RulHub):** exclude or tag these families in `/v1/rules/search` for
  citation-first consumers so they never take a slot.

### F4 — Citation labels: clean field missing for long slugs. **[RulGPT done for ICC pubs; RulHub for the rest]**
- **Shipped (RulGPT):** `format_citation_display` maps UCP/ISBP/URDG/RCEP/EUDR/etc slugs
  to clean labels. **Remaining:** long country/commodity/post-2025-tariff slugs with no
  extractable article still render raw (GQ-35/44/56).
- **Fix (RulHub):** provide a clean `citation_label`/`article` field per rule.

### F5 — Latency tail. **[RulGPT profile]**
- Non-streaming p90 62s, max 169s (GQ-22); VN-7 148s. Streaming masks first-token but
  total generation is slow — likely fallback-chain retries and/or RulHub search latency
  variance. Profile RulHub search time vs generation time per query.

### F6 — Two content nits for domain-expert (Ripon) verify. **[content]**
- GQ-61: packing-exclusion answered "applies regardless of who packed" — ICC(A) cl. 4.3
  generally limits it to the assured/employees; independent-contractor packing can change
  it. Led imprecise, hedged in body.
- GQ-62: FOB "buyer is responsible for insurance" — FOB imposes **no insurance duty** on
  either party; buyer bears *risk* ≠ must insure. Led imprecise, corrected in body.

---

## 4. Prioritized work plan

| # | Task | Owner | Size | Why |
|---|---|---|---|---|
| 1 | **Query-translation before retrieval** (F0) | RulGPT | S | unlocks the entire non-English moat; cheapest high-impact fix |
| 2 | **Relevance floor on citations** (F2) | RulGPT (needs F-score from RulHub) | S | makes "cited, not opinion" honest; kills noise citations |
| 3 | **Ranking precision + inconsistency** (F1) | RulHub | M | the on-point rule must land in top-5 |
| 4 | **Demote/tag internal-machinery rows** (F3) | RulHub | S | stop noise taking retrieval slots |
| 5 | **Localize refusal + disclaimer strings** (F0) | RulGPT | S | a Turkish user shouldn't get an English "no rule" |
| 6 | **Multilingual corpus embeddings** (F0 durable) | RulHub | L | removes dependence on translation |
| 7 | **Clean `citation_label` field** (F4) | RulHub | S | authoritative labels for long slugs |
| 8 | **Profile latency** (F5) | RulGPT | S | p90 62s is a UX problem behind streaming |

---

## 5. Guardrails — what NOT to do

- **Do NOT let the LLM answer from training data when retrieval is empty or weak.** The
  current fail-closed behavior (refuse when 0 rules) is correct and must stay. The fix is
  to make retrieval *succeed*, not to loosen the guardrail. A confident ungrounded answer
  is worse than a refusal.
- **Do NOT spread RulHub thin across public-text domains at the expense of the ICC
  documentary-credit core.** The defensible moat is the paywalled/versioned/structured
  ICC corpus (UCP/ISBP/URDG/ISP98/URC/ISDGP/DOCDEX/Opinions/Model Forms) + the structure
  (severity/anchors/cross-refs). That is where precision matters most and where the open
  web cannot follow.
- **Do NOT touch the gated logic without Ripon's sign-off:** confidence bands
  (`_confidence_from_rules`), routing (`select_model`), the system prompt, the Stripe
  webhook, ICE eligibility.

---

## 6. Repro appendix (query IDs)

- **Ungrounded / noise citations (English):** GQ-24, GQ-25, GQ-37, GQ-46, GQ-57.
- **Zero-retrieval non-English:** TR-1..TR-10, CN-1..CN-5, ES-1..ES-4, RU-1/RU-4/RU-5,
  ID-4.
- **Worked non-English (grounded, in-language):** ID-1, VN-1, RU-2, RU-3, FR-4.
- **Latency outliers:** GQ-22 (169s), VN-7 (148s), VN-9 (118s), GQ-50 (62s).
- **Content nits:** GQ-61, GQ-62.
