"""Run golden queries against a running API and score results.

Defaults to a local dev server (http://localhost:8000). Pass --base-url to
target a deployed instance, e.g.:

    python scripts/run_golden_queries.py --base-url https://rulegpt-api.onrender.com

Exits non-zero if any of GQ-01 through GQ-10 (the launch pass bar — see
GOLDEN_QUERIES.md) errored, so this can gate a post-resume acceptance run.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import httpx

SESSION_TOKEN = "golden-query-test-session"

# GQ-01 through GQ-10 are the launch pass bar (GOLDEN_QUERIES.md: "no Fail on
# any core query from GQ-01 to GQ-10"). A query in this set that errors out
# fails the run.
CORE_GQ_IDS = {f"GQ-{i:02d}" for i in range(1, 11)}

GOLDEN_QUERIES = [
    {
        "id": "GQ-01",
        "category": "ICC / Documentary Credit",
        "query": "What does UCP600 say about transport documents?",
        "checks": [
            "UCP600 transport-document articles surfaced",
            "answer distinguishes transport document categories",
            "rule references present (not vague summary)",
        ],
    },
    {
        "id": "GQ-02",
        "category": "ICC / Documentary Credit",
        "query": "How does UCP600 handle discrepancies?",
        "checks": [
            "Article 16 surfaced",
            "short answer first",
            "clear consequence of refusal / notice path",
        ],
    },
    {
        "id": "GQ-03",
        "category": "ICC / Documentary Credit",
        "query": "What documents are required for a CIF shipment under UCP600?",
        "checks": [
            "decisive short answer",
            "clear split between LC-required docs and CIF insurance obligation",
            "low confidence if coverage is partial",
        ],
    },
    {
        "id": "GQ-04",
        "category": "ICC / Documentary Credit",
        "query": "How does ISBP745 define a compliant commercial invoice?",
        "checks": [
            "invoice-specific ISBP paragraphs retrieved",
            "plain-language summary",
            "no memo-style answer",
        ],
    },
    {
        "id": "GQ-05",
        "category": "FTA / Origin",
        "query": "Does my garment qualify for RCEP preferential tariff from Bangladesh?",
        "checks": [
            "threshold issue: Bangladesh is NOT an RCEP member",
            "no generic no-match answer",
            "explanation stays short and decisive",
        ],
    },
    {
        "id": "GQ-06",
        "category": "FTA / Origin",
        "query": "Which country pair and HS classification are you testing under this FTA?",
        "checks": [
            "treated as in-scope trade question",
            "no out-of-scope misclassification",
            "asks for missing facts usefully",
        ],
    },
    {
        "id": "GQ-07",
        "category": "FTA / Origin",
        "query": "What is the USMCA de minimis threshold for textile imports?",
        "checks": [
            "agreement and textile context recognized",
            "answer distinguishes de minimis from broader origin qualification",
        ],
    },
    {
        "id": "GQ-08",
        "category": "Sanctions",
        "query": "What are OFAC requirements for trading with UAE counterparties?",
        "checks": [
            "UAE not treated as comprehensively sanctioned",
            "answer covers screening, ownership/control, goods/destination",
            "no unnecessary TRDR/RulHub mention",
        ],
    },
    {
        "id": "GQ-09",
        "category": "Sanctions",
        "query": "Is Iran sanctioned under OFAC?",
        "checks": [
            "decisive answer (yes)",
            "correct scope framing",
            "no hedging on the core point",
        ],
    },
    {
        "id": "GQ-10",
        "category": "Incoterms / Trade Operations",
        "query": "What is the difference between CIF and FOB under Incoterms 2020?",
        "checks": [
            "short side-by-side distinction",
            "risk transfer and insurance obligation separated clearly",
            "no LC-specific obligations mixed in unless framed separately",
        ],
    },
    {
        "id": "GQ-11",
        "category": "Bank / Operational Rules",
        "query": "What are HDFC Bank's LC requirements?",
        "checks": [
            "bank-specific rules retrieved if present",
            "answer clearly distinguishes bank practice from ICC rules",
        ],
    },
    {
        "id": "GQ-12",
        "category": "Out Of Scope",
        "query": "What is Bitcoin?",
        "checks": [
            "politely declined",
            "no attempt to answer from general model knowledge",
        ],
    },
    {
        "id": "GQ-13",
        "category": "Out Of Scope",
        "query": "How do I file my taxes?",
        "checks": [
            "politely declined",
            "no weak adjacent explanation",
        ],
    },
    {
        "id": "GQ-14",
        "category": "Product Behavior",
        "query": "Is this LC compliant?",
        "checks": [
            "does not pretend to validate a real document",
            "states the product boundary clearly",
        ],
    },
    {
        "id": "GQ-15",
        "category": "Product Behavior",
        "query": "Can you review my invoice wording?",
        "checks": [
            "states whether this is rules explanation vs document review",
            "does not over-claim",
        ],
    },
    {
        "id": "GQ-16",
        "category": "ICC / Documentary Credit",
        "query": "Explain what MT700 field 46A controls and how strictly banks apply the documents listed there.",
        "checks": [
            "field 46A correctly identified as the documents-required field",
            "distinguishes what the field controls from the examination standard",
            "no invented field numbers or article citations",
        ],
    },
    {
        "id": "GQ-17",
        "category": "ICC / Documentary Credit",
        "query": "Under ISBP 821, can the goods description on the invoice differ from the LC wording?",
        "checks": [
            "correspondence-not-identical standard surfaced",
            "ISBP 821-specific paragraph referenced",
            "no overclaiming that any wording difference is acceptable",
        ],
    },
    {
        "id": "GQ-18",
        "category": "ICC / Documentary Credit",
        "query": "When does a demand under URDG 758 have to be presented, and what makes it non-complying?",
        "checks": [
            "presentation timing and non-complying-demand grounds both addressed",
            "URDG 758-specific articles surfaced",
            "short, decisive framing before caveats",
        ],
    },
    {
        "id": "GQ-19",
        "category": "ICC / Documentary Credit",
        "query": "What changes under eUCP 2.1 when documents are presented electronically?",
        "checks": [
            "eUCP 2.1 treated as a supplement to UCP600, not a standalone replacement",
            "express-incorporation threshold point surfaced",
            "no fabricated eUCP article numbers",
        ],
    },
    {
        "id": "GQ-20",
        "category": "FTA / Origin",
        "query": "What proof of origin does RCEP accept for preferential tariff treatment?",
        "checks": [
            "distinct from GQ-05 (proof-of-origin, not membership/threshold)",
            "names accepted proof-of-origin forms rather than a vague answer",
            "low confidence if only part of the accepted forms are covered",
        ],
    },
]


def run_query(client: httpx.Client, query_endpoint: str, query: str) -> dict:
    """Fire a query at the API and return the response."""
    resp = client.post(
        query_endpoint,
        json={"query": query, "session_token": SESSION_TOKEN},
        timeout=150.0,
    )
    if resp.status_code == 429:
        print("    Rate limited — waiting 10s...")
        time.sleep(10)
        resp = client.post(
            query_endpoint,
            json={"query": query, "session_token": SESSION_TOKEN},
            timeout=150.0,
        )
    resp.raise_for_status()
    return resp.json()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="API base URL (default: http://localhost:8000; use the Render URL for a deployed run)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    query_endpoint = f"{base_url}/api/query"

    client = httpx.Client()
    results = []

    for gq in GOLDEN_QUERIES:
        print(f"\n{'='*70}")
        print(f"{gq['id']} [{gq['category']}]")
        print(f"Query: {gq['query']}")
        print(f"{'='*70}")

        try:
            data = run_query(client, query_endpoint, gq["query"])
            answer = data.get("answer", "")
            confidence = data.get("confidence_band", "?")
            model = data.get("model_used", "?")
            citations = data.get("citations", [])
            routing_tier = data.get("routing_tier", "?")
            cost_usd = data.get("cost_usd")

            print(f"\nModel: {model} | Tier: {routing_tier} | Confidence: {confidence}")
            if cost_usd is not None:
                print(f"Cost: ${cost_usd:.6f}")
            print(f"Citations: {len(citations)}")
            if citations:
                for c in citations[:5]:
                    print(f"  - [{c.get('rulebook', '?')}] {c.get('reference', '?')}: {c.get('excerpt', '')[:80]}")
            print(f"\nAnswer ({len(answer)} chars):")
            print(f"  {answer[:500]}")
            if len(answer) > 500:
                print(f"  ...({len(answer) - 500} more chars)")

            print(f"\nChecks:")
            for check in gq["checks"]:
                print(f"  [ ] {check}")

            results.append({
                "id": gq["id"],
                "category": gq["category"],
                "query": gq["query"],
                "answer": answer,
                "confidence": confidence,
                "model": model,
                "routing_tier": routing_tier,
                "cost_usd": cost_usd,
                "citation_count": len(citations),
                "citations": [
                    {"rulebook": c.get("rulebook"), "reference": c.get("reference")}
                    for c in citations[:8]
                ],
                "answer_length": len(answer),
                "checks": gq["checks"],
            })

        except Exception as e:
            print(f"\nERROR: {e}")
            results.append({
                "id": gq["id"],
                "error": str(e),
            })

        # Small delay to avoid rate limiting
        time.sleep(2)

    # Summary
    print(f"\n\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    known_costs = [r["cost_usd"] for r in results if r.get("cost_usd") is not None]
    for r in results:
        if "error" in r:
            print(f"  {r['id']:8s} ERROR: {r['error'][:60]}")
        else:
            cost_str = f"${r['cost_usd']:.6f}" if r.get("cost_usd") is not None else "?"
            print(f"  {r['id']:8s} | {r['confidence']:8s} | {r['model']:30s} | {r['citation_count']} cites | {r['answer_length']:4d} chars | {cost_str}")
    if known_costs:
        print(f"\nAverage cost_usd across {len(known_costs)} priced queries: ${sum(known_costs) / len(known_costs):.6f}")

    # Save results
    out_path = "golden_query_results.json"
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nFull results saved to {out_path}")

    client.close()

    # Pass bar: GQ-01..GQ-10 must not have errored.
    core_failures = [r["id"] for r in results if r["id"] in CORE_GQ_IDS and "error" in r]
    if core_failures:
        print(f"\nFAIL: core golden queries errored: {', '.join(core_failures)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
