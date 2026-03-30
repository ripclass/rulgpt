# Golden Queries

Last updated: 2026-03-27
Purpose: keep RuleGPT honest on the questions that matter most.

## How To Use This File

For each query, verify:
- first sentence is decisive
- answer is short by default
- key claim is grounded in retrieved rules
- confidence matches actual coverage
- no hallucinated certainty
- no marketing copy in the answer body

Scoring:
- `Pass`: good enough to ship
- `Watch`: usable but needs tightening
- `Fail`: not acceptable for production

## ICC / Documentary Credit

### GQ-01

Query:
`What does UCP600 say about transport documents?`

Expect:
- UCP600 transport-document articles surfaced
- answer distinguishes transport document categories cleanly
- no vague summary without rule references

Status:
- Pending

### GQ-02

Query:
`How does UCP600 handle discrepancies?`

Expect:
- Article 16 surfaced
- short answer first
- clear consequence of refusal / notice path

Status:
- Pending

### GQ-03

Query:
`What documents are required for a CIF shipment under UCP600?`

Expect:
- decisive short answer
- clear split between LC-required docs and CIF insurance obligation
- no narrow insurance-only answer presented as complete
- low confidence if coverage is partial

Status:
- Pending

### GQ-04

Query:
`How does ISBP745 define a compliant commercial invoice?`

Expect:
- invoice-specific ISBP paragraphs retrieved
- plain-language summary
- no memo-style answer

Status:
- Pending

## FTA / Origin

### GQ-05

Query:
`Does my garment qualify for RCEP preferential tariff from Bangladesh?`

Expect:
- threshold issue first: Bangladesh is not an RCEP member
- no generic no-match answer
- explanation stays short and decisive

Status:
- Pending

### GQ-06

Query:
`Which country pair and HS classification are you testing under this FTA?`

Expect:
- treated as in-scope trade question
- no out-of-scope misclassification
- asks for missing facts usefully

Status:
- Pending

### GQ-07

Query:
`What is the USMCA de minimis threshold for textile imports?`

Expect:
- agreement and textile context recognized
- answer distinguishes de minimis from broader origin qualification

Status:
- Pending

## Sanctions

### GQ-08

Query:
`What are OFAC requirements for trading with UAE counterparties?`

Expect:
- UAE not treated as comprehensively sanctioned
- answer ordered operationally:
  - screening
  - ownership/control
  - goods / destination / routing
  - banks / USD nexus
- no unnecessary TRDR/RulHub mention

Status:
- Pending

### GQ-09

Query:
`Is Iran sanctioned under OFAC?`

Expect:
- decisive answer
- correct scope framing
- no hedging on the core point

Status:
- Pending

## Incoterms / Trade Operations

### GQ-10

Query:
`What is the difference between CIF and FOB under Incoterms 2020?`

Expect:
- short side-by-side distinction
- risk transfer and insurance obligation separated clearly
- no LC-specific obligations mixed in unless framed as separate

Status:
- Pending

## Bank / Operational Rules

### GQ-11

Query:
`What are HDFC Bank's LC requirements?`

Expect:
- bank-specific rules retrieved if present
- answer clearly distinguishes bank practice from ICC rules

Status:
- Pending

## Out Of Scope

### GQ-12

Query:
`What is Bitcoin?`

Expect:
- politely declined
- no attempt to answer from general model knowledge

Status:
- Pending

### GQ-13

Query:
`How do I file my taxes?`

Expect:
- politely declined
- no weak adjacent explanation

Status:
- Pending

## Product Behavior Checks

### GQ-14

Query:
`Is this LC compliant?`

Expect:
- does not pretend to validate a real document from text alone
- states the product boundary clearly

Status:
- Pending

### GQ-15

Query:
`Can you review my invoice wording?`

Expect:
- states whether this is covered by rules explanation vs document review
- does not over-claim

Status:
- Pending

## Regression Notes

Watch for these failure modes:
- answer starts with essay-like markdown headings
- answer is blob-like instead of conversational
- threshold issue missed
- follow-up question gets misclassified as out of scope
- partial coverage presented with medium/high confidence
- promo copy leaks into chat

## Pass Bar

Before launch:
- no `Fail` on any core query from GQ-01 to GQ-10
- at most `2` items in `Watch`
- all out-of-scope checks behave correctly

After launch:
- add new failures here every week
- never remove a query after it fails once; convert it into a standing regression
