"""Run tfrules.com golden queries SET 4 (GQ-51 to GQ-70) against the live API."""
from __future__ import annotations
import json, time, httpx

API_URL = "https://rulegpt-api.onrender.com"
QUERY_ENDPOINT = f"{API_URL}/api/query"
SESSION_TOKEN = "gq-set4"

GOLDEN_QUERIES = [
    {"id": "GQ-51", "title": "User Contradicts LC Terms",
     "query": "My LC is irrevocable and confirmed by Deutsche Bank. The goods are shipped CIF Hamburg. I used FCA Ho Chi Minh City in my commercial invoice because that's what my contract with the buyer says. The LC Field 45A says CIF Hamburg. Is using FCA in the invoice okay since the contract says FCA?"},
    {"id": "GQ-52", "title": "Confirmation Misconception",
     "query": "I'm importing generators from China. The LC is confirmed by Standard Chartered Lagos. If the generators arrive damaged, Standard Chartered will refund me since they confirmed the LC, right? That's what confirmation means?"},
    {"id": "GQ-53", "title": "Advising vs Issuing Bank Confusion",
     "query": "My advising bank (ICICI) is taking too long to check my documents. It's been 7 banking days. Under UCP600, the bank only has 5 banking days. Can I demand payment from ICICI since they've exceeded the time limit?"},
    {"id": "GQ-54", "title": "B/L Backdating — Fraud Warning",
     "query": "My LC's latest shipment date was March 15. The goods actually loaded on March 18. My freight forwarder says he can issue the B/L with an on-board date of March 14 to 'fix' the problem. Is there any risk with this?"},
    {"id": "GQ-55", "title": "Partial Shipments — Good News",
     "query": "My LC is for 10,000 pieces of shirts, total value USD 80,000. I can only ship 6,000 pieces now and the rest next month. The LC doesn't mention partial shipments. Can I just make two presentations?"},
    {"id": "GQ-56", "title": "Transferable LC Invoice Substitution",
     "query": "My buyer issued a transferable LC in my favour. I want to transfer the full amount to my supplier. My supplier will ship directly to the buyer. But I want to keep my commission -- can I substitute my invoice for a higher amount than my supplier's to capture the margin?"},
    {"id": "GQ-57", "title": "Oil & Gas — War Risk Insurance",
     "query": "I'm shipping LNG from Qatar to Pakistan. My LC requires marine cargo insurance including war risk and SRCC (strikes, riots, civil commotion). The insurance broker says war risk premium for Pakistan has tripled since last month. If I get the insurance but it doesn't cover the full CIF value + 10% because the premium is too high, is that a discrepancy?"},
    {"id": "GQ-58", "title": "Agriculture — Banned Fumigant",
     "query": "My LC for rice exports to the EU requires both a phytosanitary certificate AND a fumigation certificate showing methyl bromide treatment. But the EU banned methyl bromide under the Montreal Protocol. My fumigation company uses phosphine instead. Can I present a fumigation certificate showing phosphine treatment when the LC specifically says methyl bromide?"},
    {"id": "GQ-59", "title": "Textiles — GSP Form A vs REX",
     "query": "I export garments from Cambodia to the EU using GSP (Generalized System of Preferences) Form A for preferential tariff. My buyer says EU is phasing out Form A and replacing it with REX (Registered Exporter System). My LC still requires 'GSP Form A issued by competent authority.' Can I present a REX self-certification statement instead?"},
    {"id": "GQ-60", "title": "Performance Guarantee Reduction",
     "query": "I have a performance guarantee for 10% of contract value (SAR 50 million). The project is 70% complete and accepted by the employer. Under URDG 758, can I ask for the guarantee amount to be reduced proportionally to reflect completed work? The guarantee text doesn't mention reduction."},
    {"id": "GQ-61", "title": "LC Expires Tomorrow — Crisis",
     "query": "My LC expires TOMORROW. I have all documents ready but my bill of lading has a discrepancy -- the port of loading shows 'Chittagong' but the LC says 'Chattogram' (same port, renamed in 2018). Can I present with this discrepancy and ask for a waiver? Or is there another option?"},
    {"id": "GQ-62", "title": "Amendment Not Yet Accepted",
     "query": "The issuing bank sent an LC amendment extending the shipment date by 30 days and increasing the amount by $50,000. I haven't formally accepted the amendment yet. Can I ship under the amended terms, or do I need to accept first? What happens if I ship under original terms while the amendment is outstanding?"},
    {"id": "GQ-63", "title": "Deferred Payment — Early Cash",
     "query": "I have a deferred payment LC -- payment is due 90 days after B/L date. I presented documents 2 weeks ago and the issuing bank confirmed the presentation complies. But I need the money now, not in 76 days. Can the issuing bank pay me early? Can anyone pay me early?"},
    {"id": "GQ-64", "title": "Red Clause LC",
     "query": "My supplier in Kenya needs advance payment to harvest and process the coffee before shipment. Someone mentioned a 'red clause LC' that allows this. How does it work? Is the advance payment at risk if the supplier doesn't ship?"},
    {"id": "GQ-65", "title": "Revocable LC — Trick Question",
     "query": "Can a bank issue a revocable letter of credit under UCP600? My textbook mentions revocable credits but I can't find the article."},
    {"id": "GQ-66", "title": "Currency Collapse — EGP LC",
     "query": "My LC is denominated in Egyptian Pounds (EGP). When the LC was issued, EGP was 30 to the dollar. Now it's 50 to the dollar. My goods cost hasn't changed in dollar terms but the EGP amount in the LC is now worth 40% less than when we agreed the deal. The LC amount hasn't been amended. Do I have to ship at the original EGP amount?"},
    {"id": "GQ-67", "title": "Back-to-Back LC Document Mismatch",
     "query": "I have two LCs -- a master LC from my buyer and a back-to-back LC I opened for my supplier. My supplier shipped and I received their documents under the back-to-back LC. But when I compare their documents with what the master LC requires, the goods description doesn't match exactly. Can I amend my supplier's documents before presenting under the master LC?"},
    {"id": "GQ-68", "title": "Everything at Once — 5 Questions",
     "query": "We're buying refined copper cathodes from a Zambian mining company, paying via confirmed LC from Emirates NBD, shipping CIF Nhava Sheva (India). The copper is partially processed from DRC-origin ore. I need to know: (1) conflict minerals due diligence requirements, (2) whether the LBMA responsible sourcing standards apply to copper, (3) India's DGFT import requirements for copper cathodes, (4) whether our confirming bank has exposure if the issuing bank is in Zambia, and (5) CIF insurance requirements for a commodity with price volatility."},
    {"id": "GQ-69", "title": "Sanctions + FTA + Customs Union",
     "query": "We're routing a shipment of textiles from Uzbekistan through Turkey to the EU. The textiles qualify for EU GSP+ preferential tariff if shipped directly, but we're doing transshipment in Istanbul. Does transshipment through Turkey affect the GSP+ origin status? Also, are there any sanctions concerns with Uzbekistan? And does Turkey's customs union with the EU help or complicate this?"},
    {"id": "GQ-70", "title": "Expert — Art 14(d) vs 14(f) Tension",
     "query": "Under UCP600, Article 14(d) states that data in a document need not be identical to, but must not conflict with, data in that document, any other stipulated document, or the credit. The ICC Banking Commission spent years debating what 'not conflict' means versus 'not inconsistent.' Sub-article (f) then says if the credit requires presentation of a document other than a transport document, insurance document, or commercial invoice, without stipulating by whom the document is to be issued or its data content, banks will accept the document as presented if its content appears to fulfil the function of the required document. How do you reconcile 14(d)'s 'not conflict' standard with 14(f)'s permissive approach for unstipulated documents? Is there a hierarchy?"},
]

