# Ask for RulHub: hybrid (FTS + vector) search on /v1/rules/search

**Why:** lexical FTS can't bridge queries where the semantic core ≠ the lexical
surface. Two live repros (raw data in this dir):
- **GQ-25** — "...applicant's written waiver... notice of refusal... five banking
  days..." is *about* UCP 600 Art 16, but FTS returns waiver rules (DOCDEX/ISP98).
- **GQ-24** — a Field-47A language-condition question returns MT700/eUCP, not the
  ISBP 821 language paragraph.
RulGPT's keyword derivation and your weighted FTS both operate on tokens; neither
bridges semantics. Re-ranking on my side can't fix it — the on-point rule never
enters the candidate set.

**Ask:** embed the corpus once and add vector/ANN retrieval, **fused with** the
weighted+length-normalized FTS you just shipped (RRF or weighted sum). Expose it
on `/v1/rules/search` — auto-hybrid, or a `mode=hybrid|semantic|lexical` flag.

**One feature, two backlog items:** use a **multilingual** embedding model and
this also closes the durable multilingual-coverage item (F0) — a Turkish/Chinese
query would match without RulGPT's translation hop.

**Contract RulGPT needs:**
- Accept a raw natural-language query (for semantic mode I'll send the full
  question, not keyword variants).
- Same result shape + a per-hit **relevance score** (so my floor + confidence
  calc work) and keep the machinery exclusions.

**Acceptance (from `eval_results.json` / `F1_regression_seed.json`):**
- GQ-25 → UCP 600 **Art 16** in top-5.
- GQ-24 → ISBP 821 language paragraph in top-5.
- Controls GQ-29/39/47/59 unchanged; no new off-domain hits.

**Not blocking you but related:** the stale `ISBP745` refs
(`INCO2020-CIF-002.reference = "...ISBP745 K5..."`) — sweep 745→821 across rule
references while you're in the corpus.
