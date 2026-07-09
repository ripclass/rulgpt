# Hybrid (FTS+vector) search — RulGPT eval results (2026-07-09)

Wired RulGPT to RulHub's `search_mode=hybrid` (send the RAW question, trust the
fused rank). Ran F1 + controls. **Verdict: promising vector recall, but not
prod-ready — reverted to lexical.**

## What works
- **Hybrid is active** (key-tell confirmed: results differ completely from lexical).
- **GQ-25 → UCP600-16A (Art 16) at #1** — the semantic case NOTHING else reached
  (lexical, ranking, derive-terms all failed it). Vector recall is real.
- **GQ-24 → UCP600 Art 14/18/28** (relevant, was MT700/eUCP noise on lexical).
- Confidence bug fixed: `_hit_rank` now reads the score from `extra` (was 0.0 →
  all-LOW because normalize_rule buries it and the retriever read top-level).

## The three blockers (why prod stays lexical)
1. **Inconsistency.** GQ-25 returned Art 16 #1 in one hybrid run and fell back to
   lexical (`DOCDEX-020`) in the next — same query. Is hybrid deterministic? Are
   there intermittent empty responses that trigger our lexical fallback?
2. **Over-matching on generic semantics.** GQ-47 "operator or trader under the
   **EUDR**" → `EU-MOLDOVA-DESTAB, EU-RU-PKG4/6, EU-IR-BLOCKING-STATUTE` (EU
   *sanctions*, not EUDR deforestation). Lexical nails `EUDR-OPERATOR-VS-TRADER`.
   With the confidence fix this is now **HIGH confidence on the wrong rules** —
   confidently wrong, the worst outcome. Likely the FTS half of the fusion is
   inert on the raw sentence (ANDs to nothing) → pure vector → over-matches "EU".
3. **Score field name.** We read it from `extra` tolerating variants
   (rank/score/relevance_score/hybrid_score/...). Confirm the exact field so we
   aren't guessing.

## Questions for RulHub
1. Is `search_mode=hybrid` deterministic for a fixed query?
2. How does the FTS half tokenize the raw query — AND or OR? (drives the
   over-matching: if it ANDs the full sentence it matches nothing and hybrid
   degrades to vector-only)
3. Exact per-hit relevance score field name?

## Recommended path
**Lexical + hybrid fusion at the RulGPT layer**: run both, merge the candidate
sets, let scoring sort. GQ-25's Art 16 (hybrid) and GQ-47's EUDR rule (lexical)
both appear; the right rule wins per query. Costs 2× RulHub calls but is robust
to both failure modes. Alternatively, RulHub tightens the FTS-half tokenization +
domain filtering so hybrid alone stops over-matching.

State: RULGPT_SEARCH_MODE flag-gated, prod = lexical. Confidence fix + the
derive_search_queries fix (GQ-46/57) shipped and live.
