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
  {
    slug: 'ucp600-article-16-discrepancy-refusal',
    title: 'Your Bank Refused Your LC Documents — Now What? UCP 600 Article 16 Explained',
    description: 'When a bank finds discrepancies in your LC presentation, Article 16 dictates exactly what happens next. The bank\'s obligations are strict — and so are yours.',
    question: 'I presented documents under my LC and the bank sent a refusal notice listing three discrepancies. I disagree with two of them. What are my options? How does UCP600 handle discrepancies?',
    answer: `Under UCP 600 Article 16, when a bank determines that a presentation does not comply, it may refuse to honour or negotiate. But the bank must follow a rigid procedure — and if it doesn't, it loses the right to claim non-compliance.

The bank has a maximum of five banking days after the day of presentation to examine documents and decide. If it refuses, it must give a single notice of refusal to the presenter, by telecommunication or other expeditious means, no later than the close of the fifth banking day. That notice must state each discrepancy for which the bank refuses, and whether it is holding documents pending further instructions, or returning them.

If the bank fails to act within five banking days, or sends a defective notice (missing discrepancies, no disposition statement), it is precluded from claiming non-compliance. This is the "preclusion rule" — one of the most powerful protections for beneficiaries under UCP 600.

Your options when you receive a refusal: you can correct the documents and re-present (if time allows before expiry). You can ask the bank to seek a waiver from the applicant — the applicant can choose to accept the discrepancies. Or you can challenge the discrepancies if they're invalid — banks do sometimes get it wrong.

Check the five-day clock carefully. If the bank sent the refusal on day six, they're precluded — and you should push back.`,
    citations: [
      'UCP600 Article 16(a) — Right to refuse',
      'UCP600 Article 16(b) — Single notice of refusal',
      'UCP600 Article 16(c) — Notice requirements and disposition',
      'UCP600 Article 16(f) — Preclusion rule',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'compliant-commercial-invoice-isbp745',
    title: 'What Makes a Commercial Invoice Compliant Under an LC? ISBP 745 Explained',
    description: 'The commercial invoice is the most scrutinised document in any LC presentation. ISBP 745 sets out exactly what banks check — and where most discrepancies hide.',
    question: 'How does ISBP 745 define a compliant commercial invoice? I keep getting discrepancies on my invoices and I don\'t understand what the bank is looking for.',
    answer: `The commercial invoice is where most LC presentations fail — and ISBP 745 paragraphs C1 through C14 spell out exactly what banks examine.

First, the invoice must appear to have been issued by the beneficiary named in the credit. It must be made out to the applicant (or as the credit requires). It must describe the goods, services, or performance in a way that corresponds to the description in the credit — and this is where it gets strict. The goods description on the invoice must mirror the LC terms. Other documents can use a general description consistent with the LC, but the invoice must match.

The invoice amount must not exceed the amount available under the credit. If the LC specifies a unit price, the invoice must show that unit price. Quantity and unit price multiplied must equal the invoiced amount.

The invoice need not be signed unless the credit requires it. It need not be dated before the transport document, but it must be dated no later than the date of presentation.

Common traps: showing trade terms (FOB, CIF) differently from the LC. Showing a description that paraphrases instead of mirrors the credit. Including charges not contemplated by the credit terms. Using abbreviations the LC doesn't use.

The safest approach: copy the goods description from the LC word for word onto your invoice.`,
    citations: [
      'ISBP745 Paragraphs C1-C14 — Commercial Invoice',
      'UCP600 Article 18(a) — Invoice issued by beneficiary',
      'UCP600 Article 18(c) — Goods description must correspond',
      'ISBP745 Paragraph C3 — Goods description correspondence',
    ],
    tags: ['UCP600', 'ISBP745'],
  },
  {
    slug: 'transferable-lc-invoice-substitution-ucp600',
    title: 'Transferable LC — Can You Substitute Your Invoice to Keep Your Margin?',
    description: 'Under UCP 600 Article 38, the first beneficiary of a transferable LC can substitute their invoice. But the mechanics are precise and the risks are real.',
    question: 'My buyer issued a transferable LC in my favour. I want to transfer it to my supplier. My supplier will ship directly to the buyer. But I want to keep my commission — can I substitute my invoice for a higher amount than my supplier\'s to capture the margin?',
    answer: `Yes, invoice substitution is the standard mechanism for capturing your margin in a transferable LC — but it works the opposite way from what you described.

Under UCP 600 Article 38(h), the first beneficiary (you) has the right to substitute your own invoice and draft for those of the second beneficiary (your supplier). Your invoice will show the FULL LC amount (what the buyer pays). Your supplier's invoice shows their lower price. The difference is your margin.

The mechanics: your supplier presents their documents to the transferring bank. The bank notifies you that documents are ready. You then substitute your invoice (and draft, if any) for your supplier's. The bank forwards your invoice — not your supplier's — to the issuing bank.

Critical timing: if you fail to substitute your invoice on first demand, the transferring bank has the right to forward the second beneficiary's documents as received. You'd lose your margin and the buyer would see your supplier's price.

Two things to watch: your substituted invoice amount cannot exceed the original credit amount. And the description of goods must match exactly — you can only change the price, not the goods.

This is the whole point of transferable credits — you act as a middleman without the buyer and supplier knowing each other's pricing.`,
    citations: [
      'UCP600 Article 38(h) — Invoice substitution right',
      'UCP600 Article 38(a) — Definition of transferable credit',
      'UCP600 Article 38(d) — Transfer conditions',
      'UCP600 Article 38(i) — First beneficiary failure to substitute',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'documentary-collections-dp-release-before-payment',
    title: 'D/P Collections — Can the Bank Release Documents Before Payment?',
    description: 'Under URC 522, documents against payment means exactly that. The presenting bank cannot release documents for inspection before the buyer pays.',
    question: 'I\'m shipping coffee to a buyer in Germany on D/P terms. I gave my bank the documents with instructions to release them against payment. The buyer\'s bank says the buyer wants to inspect the coffee before paying. Can the German bank release the documents for inspection before payment?',
    answer: `No. Under URC 522, D/P (documents against payment) means the presenting bank must not release documents until payment is received. This is non-negotiable.

URC 522 Article 7(a) states that collections should not contain bills of exchange payable at a future date with instructions that documents be delivered against payment. The rules are explicit: D/P means payment first, documents second.

The buyer's request to "inspect before paying" is commercially understandable but documentarily impermissible under your collection instructions. If the German bank releases documents before payment, they breach the collection instruction and become liable to you.

The buyer cannot inspect the actual goods using the documents — they need the bill of lading to take delivery from the shipping line. So releasing documents "for inspection" effectively gives them control of the goods without paying.

Your options: refuse the request and insist on D/P terms as instructed. If the buyer genuinely needs to inspect quality, suggest a pre-shipment inspection at origin (before you ship) — common in commodity trades. Or negotiate a change to D/A (documents against acceptance) if you trust the buyer, though this shifts risk to you.

The whole point of D/P is that you retain control of the goods through the documents until you have the money.`,
    citations: [
      'URC 522 Article 7(a) — Release of documents',
      'URC 522 Article 1 — Application of URC',
      'URC 522 Article 10 — Payment without delay',
    ],
    tags: ['URC 522', 'Collections'],
  },
  {
    slug: 'standby-lc-isp98-vs-urdg-758',
    title: 'Standby LC — ISP98 or URDG 758? Can You Choose?',
    description: 'Standby letters of credit are not locked to ISP98. They can be governed by URDG 758, UCP 600, or ISP98 — and the choice matters more than most people realise.',
    question: 'We received a standby letter of credit from a US bank that says "subject to ISP98." Our client wants it governed by URDG 758. Can we have a standby subject to URDG instead of ISP98? Or do standbys always follow ISP98?',
    answer: `Standbys do not always follow ISP98. A standby letter of credit can be governed by ISP98, URDG 758, or even UCP 600 — it depends on what the issuing bank agrees to state in the instrument.

ISP98 (International Standby Practices) was specifically designed for standbys and is the default choice of most US and many international banks. URDG 758 was designed for demand guarantees but explicitly states in Article 1(a) that it applies to demand guarantees "including standby letters of credit to which it is made applicable."

So yes, you can request a standby subject to URDG 758 — but the issuing bank must agree. US banks overwhelmingly prefer ISP98. Asking a US bank to issue under URDG 758 may meet resistance or require negotiation.

Key differences that matter: under ISP98, the examination period is 3 business days (extendable to 7 by statement in the standby). Under URDG 758, it's 5 business days. URDG 758 has the extend-or-pay mechanism (Article 23) — ISP98 does not. ISP98 has more detailed rules about standby-specific issues like syndication and transfer.

The practical question: what problem are you solving by switching? If the beneficiary wants extend-or-pay rights, URDG 758 makes sense. If it's a standard financial standby, ISP98 is well-understood and battle-tested.`,
    citations: [
      'ISP98 Rule 1.01 — Scope and application',
      'URDG 758 Article 1(a) — Application to standbys',
      'ISP98 Rule 5.01 — Examination period (3 business days)',
      'URDG 758 Article 20(a) — Examination period (5 business days)',
    ],
    tags: ['ISP98', 'URDG 758'],
  },
  {
    slug: 'red-clause-lc-advance-payment',
    title: 'Red Clause LC — How Pre-Shipment Advance Payment Works',
    description: 'A red clause LC lets the beneficiary draw an advance before shipping. The issuing bank pays — and the applicant carries the risk if the supplier doesn\'t perform.',
    question: 'My supplier in Kenya needs advance payment to harvest and process the coffee before shipment. Someone mentioned a "red clause LC" that allows this. How does it work? Is the advance payment at risk if the supplier doesn\'t ship?',
    answer: `A red clause LC includes a special clause (historically printed in red ink) that authorises the advising or nominated bank to make an advance payment to the beneficiary before they present shipping documents.

How it works: the LC states a maximum advance amount and the conditions for drawing it — typically, the beneficiary provides a simple receipt or undertaking to ship the goods. The beneficiary gets cash upfront to fund production, harvesting, or procurement. When they ship, they present the full set of documents and the advance is deducted from the final payment.

The critical risk point: if the supplier takes the advance and fails to ship, the issuing bank is still obligated to reimburse the bank that made the advance. The issuing bank then looks to the applicant (buyer) for reimbursement. In other words, the applicant bears the risk of the supplier not performing.

This is why red clause LCs are rare outside established trading relationships — particularly in commodities like coffee, wool, and cotton where the supplier genuinely needs working capital to prepare the goods.

Green clause LCs go one step further: they allow the advance against warehouse receipts, giving the buyer some security over stored goods. A red clause offers no such collateral — just the beneficiary's promise to ship.

Make sure your buyer understands they're effectively providing an unsecured advance to the supplier, guaranteed by their own bank.`,
    citations: [
      'UCP600 Article 2 — Definitions (Credit)',
      'UCP600 Article 7 — Issuing bank undertaking',
      'UCP600 Article 12 — Nomination and undertaking',
    ],
    tags: ['UCP600', 'Trade Finance'],
  },
  {
    slug: 'fob-shanghai-vs-fob-shanghai-port-discrepancy',
    title: '"FOB Shanghai" vs "FOB Shanghai Port" — Is the Bank Manufacturing Discrepancies?',
    description: 'When your invoice says "FOB Shanghai" but the LC says "FOB Shanghai Port," the bank will call it a discrepancy. They\'re not wrong — even if you think they are.',
    question: 'My bank rejected my supplier\'s documents because the commercial invoice shows "FOB Shanghai" but the LC says "FOB Shanghai Port." The word "Port" is missing. This is obviously the same place! Isn\'t the bank manufacturing discrepancies to avoid paying?',
    answer: `The bank is not manufacturing a discrepancy — they're applying UCP 600 Article 14(d), which requires documents to be examined on their face and that the data in any document must not conflict with data in that document, any other stipulated document, or the credit.

Under ISBP 745, the goods description on the commercial invoice must correspond with the description in the credit. If the LC says "FOB Shanghai Port" and your invoice says "FOB Shanghai," the bank sees a data difference. Banks examine documents on their face — they don't interpret whether two terms are commercially identical.

Is "FOB Shanghai" the same as "FOB Shanghai Port" in the real world? Almost certainly yes. But LC practice is not about commercial reality — it's about documentary compliance. The bank's job is to check whether the documents say what the LC says they should say. Adding or omitting a word is a data discrepancy.

ICC Banking Commission opinions have consistently held that banks are not required to apply commercial knowledge or geography to interpret terms. If the LC says "Port," the document must say "Port."

The fix is simple for next time: copy the trade terms from the LC exactly — character for character — onto the invoice. For this presentation, request a waiver from the applicant through the bank. If the buyer accepts the discrepancy, the bank will process payment.

The lesson: in LC practice, precision is not pedantry — it's the system working as designed.`,
    citations: [
      'UCP600 Article 14(d) — Data consistency across documents',
      'UCP600 Article 18(c) — Invoice goods description',
      'ISBP745 Paragraph C3 — Correspondence of description',
      'ISBP745 Paragraph A22 — Misspelling and typing errors',
    ],
    tags: ['UCP600', 'ISBP745'],
  },
  {
    slug: 'lc-amendment-acceptance-ucp600-article-10',
    title: 'LC Amendment — Do You Need to Accept Before Shipping?',
    description: 'Under UCP 600 Article 10, an amendment is not binding until the beneficiary accepts it. Silence is not acceptance — but shipping under amended terms might be.',
    question: 'The issuing bank sent an LC amendment extending the shipment date by 30 days and increasing the amount by $50,000. I haven\'t formally accepted the amendment yet. Can I ship under the amended terms, or do I need to accept first? What happens if I ship under original terms while the amendment is outstanding?',
    answer: `Under UCP 600 Article 10(c), an amendment does not bind the beneficiary until they communicate acceptance to the bank that advised the amendment. Until you accept, the credit terms remain as they were before the amendment.

However — and this is the practical trap — Article 10(c) also states that a beneficiary's presentation that complies with the credit AND any not-yet-accepted amendment will be deemed to be notification of acceptance. In other words, if you ship using the extended dates and present documents that only comply with the amended terms, you've implicitly accepted the amendment.

So you have three options: formally accept the amendment (notify the advising bank), then ship under the new terms. Or reject the amendment and ship under the original terms — within the original shipment date and amount. Or do nothing — the amendment sits in limbo until you act or your presentation resolves it.

You cannot cherry-pick. Article 10(e) states that partial acceptance of an amendment is not allowed and will be deemed rejection. If the amendment extends the shipment date AND increases the amount, you accept both or neither.

If you ship under the original terms, ensure everything complies with the pre-amendment credit. If you ship under amended terms without formally accepting, your compliant presentation acts as acceptance.

Best practice: accept or reject promptly. Ambiguity helps nobody.`,
    citations: [
      'UCP600 Article 10(a) — Amendment consent requirements',
      'UCP600 Article 10(c) — Beneficiary acceptance',
      'UCP600 Article 10(e) — Partial acceptance not allowed',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'deferred-payment-lc-forfaiting-early-payment',
    title: 'Deferred Payment LC — Can You Get Paid Before Maturity?',
    description: 'Your deferred payment LC means waiting 90 or 180 days for payment. Forfaiting lets you sell that receivable for immediate cash — but know the risks.',
    question: 'I have a deferred payment LC — payment is due 90 days after B/L date. I presented documents 2 weeks ago and the issuing bank confirmed the presentation complies. But I need the money now, not in 76 days. Can the issuing bank pay me early? Can anyone pay me early?',
    answer: `The issuing bank is not obligated to pay you before maturity — their undertaking under UCP 600 Article 7(c) is to pay at maturity. However, they may agree to a discounted early payment as a commercial arrangement. This is at their discretion.

Your better option is forfaiting — selling the deferred payment receivable to a third party (a forfaiter) at a discount. Since the issuing bank has already confirmed the presentation complies, you have an irrevocable payment obligation from the issuing bank maturing on a known date. That's a tradeable asset.

How forfaiting works: a forfaiter (bank or specialised firm) buys your receivable at a discount reflecting the time value and the issuing bank's credit risk. You get cash immediately, minus the discount. The forfaiter collects from the issuing bank at maturity. Critically, forfaiting is WITHOUT RECOURSE — once the forfaiter buys the receivable, the risk is theirs.

Under URF 800 (ICC Uniform Rules for Forfaiting), the forfaiter requires the payment obligation (the LC or accepted draft), evidence of compliant presentation, and any required transfer documentation.

The discount rate depends on the issuing bank's country risk, credit rating, the tenor (76 days in your case is short — good for you), and the currency.

For a 76-day tenor with a compliant presentation already confirmed, forfaiting should be straightforward. Contact your bank's trade finance desk or a forfaiting house.`,
    citations: [
      'UCP600 Article 7(c) — Issuing bank deferred payment undertaking',
      'UCP600 Article 12(b) — Nominated bank undertaking',
      'URF 800 Article 3 — Forfaiting transaction requirements',
      'URF 800 Article 7 — Without recourse',
    ],
    tags: ['UCP600', 'URF 800', 'Forfaiting'],
  },
  {
    slug: 'clean-bill-of-lading-damaged-packaging',
    title: 'Is a "Damaged Carton" Remark on the B/L a Discrepancy?',
    description: 'A clause noting damaged packaging makes the B/L "unclean." Banks will refuse it — even if the goods inside are perfectly fine.',
    question: 'My bank says my B/L is not clean because there\'s a remark about "damaged carton." But the carton is only the packaging, not the goods. The goods inside are perfect. Can the bank really reject for this?',
    answer: `Yes, the bank can and will reject it. Under UCP 600 Article 27, banks will only accept a clean transport document — one that bears no clause or notation expressly declaring a defective condition of the goods AND/OR THE PACKAGING.

The word "packaging" is explicit in the rule. A notation about "damaged carton," "torn packaging," "crushed box," or similar remarks makes the B/L claused (unclean), regardless of whether the goods inside are undamaged.

This is one of the most frustrating discrepancies for exporters because the distinction between goods and packaging feels commercially irrelevant. But the rule exists for a reason — the bank and the buyer cannot verify the condition of goods inside damaged packaging from the documents alone.

ISBP 745 reinforces this: a transport document bearing a clause or notation that expressly declares a defective condition of the packaging is not acceptable. The carrier's remark is a statement of fact at the time of loading, and the bank must take it at face value.

Your options: have the shipping line remove the remark and issue a clean B/L — this requires the carrier to be satisfied the goods are properly packed. If the damage happened at the port, have the goods repacked before loading and get a clean B/L. If the claused B/L is already issued, present it and request a discrepancy waiver from the applicant.

Prevention for next time: inspect packaging at the port before the carrier loads. Once the remark is on the B/L, it's too late.`,
    citations: [
      'UCP600 Article 27 — Clean transport document',
      'ISBP745 Paragraph D2 — Clean transport documents',
      'UCP600 Article 20(a) — Bill of lading requirements',
    ],
    tags: ['UCP600', 'Transport'],
  },
]
