export interface BlogPost {
  slug: string
  title: string
  description: string
  question: string
  answer: string
  citations: string[]
  tags: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'cif-vs-fob-who-pays-insurance',
    title: 'CIF vs FOB — Who Is Responsible for Insurance Under a Letter of Credit?',
    description: 'Under CIF, the seller arranges insurance. But what does that mean for LC presentation? And what happens when the supplier says insurance is "included in the price"?',
    question: 'My supplier in India is shipping fabric under CIF New York. The LC calls for CIF. Who is responsible for insurance — me or the supplier? And does the insurance document need to be presented with the LC documents?',
    answer: `Your supplier is responsible for the insurance — that's the whole point of CIF. Under Incoterms 2020 CIF, the seller must procure marine cargo insurance covering the buyer's risk during transit, at minimum Institute Cargo Clauses (C). The minimum coverage required is 110% of the CIF value.

When your supplier says insurance is "included in the price," they're correct about the cost — CIF price includes cost, insurance, and freight. But that doesn't mean you skip the document. It means they've paid for a policy on your behalf, and they must hand you the proof of it.

On the LC side, this is critical: because your LC calls for CIF, the insurance document IS a required document for presentation. The bank cannot waive it. The insurance certificate must be for at least 110% of the CIF invoice value, in the same currency as the credit, covering the risks specified in the LC, and dated no later than the shipment date.

If the supplier fails to present a compliant insurance document, the bank WILL refuse the presentation. "Included in the price" is a commercial arrangement, not documentary compliance.

Practical advice: tell your supplier they must present a proper insurance certificate/policy from a recognized insurer, covering at least 110% of CIF value, dated on or before shipment.`,
    citations: [
      'UCP600 Article 28 — Insurance Document',
      'UCP600 Article 28(f)(ii) — Minimum 110% CIF coverage',
      'ISBP745 Paragraphs K1-K15 — Insurance documents under LCs',
      'Incoterms 2020 — CIF (Cost, Insurance and Freight)',
    ],
    tags: ['UCP600', 'Incoterms'],
  },
  {
    slug: 'late-presentation-21-day-rule-ucp600',
    title: 'Is My LC Presentation Late? The 21-Day Rule Under UCP 600',
    description: 'UCP 600 Article 14(c) gives you 21 calendar days after shipment to present documents. Miss it and the LC hasn\'t expired? Still a discrepancy.',
    question: 'I shipped on March 1. My LC expires April 30. I\'m presenting documents on March 25 — that\'s 24 days after shipment. The LC doesn\'t mention any specific presentation period. Is my presentation late?',
    answer: `Yes, your presentation is late — by 3 days.

Under UCP 600 Article 14(c), documents must be presented no later than 21 calendar days after the date of shipment, and no later than the LC expiry date. Both conditions must be met. Your LC doesn't specify a different presentation period, so the default 21-day rule applies.

You shipped March 1. Day 21 falls on March 22. You're presenting March 25 — three days late. The fact that your LC doesn't expire until April 30 doesn't help you here. Being within expiry is necessary but not sufficient.

The bank is entitled to refuse your documents on the basis of late presentation. This is a hard discrepancy, not a grey area.

Your options: ask the bank to accept the documents on an approval basis (they contact the applicant and seek a waiver). The applicant can waive the discrepancy, but they're not obligated to. If the applicant agrees, get that waiver confirmed quickly. If the applicant refuses, you're outside the LC and would need to fall back on your underlying sales contract.`,
    citations: [
      'UCP600 Article 14(c) — 21-day presentation period',
      'UCP600 Article 14(b) — 5 banking days examination',
      'ISBP745 Paragraph D7 — Presentation period',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'partial-shipments-ucp600-article-31',
    title: 'Partial Shipments Under UCP 600 — Allowed by Default?',
    description: 'UCP 600 Article 31(a) allows partial drawings and shipments unless the credit specifically prohibits them. Here\'s what that means in practice.',
    question: 'My LC is for 10,000 pieces of shirts. I can only ship 6,000 now and the rest next month. The LC doesn\'t mention partial shipments. Can I make two presentations?',
    answer: `Good news — you can do this. Under UCP 600 Article 31(a), partial drawings and shipments are allowed unless the credit expressly prohibits them. Silence is not a prohibition — so you can ship 6,000 pieces now and 4,000 next month, and make two separate presentations.

A few things to keep in mind for each presentation: each drawing must stay within the LC amount. Your first drawing would be roughly USD 48,000 (6,000/10,000 of USD 80,000) and the second USD 32,000 — both fine as long as the combined total doesn't exceed USD 80,000.

The 21-day presentation clock runs separately for each shipment. Documents for each partial shipment must be presented within 21 calendar days of that shipment date, and in no event later than the LC expiry date.

Watch the quantity tolerance rule. Your LC states a specific quantity in units (10,000 pieces), so the 5% quantity tolerance does not apply — ship exactly what you invoice each time.

Check whether your LC has a latest shipment date — if the second shipment falls after it, you'd need an amendment. Also confirm there's no instalment shipment schedule in the LC.`,
    citations: [
      'UCP600 Article 31(a) — Partial shipments allowed unless prohibited',
      'UCP600 Article 31(b) — Multiple transport documents',
      'UCP600 Article 14(c) — 21-day presentation period per shipment',
      'UCP600 Article 30(b) — Quantity tolerance',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'iran-sanctions-ofac-comprehensive',
    title: 'Is Iran Sanctioned Under OFAC? What You Need to Know',
    description: 'Iran is comprehensively sanctioned under OFAC. Here\'s what that means for trade finance transactions, humanitarian exemptions, and secondary sanctions.',
    question: 'We received an LC for medical equipment from a German exporter to a company in Dubai. The end-user certificate shows a hospital in Tehran, Iran. The applicant says medical goods are exempt from sanctions. Are they right?',
    answer: `This is a serious red flag — stop and escalate before processing. The applicant's claim that "medical goods are exempt" is a dangerously oversimplification.

The humanitarian exemption is narrow and conditional. Under OFAC's Iran sanctions, there is a general license for humanitarian transactions involving medicine and medical devices (31 CFR 560.530), but it comes with hard limits. It does not authorize transactions processed through the Government of Iran or any SDN, items with potential military end-use, or transactions routed through SWIFT-excluded Iranian banks.

The LC structure here — German exporter, Dubai applicant, Iranian end-user — is a textbook diversion pattern. This doesn't mean it's illicit, but it demands full due diligence.

What you need to check: is the Dubai company on any sanctions list? Is the Tehran hospital on any sanctions list? Are the medical devices dual-use? Does the exporter have the required export licenses from German BAFA? Is there a valid end-user certificate? Does the routing make commercial sense?

Do NOT process without compliance team review and likely regulatory authority consultation.`,
    citations: [
      'OFAC 31 CFR 560.530 — Humanitarian transactions',
      'OFAC 31 CFR 560.501 — Prohibited transactions',
      'CBUAE Guidelines — UAE Export Control',
      'EU Dual-Use Regulation',
    ],
    tags: ['Sanctions', 'OFAC'],
  },
  {
    slug: 'force-majeure-ucp600-article-36',
    title: 'Force Majeure and Letter of Credit Expiry — Does Article 36 Help?',
    description: 'UCP 600 Article 36 exists but it protects BANKS, not beneficiaries. An expired LC is dead regardless of the reason.',
    question: 'A port strike delayed my shipment by 2 weeks. My LC has now expired. The buyer wants the goods. But the bank says the LC has expired and they can\'t process payment. Is there a force majeure provision in UCP600?',
    answer: `UCP 600 Article 36 exists but it does NOT help you — it protects BANKS, not beneficiaries. Banks assume no liability for disruptions caused by events beyond their control, including strikes. The article also states that banks will not honour or negotiate under credits that expired during such interruptions.

An expired LC is dead. The bank has no authority to honour or negotiate after expiry, regardless of the reason.

Your practical options: request the buyer to have the issuing bank issue a NEW LC or amend the expired one (amendment of an expired credit is technically a new undertaking). If the buyer is willing, switch to an alternative payment method (open account, bank transfer) for this shipment. Check if the LC has any automatic extension clause (some LCs include "evergreen" clauses).

ICC Banking Commission opinions have consistently held that Art 36 does not suspend or extend credit expiry dates. The force majeure provision is one of the most misunderstood clauses in UCP 600.`,
    citations: [
      'UCP600 Article 36 — Force Majeure',
      'UCP600 Article 6 — Expiry Date and Place',
      'ICC Banking Commission Opinions on Art 36',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'bill-of-lading-vs-multimodal-transport-document',
    title: 'Bill of Lading vs Multimodal Transport Document — Can You Substitute?',
    description: 'If your LC calls for a "Bill of Lading" but your shipment is door-to-door, presenting a multimodal transport document is a discrepancy.',
    question: 'My LC calls for a Bill of Lading but the shipment is container door-to-door from Jebel Ali to Rotterdam. The shipping line will only issue a multimodal transport document. Can I present it?',
    answer: `Presenting a multimodal transport document against an LC that specifically calls for a "Bill of Lading" is a discrepancy risk you need to manage carefully.

UCP 600 Article 20 governs bills of lading — it requires the document to show shipment on board at the named port of loading, with named discharge port. UCP 600 Article 19 governs multimodal transport documents — a separate article with different requirements, covering movements by at least two different modes of transport.

If the LC says "Bill of Lading" the bank expects a document that satisfies Article 20 requirements. A multimodal document examined under Article 19 is a DIFFERENT document type.

Your practical options: request an LC amendment to call for "Transport Document" or "Multimodal Transport Document" instead of "Bill of Lading." Or ask the shipping line if they can issue a port-to-port B/L covering only the sea leg, with the inland transport arranged separately.

The LC amendment is the clean solution. Don't present and hope — the bank will examine against the LC terms, not your commercial reality.`,
    citations: [
      'UCP600 Article 19 — Multimodal Transport Document',
      'UCP600 Article 20 — Bill of Lading',
      'ISBP745 Paragraphs E1-E8 — Transport Documents',
      'Incoterms 2020 — Transport document compatibility',
    ],
    tags: ['UCP600', 'Transport'],
  },
  {
    slug: 'rcep-cumulation-rules-of-origin',
    title: 'RCEP Cumulation — Can You Combine Inputs from Multiple Countries?',
    description: 'RCEP allows full cumulation across all 15 member countries. Here\'s how it works for manufacturers using inputs from Japan, Malaysia, Thailand, and beyond.',
    question: 'I manufacture car brake pads in Thailand using steel from Japan and rubber from Malaysia. I want to export to South Korea under RCEP preferential tariff. Can I cumulate the Japanese and Malaysian inputs?',
    answer: `Yes, RCEP's full cumulation provision is designed exactly for this kind of multi-country supply chain. Under RCEP Chapter 3, Article 3.4, production processes carried out in any RCEP member country can be counted toward origin determination.

So your Japanese steel and Malaysian rubber are treated as originating inputs when assessing whether the finished brake pads qualify. The cumulated RCEP-origin inputs help you meet the Product Specific Rule threshold.

You still need to check the PSR for brake pads under their HS heading in the RCEP PSR Annex — this determines whether a change in tariff classification, regional value content, or specific process rule applies.

To claim the preferential tariff in South Korea, you'll need a Certificate of Origin (Form RCEP) issued by Thailand's competent authority or via an approved exporter declaration.

Keep your records tight — South Korea's customs can verify origin through written requests or verification visits. Make sure you can document the sourcing of the steel and rubber.`,
    citations: [
      'RCEP Chapter 3, Article 3.2 — Origin qualification',
      'RCEP Chapter 3, Article 3.4 — Full cumulation',
      'RCEP Chapter 3, Article 3.6 — De minimis (10% FOB)',
      'RCEP Chapter 3, Article 3.16 — Certificate of Origin',
    ],
    tags: ['FTA', 'RCEP'],
  },
  {
    slug: 'demand-guarantee-extend-or-pay-urdg-758',
    title: 'Extend or Pay — How URDG 758 Demand Guarantees Work',
    description: 'Under URDG 758, a guarantee is independent of the underlying contract. If the beneficiary demands extension or payment, the bank must comply.',
    question: 'The employer sent an extend-or-pay demand on my performance guarantee under URDG 758. My bank says they have to pay if I don\'t extend. Is that right? The underlying contract dispute is still in arbitration.',
    answer: `Your bank is essentially correct, and this is one of the hardest realities of URDG 758 guarantees.

The guarantee is independent of the underlying contract. The bank's obligation to pay is autonomous — it doesn't matter that your contract dispute is in arbitration. Under URDG 758 Article 23, the beneficiary is entitled to make an extend-or-pay demand.

Once a complying demand is presented, the bank must pay unless there is clear evidence of fraud — and that bar is extremely high. Courts in most jurisdictions will only restrain payment on a URDG guarantee in cases of clear fraud, not a contract dispute.

Can you stop the payment? Your only realistic route is a court injunction, and courts are very reluctant to intervene in guarantee payments precisely because the independence principle is the whole point of the instrument.

What you should do right now: decide quickly whether extending is commercially preferable to paying out. Extending the guarantee preserves the status quo while arbitration continues. Get legal advice immediately — this is time-critical.`,
    citations: [
      'URDG 758 Article 5(a) — Independence principle',
      'URDG 758 Article 23 — Extend or pay',
      'URDG 758 Article 15(a) — Complying demand requirements',
    ],
    tags: ['URDG 758', 'Guarantees'],
  },
  {
    slug: 'usmca-automotive-rules-of-origin-75-rvc',
    title: 'USMCA Automotive Rules of Origin — The 75% RVC Threshold',
    description: 'USMCA has the strictest automotive origin rules of any trade agreement. 75% regional value content, labor value content requirements, and steel/aluminum sourcing.',
    question: 'We assemble passenger vehicles in Mexico using engines from the US and transmissions from Japan. What\'s the RVC threshold under USMCA, and does the Japanese transmission disqualify us?',
    answer: `Your finished passenger vehicle needs 75% Regional Value Content on a net cost basis to qualify as originating under USMCA. That's the fully phased-in threshold as of 2023.

The Japanese transmission does not automatically disqualify you, but its value counts as non-originating in your RVC calculation. The US-sourced engines benefit from USMCA accumulation — value from any of the three member countries counts toward the 75% threshold.

Two additional requirements beyond RVC: Labor Value Content (LVC) requires a portion of the vehicle's value to come from workers earning at least $16/hour. And 70% of your steel and aluminum purchases must be sourced from North America.

So the Japanese transmission is a headwind, not a dealbreaker — it depends on the math. If the transmission is 10-15% of net cost and everything else is North American, you're likely fine. If it's a larger share and you have other non-originating inputs, it gets tight.

You'll need a full RVC calculation before you can certify origin with confidence.`,
    citations: [
      'USMCA Chapter 4, Appendix — 75% RVC for passenger vehicles',
      'USMCA Chapter 4, Article 4.4 — Accumulation',
      'USMCA Chapter 4, Article 4.18 — Labor Value Content',
      'USMCA Chapter 4 — Steel and aluminum sourcing (70%)',
    ],
    tags: ['FTA', 'USMCA'],
  },
  {
    slug: 'backdating-bill-of-lading-fraud',
    title: 'Backdating a Bill of Lading — Why Your Freight Forwarder Is Wrong',
    description: 'A backdated B/L is document fraud. The cost of a discrepancy is a fee. The cost of fraud is your business.',
    question: 'My LC\'s latest shipment date was March 15. The goods loaded on March 18. My freight forwarder says he can issue the B/L with an on-board date of March 14 to fix the problem. Is there any risk?',
    answer: `Do not do this. What your freight forwarder is proposing is fraud — specifically, the backdating of a shipping document to misrepresent when goods were actually loaded.

A B/L is a document of title and a legal instrument. Knowingly issuing or presenting one with a false on-board date exposes you, your forwarder, and potentially your bank to criminal prosecution in most jurisdictions, cargo insurance voided (insurers don't cover fraudulently documented shipments), bank blacklisting, and civil liability.

Under general trade law, knowingly presenting false documents is fraud — it doesn't matter that UCP600 doesn't address it directly. The on-board date is a statement of fact. If the vessel's port records show loading on March 18, the backdated B/L will contradict them.

The correct approach: present documents with the real March 18 date and request the applicant to waive the late shipment discrepancy. Or negotiate an LC amendment extending the latest shipment date.

The cost of a discrepancy is a fee and a negotiation. The cost of fraud is your business, your reputation, and potentially your freedom.`,
    citations: [
      'UCP600 Article 20(a)(ii) — On-board date requirement',
      'ISBP745 E3 — B/L on-board notation',
      'UCP600 Article 16 — Discrepancy handling',
    ],
    tags: ['UCP600', 'Fraud'],
  },
]
