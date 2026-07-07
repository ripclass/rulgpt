"""Rapid Test Batch 1 (GQ-71 to GQ-95)."""
from __future__ import annotations
import json, time, httpx

API = "https://rulegpt-api.onrender.com"
EP = f"{API}/api/query"
TOKEN = "batch1-rapid"

QS = [
    ("GQ-71", "What happens if an LC doesn't state whether it's revocable or irrevocable?"),
    ("GQ-72", "The LC says 'documents must be presented at the counters of Deutsche Bank Frankfurt.' I presented to Deutsche Bank Singapore branch. Is that valid?"),
    ("GQ-73", "Can the issuing bank refuse to honour if the applicant goes bankrupt after shipment but before presentation?"),
    ("GQ-74", "My LC says 'drafts at 60 days sight.' When does the 60-day period start -- from shipment date or from the bank receiving documents?"),
    ("GQ-75", "The LC amount is EUR 100,000 but my invoice is in USD. Can I present a USD invoice under a EUR-denominated LC?"),
    ("GQ-76", "My bill of lading says 'shipped on deck.' The LC doesn't mention deck shipment. Is this acceptable?"),
    ("GQ-77", "I'm the advising bank. Am I liable if the LC turns out to be fraudulent?"),
    ("GQ-78", "The LC requires 'full set of originals.' How many is a full set for a bill of lading?"),
    ("GQ-79", "My commercial invoice shows the goods weight as '500 kg' but the packing list shows '498 kg.' Is a 2kg difference a discrepancy?"),
    ("GQ-80", "The LC requires a 'certificate of quality.' It doesn't say who should issue it. Can I issue it myself as the exporter?"),
    ("GQ-81", "My transport document shows the shipper as my freight forwarder, not me (the beneficiary). The LC doesn't specify who the shipper should be. Is this a discrepancy?"),
    ("GQ-82", "The certificate of origin shows the country of origin as 'P.R.C.' but the LC says 'China.' Is this a discrepancy?"),
    ("GQ-83", "Is Cuba under US sanctions? Can a US company issue an LC for goods from Cuba?"),
    ("GQ-84", "My buyer's name is similar to a name on the OFAC SDN list but not an exact match. Am I required to report this?"),
    ("GQ-85", "A vessel was flagged for turning off its AIS transponder for 5 days while transiting the Mediterranean. Is this suspicious?"),
    ("GQ-86", "Can EU entities provide insurance for Russian oil shipped below the $60 price cap?"),
    ("GQ-87", "What is the de minimis threshold under RCEP?"),
    ("GQ-88", "I'm exporting wine from Chile to Japan. Is there an FTA between them?"),
    ("GQ-89", "Does the EU-UK TCA allow cumulation with EU inputs for UK exports to the EU?"),
    ("GQ-90", "What's the difference between a Certificate of Origin Form A and a EUR.1?"),
    ("GQ-91", "What's the difference between DAP and DDP?"),
    ("GQ-92", "My LC says EXW but requires a bill of lading. Is that contradictory?"),
    ("GQ-93", "Under FCA Incoterms 2020, can the seller request an on-board notation on the bill of lading?"),
    ("GQ-94", "I'm exporting to Saudi Arabia. Does the LC need to be in Arabic?"),
    ("GQ-95", "India's RBI requires an AD Code for all export transactions. Does this affect my LC?"),
]

def main():
    client = httpx.Client()
    results = []
    for gid, q in QS:
        r = client.post(EP, json={"query": q, "session_token": TOKEN}, timeout=60)
        if r.status_code == 429:
            print(f"  {gid}: RATE LIMITED — waiting 20s")
            time.sleep(20)
            r = client.post(EP, json={"query": q, "session_token": TOKEN}, timeout=60)
        if r.status_code != 200:
            print(f"  {gid}: HTTP {r.status_code}")
            results.append({"id": gid, "error": r.status_code})
            time.sleep(3)
            continue
        d = r.json()
        model = d.get("model_used", "?")
        fb = d.get("fallback_reasons")
        answer = d.get("answer", "")
        print(f"  {gid}: model={model:35s} len={len(answer):4d} {'FB' if fb else ''}")
        results.append({"id": gid, "model": model, "answer": answer, "len": len(answer), "fb": fb})
        time.sleep(3)

    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    fallbacks = 0
    for r in results:
        if "error" in r:
            print(f"  {r['id']:8s} ERROR {r['error']}")
        else:
            fb = " FALLBACK" if r.get("fb") else ""
            if r.get("fb"): fallbacks += 1
            print(f"  {r['id']:8s} {r['model']:35s} len={r['len']:4d}{fb}")
    print(f"\nTotal: {len(results)} | Fallbacks: {fallbacks}")
    with open("batch1_rapid_results.json", "w") as f:
        json.dump(results, f, indent=2)
    client.close()

if __name__ == "__main__":
    main()
