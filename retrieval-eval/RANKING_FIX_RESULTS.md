# RulHub ranking-fix re-eval results (2026-07-08)

Re-ran the 42 English queries against live RulHub (alembic n034) through RulGPT's
full path (`/api/query`, now exposing `retrieved_rule_ids` = true pre-filter top-k).
Raw data: `eval_results.json` (new, with `retrieved_rule_ids`) vs
`eval_results_pre_ranking_fix.json` (old).

## Headline: your fix is validated; the F1 headline cases are now blocked UPSTREAM in RulGPT

**Controls — all held, zero regressions:**
| case | conf | note |
|---|---|---|
| GQ-29 charter-party B/L | high → high | UCP600-22 still top |
| GQ-39 RCEP cumulation | med → med | RCEP-CUMUL-001 still #1 |
| GQ-47 EUDR operator/trader | high → high | EUDR-OPERATOR-VS-TRADER #1 |
| GQ-59 Incoterms CIP/CIF | high → high | cleaner — now explicit INCO2020-CIF-002 / CIP-001 |

**Genuine improvements:** GQ-48 (CBAM declarant) med → **high**; GQ-27 (ISBP stale docs) low → med.

## The F1 cases still fail — but it's RulGPT's query, not RulHub's ranking

RulGPT's `derive_search_queries` strips the on-point terms before RulHub sees them:

| case | query RulGPT sends | new top-k RulHub returns | verdict |
|---|---|---|---|
| GQ-25 | `applicant waiver regardless` | DOCDEX-020, DOCDEX-308, ISP98-3.11, ICC-R797, LIFE-WAIVDISC-001 | **RulHub correctly returns *waiver* rules for a *waiver* query.** "UCP 600 / Article 16 / refusal" were dropped — the de-cameling can't bind to a token that isn't sent. NOT a ranking failure. |
| GQ-46 | `2026 default value` | wto-cva#Art-6, note-to-art-6, Art-1, … | "CBAM / steel" dropped → "value" matches WTO Customs Valuation. Same root cause. |
| GQ-57 | `disposition potential country` | JPROC-FOOT-001, brpd-countryrisk, SANC-OFAC-005, EUDR-COUNTRY-BENCH | Ranking changed (now OFAC/country-risk, was ISDGP/WTO) but no PEP-disposition rule exists — **coverage gap confirmed, as you predicted.** |

**This is the same class as the GQ-24 "lexical≠semantic" issue you flagged** — RulGPT's
lexical keyword picker ranks by rarity and drops instrument/domain terms (UCP 600,
CBAM, ISBP, refusal, PEP). Your ranking fix can't be exercised until RulGPT sends a
query that contains the on-point terms. **The RulGPT-side counterpart to your fix is
now the blocker: `derive_search_queries` must preserve publication + concept terms.**

## Alignment checks (RulGPT side)

1. **Relevance floor (F2):** not built — it was a recommendation, never implemented. My
   confidence uses rank-normalized rerank (`similarity = rank/max_rank`, top→1.0), so
   it's structurally insulated from your absolute-score scale change. BUT the ranking
   shift still moved 5/42 confidence bands (GQ-41 high→med, GQ-44/54 med→low; GQ-27/48
   up). All still cited — band-only shifts, no hard new failures. I'll re-verify the
   `_confidence_from_rules` thresholds against the new avg(top-3) distribution.
2. **Citation labels:** I'll consume your `citation_label`/`display_name`/`verification`
   as the single source of truth (fixes my long-slug format gaps). Confirmed my
   `normalize_rule` currently drops them (they'd land in `extra`, never reach the
   citation). Follow-up wiring: normalize_rule → retriever → prefer in build_citations,
   falling back to my `format_citation_display` only when you don't return a label.
3. **Machinery filter:** your source-side exclusion works — zero events/data_quality in
   the new top-k. My client-side drop is now redundant; keeping as defense-in-depth
   (also covers the `RETRIEVAL_BACKEND=local` rollback path). Can remove later.

## Net
Your fix is good (controls clean, CBAM up, no regressions). But the F1 headline wins
(GQ-25/46) won't appear end-to-end until RulGPT fixes `derive_search_queries`. GQ-57 and
GQ-37 are coverage gaps, not ranking. Multilingual re-run pending.
