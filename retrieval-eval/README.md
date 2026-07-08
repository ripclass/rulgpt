# Retrieval eval — handoff for the RulHub ranking fix

Raw eval data + a regression seed for the RulHub-side retrieval work described in
`../RETRIEVAL_FINDINGS.md`. Produced by the 2026-07-08 RulGPT live-prod eval
(enterprise account, rulgpt.com).

## Files
- **`eval_results.json`** — 42 English vertical queries (GQ-21→62). Each row:
  `query`, `tags`, `expect` (behavior rubric), `answer`, `confidence`,
  `routing_tier`, `citations`, `latency_ms`.
- **`eval_ml_results.json`** — 46 native-language queries (TR/ES/CN/VN/ID/RU/FR).
  Each row: `original` (the query as typed), `english` (reference translation),
  `domain`, `citations`, `answer`, `confidence`, `latency_ms`.
- **`F1_regression_seed.json`** — the ranking-fix regression set: the F1 repro
  cases classified **ranking-fixable vs coverage-gap**, plus positive controls
  that must not regress.

## Two things to know before you build the regression set

1. **`citations` is the cited SUBSET, not the raw top-k.** It's what survived
   RulGPT's display filter + citation validation (max 8), after label
   formatting. To see the *true* rows RulHub returned, **re-run each `query`
   against `/v1/rules/search` directly** — you own that surface.

2. **Not every F1 miss is a ranking bug — some are coverage gaps.** The seed
   flags which is which:
   - `GQ-25` is the **gold-standard ranking validator**: UCP 600 Art. 16 is
     definitely in the corpus (it surfaced for GQ-23/GQ-57) yet didn't rank for
     the refusal-timeline query. If the fix works, Art. 16 must land in top-5.
   - `GQ-37` (HS/HTS/Schedule-B definition) and `GQ-57` (PEP disposition) are
     **suspected coverage gaps** — confirm the rule exists before expecting the
     ranking fix to help. Measuring the fix against a gap will make it look
     broken when it isn't.

## Cross-language note (already fixed RulGPT-side)
The multilingual 0-retrieval failures (Turkish 0/10, Chinese 0/5) were an
English-only-retriever problem, now fixed in RulGPT by normalizing non-English
queries to English keywords before search (`RAGPipeline._retrieval_query`). The
durable fix is still yours: **multilingual corpus embeddings** would remove the
translation dependency (see RETRIEVAL_FINDINGS.md F0). `eval_ml_results.json` is
the pre-fix snapshot for reference.
