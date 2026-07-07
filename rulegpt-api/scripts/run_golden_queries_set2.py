"""Run tfrules.com golden queries SET 2 (GQ-16 to GQ-30) against the live API."""

from __future__ import annotations

import json
import time
import httpx

API_URL = "https://rulegpt-api.onrender.com"
QUERY_ENDPOINT = f"{API_URL}/api/query"
SESSION_TOKEN = "gq-set2"

GOLDEN_QUERIES = [
    {"id": "GQ-16", "title": "Demand Guarantee — Extend or Pay",
     "query": "The employer sent an 'extend or pay' demand on my performance guarantee. The guarantee is subject to URDG 758. My bank says they have to pay if I don't extend. Is that right? Can I stop the payment? The underlying contract dispute is still in arbitration."},
    {"id": "GQ-17", "title": "Standby LC vs Demand Guarantee Rules",
     "query": "We received a standby letter of credit from a US bank that says 'subject to ISP98' in the text, but our client wants it to be governed by URDG 758. Can we have a standby subject to URDG instead of ISP98? Or do standbys always follow ISP98?"},
    {"id": "GQ-18", "title": "Guarantee Claim Compliance",
     "query": "We issued a demand guarantee under URDG 758. The beneficiary submitted a demand stating 'the applicant has failed to perform their obligations.' But the guarantee requires the demand to include a statement specifying 'in what respect the applicant is in breach.' Is this demand complying?"},
    {"id": "GQ-19", "title": "D/P Collection — Bank Obligations",
     "query": "I'm shipping coffee to a buyer in Germany on D/P terms. I gave my bank the documents with instructions to release them against payment. The buyer's bank says the buyer wants to inspect the coffee before paying. Can the German bank release the documents for inspection before payment?"},
    {"id": "GQ-20", "title": "eUCP Electronic Presentation",
     "query": "Our client wants to present LC documents electronically. The LC is subject to UCP600 but doesn't mention eUCP. Can they present electronic documents anyway? What if some documents are electronic and some are paper — is a mixed presentation allowed?"},
    {"id": "GQ-21", "title": "Conflicting Dates Across Documents",
     "query": "I'm preparing documents for an LC presentation. The commercial invoice is dated March 5. The bill of lading shows on-board date March 3. The certificate of origin is dated March 8. The LC says nothing about document dating sequence. Is there any problem with these dates?"},
    {"id": "GQ-22", "title": "LC vs Suspended Local Law",
     "query": "My LC requires a pre-shipment inspection certificate from a Nigerian inspection agent. But the Nigerian government suspended the pre-shipment inspection program (NESREA conformity assessment) last year. My buyer says 'just get any inspection certificate.' The LC still requires it. What do I do?"},
    {"id": "GQ-23", "title": "User Who Is Wrong",
     "query": "My bank is being unreasonable. They rejected my supplier's documents because the commercial invoice shows 'FOB Shanghai' but the LC says 'FOB Shanghai Port.' The word 'Port' is missing. This is obviously the same place! Isn't the bank manufacturing discrepancies to avoid paying?"},
    {"id": "GQ-24", "title": "Pharma Cold Chain Documentation",
     "query": "I'm exporting temperature-sensitive vaccines to Kenya under an LC. The LC requires a 'temperature monitoring certificate showing continuous cold chain maintenance between 2C and 8C.' My monitoring device recorded a spike to 9.2C for 45 minutes during transit. The vaccines are still viable according to our quality team. Will the bank refuse the certificate?"},
    {"id": "GQ-25", "title": "UAE Gold Trade Sourcing",
     "query": "I'm importing gold bullion from Uganda to Dubai. My LC is issued by Emirates NBD. What special documentation does UAE require for precious metals imports beyond the standard LC documents? I've heard about conflict minerals requirements but I'm not sure if gold from Uganda triggers anything."},
    {"id": "GQ-26", "title": "MT700 Field Mismatch",
     "query": "I'm examining an LC received via SWIFT MT700. Field 39A shows 'ABOUT' but Field 32B has an exact amount of USD 500,000.00 with no tolerance indicator. Field 39B is empty. Is the amount subject to the 10% 'about' tolerance or is the exact amount the limit?"},
    {"id": "GQ-27", "title": "Nonsense Question — UCP600 Art 52",
     "query": "What does UCP600 Article 52 say about electronic bills of lading?"},
    {"id": "GQ-28", "title": "Indonesia-EU EUDR Conflict",
     "query": "I'm buying palm oil from Indonesia and reselling to the EU. Indonesia requires an export declaration through their iNaTraDe system. The EU's new EUDR (deforestation regulation) requires a due diligence statement proving the palm oil isn't from deforested land. My LC from the European buyer requires both. But my Indonesian supplier says they can't provide the EUDR statement because that's a European requirement, not Indonesian. Who's responsible for the EUDR due diligence statement?"},
    {"id": "GQ-29", "title": "Multi-Product Crossover",
     "query": "I have a deferred payment LC for machinery parts from Japan to Mexico. The LC amount is $1.2 million. I need to know: (1) Under UCP600, when does the issuing bank's payment obligation mature? (2) Can I forfait the deferred payment receivable? (3) What are the USMCA rules of origin implications if the machinery parts contain 30% Chinese components?"},
    {"id": "GQ-30", "title": "Emotional User — Lost $40K",
     "query": "I just lost $40,000 because the bank rejected my documents over a TYPO in the beneficiary address. One letter wrong in the street name. I've been shipping to this buyer for 5 years with no problems. This is the same bank that always accepted my documents. Now suddenly they find a problem? I'm going bankrupt. Is there anything I can do? Can I sue the bank?"},
]


def run_query(client: httpx.Client, query: str) -> dict:
    resp = client.post(QUERY_ENDPOINT, json={"query": query, "session_token": SESSION_TOKEN}, timeout=60.0)
    if resp.status_code == 429:
        print("    Rate limited - waiting 20s...")
        time.sleep(20)
        resp = client.post(QUERY_ENDPOINT, json={"query": query, "session_token": SESSION_TOKEN}, timeout=60.0)
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
            model = data.get("model_used", "?")
            tier = data.get("routing_tier", "?")
            confidence = data.get("confidence_band", "?")
            citations = data.get("citations", [])
            fallback = data.get("fallback_reasons")

            print(f"Model: {model} | Tier: {tier} | Conf: {confidence} | Cites: {len(citations)}")
            if fallback:
                print(f"FALLBACK: {fallback}")
            if citations:
                for c in citations[:4]:
                    print(f"  [{c.get('rulebook','?')}] {c.get('reference','?')}")
            print(f"\nAnswer ({len(answer)} chars):")
            print(answer)

            results.append({
                "id": gq["id"], "title": gq["title"], "query": gq["query"],
                "answer": answer, "model": model, "routing_tier": tier,
                "confidence": confidence, "citation_count": len(citations),
                "fallback_reasons": fallback, "answer_length": len(answer),
            })
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"id": gq["id"], "title": gq["title"], "error": str(e)})
        time.sleep(4)

    print(f"\n\n{'='*70}")
    print("SUMMARY")
    print(f"{'='*70}")
    for r in results:
        if "error" in r:
            print(f"  {r['id']:8s} {r['title']:45s} ERROR")
        else:
            fb = " FALLBACK" if r.get("fallback_reasons") else ""
            print(f"  {r['id']:8s} {r['title']:45s} model={r['model']:35s} conf={r['confidence']:8s} len={r['answer_length']}{fb}")

    with open("golden_query_results_set2.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to golden_query_results_set2.json")
    client.close()


if __name__ == "__main__":
    main()
