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

## Hardened-hybrid validation (2026-07-09, post RulHub hardening pass)

Determinism check: each case run 3× via /api/query, top-5 compared.

| case | determinism | top-1 | verdict |
|---|---|---|---|
| **GQ-25** | STABLE (3/3 identical) | `UCP600-16A` | **PASS** — Art 16 #1, HIGH conf, stable ✅ |
| GQ-24 | STABLE | UCP600-BTB/18/28 | improved (invoice-relevant) ✅ |
| GQ-57 | STABLE | SANC-TECH-PEP-SCREEN | good ✅ |
| GQ-29/39/59 controls | STABLE | correct | held ✅ |
| **GQ-47** | STABLE | `EU-MOLDOVA-DESTAB` | **FAIL** — still EU-*sanctions*, HIGH conf (confidently wrong) ❌ |
| GQ-46 | STABLE | cdp steel-value + WTO-CVA | still drifts off CBAM-DEFVAL ❌ |

**Determinism: FIXED** (all stable — the embed fail-open + ANN tie-break worked).
**GQ-25: SOLVED + stable** — the semantic win holds.

**Remaining: the ANN weight is STILL too high for lexically-precise queries.**
GQ-47 ("operator or trader under the EUDR") and GQ-46 (CBAM steel default) both
have the lexically-exact rule (EUDR-OPERATOR-VS-TRADER / CBAM-DEFVAL) recalled by
your OR-FTS arm, but the 2× ANN weight lets semantically-plausible rules
(EU-sanctions / steel-value-chain) out-fuse them.

**Recommendation — lower the ANN weight another notch.** Key reason it's safe:
the FTS OR-arm on the RAW query already recalls the right rules for the *semantic*
wins too (GQ-25's raw query contains "refusal" → FTS finds Art 16; the vector arm
reinforces). So a lower ANN weight should fix GQ-47/GQ-46 WITHOUT losing GQ-25 —
both arms support the semantic wins, only the lexically-precise cases need FTS to
win the fuse. Re-validate GQ-47→EUDR + GQ-25→Art16-stable with the determinism
harness. If a single weight can't thread both, RulGPT-side lexical+hybrid fusion
is the fallback.

State: RULGPT_SEARCH_MODE flag-gated, prod=lexical. Ready to flip + re-validate
after the next ANN-weight tune.