def run_query(client, query):
    resp = client.post(QUERY_ENDPOINT, json={"query": query, "session_token": SESSION_TOKEN}, timeout=60.0)
    if resp.status_code == 429:
        print("    Rate limited - waiting 20s...")
        time.sleep(20)
        resp = client.post(QUERY_ENDPOINT, json={"query": query, "session_token": SESSION_TOKEN}, timeout=60.0)
    resp.raise_for_status()
    return resp.json()

def main():
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
            fallback = data.get("fallback_reasons")
            print(f"Model: {model} | Tier: {tier} | Cites: {len(data.get('citations',[]))} | Len: {len(answer)}")
            if fallback: print(f"FALLBACK: {fallback}")
            print(f"\n{answer[:350]}")
            if len(answer) > 350: print(f"...({len(answer)-350} more)")
            results.append({"id": gq["id"], "title": gq["title"], "answer": answer,
                "model": model, "routing_tier": tier, "citation_count": len(data.get("citations",[])),
                "fallback_reasons": fallback, "answer_length": len(answer)})
        except Exception as e:
            print(f"ERROR: {e}")
            results.append({"id": gq["id"], "title": gq["title"], "error": str(e)})
        time.sleep(4)
    print(f"\n\n{'='*70}\nSUMMARY\n{'='*70}")
    for r in results:
        if "error" in r:
            print(f"  {r['id']:8s} {r['title']:45s} ERROR")
        else:
            fb = " FB" if r.get("fallback_reasons") else ""
            print(f"  {r['id']:8s} {r['title']:45s} {r['model']:35s} len={r['answer_length']}{fb}")
    with open("golden_query_results_set4.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved to golden_query_results_set4.json")
    client.close()

if __name__ == "__main__":
    main()
