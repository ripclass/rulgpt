"""Run tfrules.com golden queries v2 against the live API."""

from __future__ import annotations

import json
import sys
import time
import httpx

API_URL = "https://rulegpt-api.onrender.com"
QUERY_ENDPOINT = f"{API_URL}/api/query"
SESSION_TOKEN = "gq-v2-test"

GOLDEN_QUERIES = [
    {
        "id": "GQ-01",
        "title": "Third Party Document Trap",
        "query": "The bank refused my documents saying the commercial invoice was issued by a third party, not the beneficiary. But I used my trading company to issue it — I AM the beneficiary. The trading company and the beneficiary are the same entity, just different letterhead. Is the bank right?",
    },
    {
        "id": "GQ-02",
        "title": "Tolerance on LC Amount",
        "query": "My LC amount is USD 50,000. I shipped goods worth USD 52,300. The LC doesn't say anything about tolerance. Will the bank accept my documents or is this a discrepancy?",
    },
    {
        "id": "GQ-03",
        "title": "Late Presentation vs Expired LC",
        "query": "I shipped on March 1. My LC expires April 30. I'm presenting documents on March 25 — that's 24 days after shipment. The LC doesn't mention any specific presentation period. Is my presentation late?",
    },
    {
        "id": "GQ-04",
        "title": "Multimodal vs Bill of Lading",
        "query": "My client's LC calls for a 'Bill of Lading' but the shipment is container door-to-door from Jebel Ali to Rotterdam, with a truck leg from the factory to the port. The shipping line will only issue a multimodal transport document, not a marine bill of lading. Can I present the multimodal document against an LC that says 'Bill of Lading'?",
    },
    {
        "id": "GQ-05",
        "title": "RCEP Cumulation",
        "query": "I manufacture car brake pads in Thailand using steel imported from Japan and rubber from Malaysia. I want to export to South Korea under RCEP preferential tariff. Can I cumulate the Japanese and Malaysian inputs to meet the origin requirement?",
    },
    {
        "id": "GQ-06",
        "title": "USMCA Automotive Rules of Origin",
        "query": "We assemble passenger vehicles in Mexico using engines from the US and transmissions from Japan. What's the Regional Value Content threshold for the finished vehicle under USMCA, and does the Japanese transmission disqualify us?",
    },
    {
        "id": "GQ-07",
        "title": "Bangladesh RCEP Trick Question",
        "query": "I export ready-made garments from Bangladesh to Australia. Can I use RCEP certificate of origin to get preferential tariff since Australia is an RCEP member?",
    },
    {
        "id": "GQ-08",
        "title": "UAE Transshipment and Iran Sanctions",
        "query": "We received an LC for medical equipment from a German exporter to a company in Dubai. The goods are listed as medical devices but the end-user certificate shows a hospital in Tehran, Iran. The applicant says medical goods are exempt from sanctions. Are they right? What should we check?",
    },
    {
        "id": "GQ-09",
        "title": "Russian Oil Price Cap",
        "query": "A client wants to ship Russian crude oil from Novorossiysk to India. The price is $58 per barrel. Is this compliant with the G7 price cap? What vessel checks do I need to do?",
    },
    {
        "id": "GQ-10",
        "title": "CIF vs FOB Insurance Under LC",
        "query": "My supplier in India is shipping fabric under CIF New York. The LC calls for CIF. Who is responsible for insurance — me or the supplier? And does the insurance document need to be presented with the LC documents? My supplier says insurance is 'included in the price' so I don't need a separate policy.",
    },
    {
        "id": "GQ-11",
        "title": "HDFC Bank Presentation Period",
        "query": "I received an LC from HDFC Bank India. The LC says 'Documents must be presented within 15 days of shipment.' UCP600 says 21 days. Which one applies? Can HDFC override UCP600?",
    },
    {
        "id": "GQ-12",
        "title": "Crypto Payment for Trade",
        "query": "Can I pay for my import shipment using Bitcoin instead of opening an LC? My supplier in China accepts crypto. What are the trade compliance rules for cryptocurrency payments?",
    },
    {
        "id": "GQ-13",
        "title": "Income Tax on Export Revenue",
        "query": "How much income tax do I pay on my export revenue in Kenya? Are there any export tax incentives?",
    },
    {
        "id": "GQ-14",
        "title": "Document Validation Request",
        "query": "I have an LC from Standard Chartered Bank and 6 supporting documents (invoice, packing list, bill of lading, insurance certificate, certificate of origin, inspection certificate). Can you check if my documents are compliant and tell me the discrepancies?",
    },
    {
        "id": "GQ-15",
        "title": "Legal Opinion on DOCDEX",
        "query": "The issuing bank refused my documents citing 3 discrepancies. I believe 2 of them are wrong — the bank is misinterpreting UCP600 Article 14. I want to take this to ICC DOCDEX arbitration. Can you tell me if I have a strong case and whether I should proceed?",
    },
]


def run_query(client: httpx.Client, query: str) -> dict:
    resp = client.post(
        QUERY_ENDPOINT,
        json={"query": query, "session_token": SESSION_TOKEN},
        timeout=45.0,
    )
    if resp.status_code == 429:
        print("    Rate limited - waiting 15s...")
        time.sleep(15)
        resp = client.post(
            QUERY_ENDPOINT,
            json={"query": query, "session_token": SESSION_TOKEN},
            timeout=45.0,
        )
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    client = httpx.Client()
    results = []

    for gq in GOLDEN_QUERIES:
        print(f"\n{'='*70}")
        print(f"{gq['id']}: {gq['title']}")
        print(f"{'='*70}")

        try:
            data = run_query(client, gq["query"])
            answer = data.get("answer", "")
            confidence = data.get("confidence_band", "?")
            model = data.get("model_used", "?")
            citations = data.get("citations", [])
            routing_tier = data.get("routing_tier", "?")

            print(f"Model: {model} | Tier: {routing_tier} | Confidence: {confidence} | Cites: {len(citations)}")
            if citations:
                for c in citations[:5]:
                    ref = c.get("reference", "?")
                    rb = c.get("rulebook", "?")
                    print(f"  [{rb}] {ref}")
            print(f"\nAnswer ({len(answer)} chars):")
            # Print full answer for scoring
            print(answer)

            results.append({
                "id": gq["id"],
                "title": gq["title"],
                "query": gq["query"],
                "answer": answer,
                "confidence": confidence,
                "model": model,
                "routing_tier": routing_tier,
                "citations": [
                    {"rulebook": c.get("rulebook"), "reference": c.get("reference"), "excerpt": c.get("excerpt", "")[:120]}
                    for c in citations
                ],
                "answer_length": len(answer),
            })
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"id": gq["id"], "title": gq["title"], "error": str(e)})

        time.sleep(4)

    # Summary
    print(f"\n\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    for r in results:
        if "error" in r:
            print(f"  {r['id']:8s} {r['title']:45s} ERROR")
        else:
            print(f"  {r['id']:8s} {r['title']:45s} conf={r['confidence']:8s} cites={len(r['citations'])} len={r['answer_length']}")

    with open("golden_query_results_v2.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to golden_query_results_v2.json")
    client.close()


if __name__ == "__main__":
    main()
