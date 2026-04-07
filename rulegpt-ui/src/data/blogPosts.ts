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
  {
    slug: 'eucp-mixed-presentation-electronic-paper',
    title: 'eUCP — Can You Mix Electronic and Paper Documents in an LC Presentation?',
    description: 'If your LC is subject to eUCP, you can present electronic documents. But mixing paper and electronic in one presentation has specific rules.',
    question: 'Our client wants to present LC documents electronically. The LC is subject to UCP600 but doesn\'t mention eUCP. Can they present electronic documents anyway? What if some documents are electronic and some are paper — is a mixed presentation allowed?',
    answer: `If the LC is subject to UCP 600 but does not incorporate eUCP, electronic presentation is not permitted. The credit must expressly state that it is subject to the Supplement to UCP 600 for Electronic Presentation (eUCP Version 2.0) for electronic documents to be acceptable.

When eUCP does apply, mixed presentations — partly electronic, partly paper — are explicitly allowed. eUCP Article e5 states that a presentation may consist of only electronic records, only paper documents, or a combination of both. This is one of the key practical features of eUCP.

Each electronic record must be in a format that the credit specifies, or if the credit is silent on format, in a format that can be authenticated and examined. The electronic record must be capable of being examined for compliance with the credit terms, just like a paper document.

Important: the 21-day presentation period and other UCP 600 time limits still apply. The place for presentation of electronic records is the electronic address specified in the credit. For paper documents in a mixed presentation, the physical place specified in the credit applies.

If your client wants to present electronically, the first step is to request an LC amendment incorporating eUCP 2.0 and specifying acceptable formats and the electronic address for presentation. Without that amendment, electronic documents will be refused.`,
    citations: [
      'eUCP 2.0 Article e1 — Scope of eUCP',
      'eUCP 2.0 Article e5 — Mixed presentations',
      'eUCP 2.0 Article e3 — Format',
      'UCP600 Article 6(d)(ii) — Place for presentation',
    ],
    tags: ['eUCP', 'UCP600'],
  },
  {
    slug: 'swift-mt700-field-39a-about-tolerance',
    title: 'SWIFT MT700 "ABOUT" in Field 39A — Does the 10% Tolerance Apply?',
    description: 'When an LC shows "ABOUT" in the tolerance field but an exact amount in 32B, UCP 600 Article 30(a) governs. The answer depends on where "about" appears.',
    question: 'I\'m examining an LC received via SWIFT MT700. Field 39A shows "ABOUT" but Field 32B has an exact amount of USD 500,000.00 with no tolerance indicator. Field 39B is empty. Is the amount subject to the 10% "about" tolerance or is the exact amount the limit?',
    answer: `The 10% tolerance applies. Under UCP 600 Article 30(a), the word "about" used in connection with the amount of the credit allows a tolerance not to exceed 10% more or 10% less than the amount to which it refers.

Field 39A in the MT700 is specifically the "Percentage Credit Amount Tolerance" field. When it shows "ABOUT," it is expressing a tolerance on the credit amount in Field 32B. So your credit amount is USD 500,000.00 with a +/- 10% tolerance, meaning drawings from USD 450,000 to USD 550,000 would be within the credit terms.

This is a common source of confusion because Field 32B shows a precise figure. But the SWIFT message structure separates the base amount (32B) from the tolerance (39A). They work together — the tolerance in 39A modifies the amount in 32B.

If instead the LC used Field 39B (Maximum Credit Amount), that would be an absolute cap — no tolerance above that figure regardless of what 39A says.

One important nuance: the 10% tolerance on the amount does not automatically create a 10% tolerance on quantity. If the credit specifies a quantity in units (not "about"), the quantity must be exact (subject to the 5% tolerance under Article 30(b) only if the credit doesn't state quantity in units).

Check the quantity fields separately from the amount tolerance.`,
    citations: [
      'UCP600 Article 30(a) — "About" tolerance (10%)',
      'UCP600 Article 30(b) — Quantity tolerance (5%)',
      'SWIFT MT700 Field 39A — Percentage credit amount tolerance',
      'SWIFT MT700 Field 39B — Maximum credit amount',
    ],
    tags: ['UCP600', 'SWIFT'],
  },
  {
    slug: 'back-to-back-lc-document-mismatch',
    title: 'Back-to-Back LC — What If Your Supplier\'s Documents Don\'t Match the Master LC?',
    description: 'In a back-to-back LC structure, the second beneficiary\'s documents must work for both credits. When descriptions don\'t match, you have a problem.',
    question: 'I have two LCs — a master LC from my buyer and a back-to-back LC I opened for my supplier. My supplier shipped and I received their documents under the back-to-back LC. But when I compare their documents with what the master LC requires, the goods description doesn\'t match exactly. Can I amend my supplier\'s documents before presenting under the master LC?',
    answer: `You cannot amend your supplier's documents — but you can substitute specific documents, and that's the standard mechanism for back-to-back LCs.

As the first beneficiary, you are entitled to substitute your own invoice (and draft, if applicable) for your supplier's. This is the same principle as transferable LC invoice substitution under Article 38, applied commercially in back-to-back structures. Your substituted invoice must match the master LC's goods description exactly.

However, you can only substitute invoices and drafts. You cannot alter the bill of lading, certificate of origin, inspection certificate, or any other third-party document. If those documents show a goods description that conflicts with the master LC, you have a discrepancy that substitution cannot fix.

This is the fundamental risk of back-to-back LCs: the second credit's terms must be carefully structured so that the documents produced under it will also satisfy the first credit. If you opened the back-to-back LC with a different goods description than the master, the mismatch was baked in from the start.

Your options now: present under the master LC with the discrepancy and request a waiver from the applicant. Or ask your supplier to have the shipping line or issuer of the conflicting document reissue it with corrected wording — if timing permits.

Prevention: when opening the back-to-back LC, mirror the master LC's goods description word for word.`,
    citations: [
      'UCP600 Article 38(h) — Invoice substitution',
      'UCP600 Article 14(d) — Data consistency',
      'UCP600 Article 18(c) — Invoice goods description',
      'ISBP745 Paragraph C3 — Description correspondence',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'insurance-coverage-short-cif-110-percent',
    title: 'Insurance Coverage Below 110% CIF Value — Is That a Discrepancy?',
    description: 'UCP 600 Article 28 requires insurance coverage of at least 110% of CIF value. Fall short and the bank will refuse — even if the premium is astronomical.',
    question: 'I\'m shipping LNG from Qatar to Pakistan. My LC requires marine cargo insurance including war risk and SRCC. The insurance broker says war risk premium for Pakistan has tripled since last month. If I get the insurance but it doesn\'t cover the full CIF value plus 10% because the premium is too high, can I present with lower coverage?',
    answer: `No. Under UCP 600 Article 28(f)(ii), the insurance document must indicate a minimum coverage of 110% of the CIF or CIP value of the goods. If the credit doesn't specify the coverage amount, this 110% minimum is mandatory. There is no exception for high premiums.

The bank will examine the insurance certificate on its face. If the insured amount is less than 110% of the CIF invoice value, the presentation is discrepant. The reason for the shortfall — premium cost, market conditions, availability — is irrelevant to the documentary examination.

War risk and SRCC (Strikes, Riots and Civil Commotion) are separate coverage components. If the LC specifically requires them, they must appear on the insurance document as covered risks. An insurance certificate that covers marine risks but excludes war risk when the LC requires it is discrepant.

Your practical options: absorb the higher premium and obtain full coverage — this is the cost of CIF compliance. Negotiate with the buyer to amend the LC to reduce the insurance requirement (unlikely if the buyer needs full coverage). Request the buyer to switch the trade terms to FOB, making insurance the buyer's responsibility. Or present with the shortfall and seek a discrepancy waiver — risky if the buyer uses it as leverage.

The premium increase is a commercial problem. The 110% rule is a documentary requirement. They live in different worlds.`,
    citations: [
      'UCP600 Article 28(f)(ii) — Minimum 110% coverage',
      'UCP600 Article 28(h) — War risk and SRCC',
      'UCP600 Article 28(a) — Insurance document requirements',
      'ISBP745 Paragraphs K1-K15 — Insurance documents',
    ],
    tags: ['UCP600', 'Insurance'],
  },
  {
    slug: 'ucp600-five-banking-days-examination',
    title: 'The 5 Banking Day Rule — Can You Demand Payment If the Bank Is Late?',
    description: 'Under UCP 600 Article 14(b), banks get a maximum of 5 banking days to examine documents. Exceed that and the preclusion rule kicks in.',
    question: 'My advising bank is taking too long to check my documents. It\'s been 7 banking days. Under UCP600, the bank only has 5 banking days. Can I demand payment since they\'ve exceeded the time limit?',
    answer: `Not quite — but you're close to a powerful argument. Under UCP 600 Article 14(b), a nominated bank, confirming bank, or issuing bank has a maximum of five banking days following the day of presentation to determine whether a presentation is complying.

If the bank fails to act within five banking days, the preclusion rule under Article 16(f) applies: the bank is precluded from claiming that the documents do not constitute a complying presentation. In other words, the bank loses the right to refuse — not because it must pay automatically, but because it can no longer raise discrepancies.

Important distinction: the advising bank and the issuing/confirming bank have different roles. If your advising bank is also the nominated bank for examination, the five-day rule applies. If it's merely advising (forwarding the LC), it may not be bound by Article 14(b) in the same way — its role is to check apparent authenticity, not examine for compliance.

Also, "banking days" excludes weekends and public holidays at the place of the bank doing the examination. Count carefully — seven calendar days might be exactly five banking days depending on the week.

If the bank genuinely exceeded five banking days for examination and then tries to refuse, cite Article 16(f) preclusion. This is the strongest card a beneficiary holds under UCP 600.`,
    citations: [
      'UCP600 Article 14(b) — 5 banking days for examination',
      'UCP600 Article 16(f) — Preclusion rule',
      'UCP600 Article 2 — Definition of banking day',
      'UCP600 Article 9 — Advising bank obligations',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'revocable-letter-of-credit-ucp600',
    title: 'Can a Bank Issue a Revocable Letter of Credit Under UCP 600?',
    description: 'UCP 600 eliminated revocable credits entirely. Every credit subject to UCP 600 is irrevocable — the word doesn\'t even need to appear.',
    question: 'Can a bank issue a revocable letter of credit under UCP600? My textbook mentions revocable credits but I can\'t find the article.',
    answer: `No. UCP 600 eliminated revocable credits entirely. Under UCP 600 Article 2, a credit is defined as "any arrangement, however named or described, that is irrevocable." There is no provision for revocable credits.

This was a deliberate change from UCP 500, where both revocable and irrevocable credits existed. Under the old UCP 500 Article 6, a credit could be revocable or irrevocable, and if the credit didn't state which, it was deemed irrevocable. In practice, revocable credits were almost never used because they offered the beneficiary no security — the issuing bank could amend or cancel without notice.

UCP 600, effective July 2007, simply removed the concept. Article 3 states that a credit is irrevocable even if there is no indication to that effect. You don't need to write "irrevocable" on the credit — it's irrevocable by definition under UCP 600.

Your textbook is likely referencing UCP 500 or earlier versions. Any credit issued after July 2007 subject to UCP 600 cannot be revocable. If someone tries to issue a "revocable LC subject to UCP 600," the instrument is contradictory — UCP 600 doesn't recognise the concept.

If a bank wants the ability to cancel a credit, they would need to structure it outside of UCP 600 — which would significantly reduce its commercial value and marketability.`,
    citations: [
      'UCP600 Article 2 — Definition of credit (irrevocable)',
      'UCP600 Article 3 — Interpretations (irrevocable by default)',
      'UCP600 Article 10(a) — Amendment requires agreement',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'gsp-form-a-vs-rex-eu-preferential-tariff',
    title: 'GSP Form A Is Being Phased Out — What Replaces It for EU Exports?',
    description: 'The EU replaced GSP Form A with the REX self-certification system. If your LC still requires Form A, you may need an amendment.',
    question: 'I export garments from Cambodia to the EU using GSP Form A for preferential tariff. My buyer says the EU is phasing out Form A and replacing it with REX. My LC still requires "GSP Form A issued by competent authority." Can I present a REX self-certification statement instead?',
    answer: `You cannot present a REX statement if the LC specifically requires "GSP Form A issued by competent authority." The bank examines documents against the LC terms, not against what trade regulations currently require. A REX statement is a fundamentally different document — it's a self-certification by a registered exporter, not a certificate issued by a government authority.

Your buyer is correct about the regulatory change. The EU has been transitioning GSP beneficiary countries from the Form A system (certificate issued by a competent government authority) to the REX system (self-certification by exporters registered in a database). Cambodia transitioned to REX in 2020.

But regulatory reality and LC documentary requirements are separate universes. The LC says what it says. If it requires Form A, the bank needs Form A. Presenting a REX statement against a Form A requirement is a discrepancy.

Your options: request an LC amendment changing the document requirement from "GSP Form A" to "Statement on origin by a registered exporter (REX)" or to a more general "proof of preferential origin." This is the clean solution. Or present the REX statement and request a discrepancy waiver — the buyer presumably knows Form A is no longer available and should accept.

Flag this to your buyer immediately. Many LCs issued for GSP countries still contain outdated Form A language — it's a common oversight.`,
    citations: [
      'EU GSP Regulation 978/2012 — Preferential origin rules',
      'EU REX Regulation 2015/2447 — Registered exporter system',
      'UCP600 Article 14(a) — Examination on face of documents',
      'UCP600 Article 14(d) — Data consistency with credit terms',
    ],
    tags: ['FTA', 'EU GSP'],
  },
  {
    slug: 'urdg-758-guarantee-reduction-completed-work',
    title: 'Can You Reduce a URDG 758 Guarantee as Work Progresses?',
    description: 'Under URDG 758, a guarantee amount can only be reduced if the guarantee text provides for it. Completed work alone doesn\'t reduce your exposure.',
    question: 'I have a performance guarantee for 10% of contract value. The project is 70% complete and accepted by the employer. Under URDG 758, can I ask for the guarantee amount to be reduced proportionally to reflect completed work? The guarantee text doesn\'t mention reduction.',
    answer: `If the guarantee text doesn't provide for reduction, the amount stays at 100% until expiry — regardless of how much work you've completed.

Under URDG 758 Article 25(a), the amount of a guarantee is reduced only as provided in the guarantee itself, or by presentation of a document specified in the guarantee for that purpose, or by an amendment agreed between all parties. There is no automatic reduction based on project progress.

This is one of the harshest realities of demand guarantees: you can be 99% complete, but the beneficiary can still demand the full guarantee amount if you haven't built reduction mechanics into the guarantee text.

The guarantee is independent of the underlying contract. The fact that the employer has accepted 70% of the work is a CONTRACT matter, not a GUARANTEE matter. The guarantee doesn't know or care about contract progress.

Your options now: request the beneficiary to agree to an amendment reducing the guarantee amount — they're under no obligation to agree. Or negotiate a partial release if your guarantee text happens to include a reduction clause you may have overlooked (check carefully).

For future contracts: always insist on a reduction clause in the guarantee text. Standard wording links reductions to milestone certificates or progress payment certificates. For example: "The guarantee amount shall be reduced by the value stated in each interim payment certificate accepted by the employer." Without such a clause, your bank's obligation remains at the full amount.`,
    citations: [
      'URDG 758 Article 25(a) — Reduction of guarantee amount',
      'URDG 758 Article 25(b) — Reduction by presentation',
      'URDG 758 Article 5 — Independence of guarantee',
      'URDG 758 Article 11 — Amendments',
    ],
    tags: ['URDG 758', 'Guarantees'],
  },
  {
    slug: 'lc-currency-depreciation-who-bears-risk',
    title: 'Your LC Currency Crashed — Do You Still Have to Ship at the Original Amount?',
    description: 'When the LC currency depreciates sharply between issuance and shipment, the beneficiary bears the exchange rate risk. The LC amount doesn\'t auto-adjust.',
    question: 'My LC is denominated in Egyptian Pounds. When the LC was issued, EGP was 30 to the dollar. Now it\'s 50 to the dollar. My goods cost hasn\'t changed in dollar terms but the EGP amount in the LC is now worth 40% less than when we agreed the deal. The LC amount hasn\'t been amended. Do I have to ship at the original EGP amount?',
    answer: `Yes — the LC amount is fixed in the currency stated. UCP 600 does not contain any mechanism for automatic currency adjustment, revaluation, or exchange rate protection. The credit says what it says, and the bank will honour up to that EGP amount regardless of what happened to the exchange rate.

This is a commercial risk that sits entirely with you as the beneficiary. When you agreed to an EGP-denominated LC, you accepted EGP currency risk. The 40% depreciation means the EGP amount now buys fewer dollars — that's your loss unless you hedged.

The LC is a documentary instrument. It doesn't reference exchange rates, commodity prices, or market conditions. It references an amount, a currency, documents, and terms. If the amount is EGP 15,000,000 and you present compliant documents, the bank pays EGP 15,000,000. What that's worth in dollars is not the bank's concern.

Your options: request an LC amendment increasing the EGP amount to reflect current exchange rates — the buyer must agree and the issuing bank must consent. Negotiate with the buyer outside the LC for a price adjustment — this is a contract matter. Or absorb the loss and ship — sometimes the relationship is worth more than the currency hit.

For future contracts: denominate LCs in a stable currency (USD, EUR) or include a currency adjustment clause in your commercial contract. The LC itself won't protect you from FX risk.`,
    citations: [
      'UCP600 Article 2 — Credit defined by its terms',
      'UCP600 Article 18(b) — Invoice amount and credit currency',
      'UCP600 Article 10 — Amendments',
    ],
    tags: ['UCP600', 'Trade Finance'],
  },
  {
    slug: 'chittagong-chattogram-port-rename-discrepancy',
    title: 'Chittagong or Chattogram? When a Port Rename Creates an LC Discrepancy',
    description: 'Bangladesh renamed Chittagong to Chattogram in 2018. If your LC says one and your B/L says the other, the bank may call it a discrepancy.',
    question: 'My LC expires tomorrow. I have all documents ready but my bill of lading has a discrepancy — the port of loading shows "Chittagong" but the LC says "Chattogram." It\'s the same port, renamed in 2018. Can I present with this discrepancy and ask for a waiver? Or is there another option?',
    answer: `This is the same port — Bangladesh officially renamed Chittagong to Chattogram in 2018. But whether the bank treats it as a discrepancy depends on how strictly they examine and whether they recognise the name change.

Under UCP 600 Article 14(d), data in a document must not conflict with data in the credit. Strictly read, "Chittagong" and "Chattogram" are different strings. A conservative bank may call it a discrepancy. A pragmatic bank familiar with the name change may not.

ISBP 745 Paragraph A22 provides some relief: "a misspelling or typing error that does not affect the meaning of a word or the sentence in which it occurs does not make a document discrepant." However, this is not technically a misspelling — it's a name change. The argument is strong but not bulletproof.

Given your LC expires tomorrow, you have limited options: present the documents as they are. If the bank raises the discrepancy, immediately request a waiver from the applicant. Since the buyer presumably knows the port hasn't moved, they should waive. Or contact the shipping line urgently and ask if they can reissue the B/L with "Chattogram" — but with one day left, this is unlikely.

The safest play: present now, disclose the issue proactively, and seek the waiver simultaneously. Don't wait — expiry is a hard deadline with no extensions.

For future LCs: always check that port names in the credit match current official names. Chittagong/Chattogram, Bombay/Mumbai, Madras/Chennai, Peking/Beijing — these rebrands catch people regularly.`,
    citations: [
      'UCP600 Article 14(d) — Data consistency',
      'ISBP745 Paragraph A22 — Misspelling and typing errors',
      'UCP600 Article 6(d) — Expiry date',
      'UCP600 Article 16 — Discrepancy waiver process',
    ],
    tags: ['UCP600', 'Transport'],
  },
  {
    slug: 'transferable-lc-first-beneficiary-rights',
    title: 'Transferable LC — Can the Issuing Bank Refuse to Pay You Because the Buyer Is Unhappy?',
    description: 'In a transferable LC, the bank\'s payment obligation is documentary, not contractual. Buyer dissatisfaction with goods doesn\'t affect compliant presentation.',
    question: 'I\'m the first beneficiary of a transferable LC. I transferred it to my supplier who presented documents and the bank accepted them. But now the buyer is refusing to pay, claiming the goods are defective. Can the bank refuse to pay me because the buyer is unhappy? Can my supplier come after me directly?',
    answer: `The bank cannot refuse to pay you because the buyer is unhappy with the goods. Under UCP 600 Article 5, banks deal with documents, not goods. Once the bank has accepted a complying presentation, its obligation to pay is irrevocable and independent of the underlying contract.

The buyer's complaint about defective goods is a contract matter between the buyer and the seller. It has no bearing on the bank's documentary obligation. The issuing bank must pay — Article 7(a) is unconditional on this point. If the bank accepted the documents as complying, they cannot later reverse that acceptance based on the applicant's complaints about the goods.

As for your supplier coming after you directly: under the LC itself, the second beneficiary has no direct claim against you. The LC creates obligations between the issuing bank and the beneficiaries. Your supplier was paid (or will be paid) under the transferred portion. Your commercial relationship with your supplier is governed by your contract with them, not by the LC.

The buyer's recourse is against you under the sales contract — they can pursue claims for defective goods, seek damages, or negotiate. But they cannot instruct the bank to withhold payment on an already-accepted presentation.

This is the fundamental principle of documentary credits: the bank's obligation is autonomous from the underlying trade.`,
    citations: [
      'UCP600 Article 5 — Documents vs goods',
      'UCP600 Article 7(a) — Issuing bank undertaking',
      'UCP600 Article 38 — Transferable credit',
      'UCP600 Article 4 — Credits vs contracts',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'murabaha-lc-shariah-vs-ucp600',
    title: 'Murabaha LC — Does Shariah Compliance Override UCP 600?',
    description: 'Islamic trade finance structures like Murabaha LCs can be subject to UCP 600, but Shariah compliance adds constraints the credit must explicitly address.',
    question: 'We structure our import LCs as Murabaha-based facilities. A client is asking whether UCP600 applies to a Murabaha LC, or whether Shariah compliance overrides UCP600 when there\'s a conflict. For example, UCP600 doesn\'t prohibit interest charges, but our facility cannot involve riba. How do we handle this?',
    answer: `UCP 600 can and frequently does apply to Murabaha-structured LCs — but it doesn't override Shariah requirements. The two frameworks operate at different levels: UCP 600 governs the documentary mechanics of the credit, while Shariah compliance governs the underlying financing structure.

A Murabaha LC is typically structured as a cost-plus-profit arrangement rather than an interest-bearing loan. The bank purchases the goods on behalf of the client and sells them at a marked-up price, paid in instalments. The LC itself — the documentary instrument — follows UCP 600 rules for examination, presentation, and payment.

The Shariah constraints are built into the facility agreement between the bank and the client, not into the LC terms that the beneficiary sees. The beneficiary presents documents under UCP 600 exactly as they would for a conventional LC. The Islamic structuring is between the issuing bank and the applicant.

Where conflicts can arise: late payment penalties (conventional LCs may charge interest — Shariah-compliant structures use charitable donation mechanisms instead). Discounting or forfaiting (selling the receivable must be structured as a sale, not an interest-bearing loan). Document requirements may include additional Shariah compliance certificates.

The practical answer: your LC is subject to UCP 600 for documentary purposes. Your Murabaha structure is a separate layer. Build the Shariah-specific constraints into the facility agreement and any additional document requirements into the LC terms. The two coexist — neither overrides the other.`,
    citations: [
      'UCP600 Article 1 — Application of UCP',
      'UCP600 Article 4 — Credits vs contracts',
      'AAOIFI Shariah Standard 8 — Murabaha',
      'UCP600 Article 5 — Documents vs goods',
    ],
    tags: ['UCP600', 'Islamic Finance'],
  },
  {
    slug: 'export-controls-ear-eccn-classification',
    title: 'Do You Need an Export License? EAR, ECCN, and Dual-Use Controls Explained',
    description: 'US Export Administration Regulations control technology exports based on ECCN classification, end-use, and destination. Getting it wrong can end your business.',
    question: 'I\'m exporting high-performance computing chips to a research university in India. My product has a composite theoretical performance of 15 TFLOPS. Do I need an export license under the EAR? What\'s the ECCN classification for this?',
    answer: `High-performance computing chips are controlled under Category 3 — Electronics, and Category 4 — Computers, of the Commerce Control List. Your 15 TFLOPS chip likely falls under ECCN 3A090 or 4A090, which were updated in recent semiconductor controls.

The analysis has three steps: classify the item (ECCN), identify the destination and end-user, and check the license requirements.

For computing chips at 15 TFLOPS: the threshold for ECCN 3A090 (advanced semiconductor controls) captures chips above certain performance levels for specific architectures. Whether your chip triggers these controls depends on the specific architecture, interconnect bandwidth, and whether it's designed for AI/ML workloads. You need the manufacturer's ECCN classification — they are best positioned to determine this.

India is not under comprehensive embargo, but it's not in Country Group A:5 (close allies) either. India sits in Country Group D:2 for nuclear-related controls and has specific license requirements for high-performance computing above certain thresholds.

A research university as end-user adds complexity: academic institutions can qualify for License Exception TMP (temporary exports) or other exceptions, but "fundamental research" exclusions have significant limitations for controlled items.

Do not self-classify sensitive items. Contact the Bureau of Industry and Security (BIS) for a formal commodity classification, or use the manufacturer's classification. The penalty for unlicensed export of controlled items can be up to $300,000 per violation and criminal prosecution.`,
    citations: [
      'EAR Part 774 — Commerce Control List (CCL)',
      'ECCN 3A090 — Advanced semiconductor controls',
      'EAR Part 740 — License exceptions',
      'EAR Part 742 — Country-specific controls',
    ],
    tags: ['Export Controls', 'EAR'],
  },
  {
    slug: 'eu-catch-all-dual-use-regulation',
    title: 'EU Catch-All — When Unlisted Items Still Need an Export License',
    description: 'Even if your product isn\'t on the EU dual-use control list, the "catch-all" provision can still require an export license based on end-use concerns.',
    question: 'I\'m exporting CNC milling machines to a company in Pakistan. The machines aren\'t on the EU dual-use control list (Annex I), but I\'ve heard there\'s a "catch-all" provision that might still require a license. Is that true? What triggers the catch-all?',
    answer: `Yes, the EU catch-all provision is real and it can require an export license for items NOT listed on the dual-use control list (Annex I of EU Regulation 2021/821). CNC milling machines to Pakistan is exactly the kind of transaction that triggers scrutiny.

The catch-all is triggered in three situations under Article 4 of the EU Dual-Use Regulation: if the exporter has been informed by the competent authority that the items are or may be intended for weapons of mass destruction (WMD) — nuclear, chemical, biological. If the exporter is aware that the items are intended for military end-use in an embargoed country. Or if the exporter is aware that the items are intended for use as parts or components of military items exported without authorization.

CNC milling machines are particularly sensitive because they have clear weapons-relevant applications — precision machining of missile and nuclear weapon components. Pakistan's status as a non-NPT nuclear state means extra scrutiny applies.

Even if no one has formally informed you, Article 4(2) places a "due diligence" obligation on you: if you ARE AWARE or HAVE GROUNDS TO SUSPECT that the items may be intended for a prohibited end-use, you must notify your national export control authority before exporting.

Indicators that should trigger your concern: unusual specifications for the stated end-use, reluctance to provide end-user certificates, routing through intermediaries, or the end-user's proximity to military or nuclear programs.

Contact your national export control authority (e.g., BAFA in Germany, ECJU in the UK) for guidance. The penalty for catch-all violations is the same as for listed items.`,
    citations: [
      'EU Regulation 2021/821 Article 4 — Catch-all controls',
      'EU Regulation 2021/821 Annex I — Dual-use control list',
      'EU Regulation 2021/821 Article 4(2) — Due diligence obligation',
      'Wassenaar Arrangement — Machine tools controls',
    ],
    tags: ['Export Controls', 'EU Dual-Use'],
  },
  {
    slug: 'confirmation-misconception-damaged-goods',
    title: 'Your LC Is Confirmed — Does That Mean the Bank Refunds You If Goods Arrive Damaged?',
    description: 'Confirmation means the confirming bank adds its own payment obligation. It does NOT mean insurance, quality guarantee, or goods protection.',
    question: 'I\'m importing generators from China. The LC is confirmed by Standard Chartered Lagos. If the generators arrive damaged, Standard Chartered will refund me since they confirmed the LC, right? That\'s what confirmation means?',
    answer: `No — that is not what confirmation means, and this is one of the most dangerous misconceptions in trade finance.

Confirmation under UCP 600 Article 8 means the confirming bank adds its own irrevocable undertaking to honour or negotiate a complying presentation, in addition to the issuing bank's undertaking. It protects the BENEFICIARY (seller) against issuing bank risk and country risk — not the APPLICANT (buyer) against defective goods.

You are the applicant. Confirmation benefits the Chinese seller, not you. If the seller presents compliant documents — a clean bill of lading, a commercial invoice matching the LC terms, an insurance certificate — the confirming bank MUST pay, regardless of whether the goods are actually damaged. The bank examines documents, not generators.

Under UCP 600 Article 5, banks deal with documents and not with goods. Even if the generators arrive in pieces, the bank's obligation depends solely on whether the documents presented are compliant. A clean bill of lading means the carrier received the goods in apparent good order — it doesn't guarantee they arrive that way.

Your protection against damaged goods comes from: cargo insurance (claim against the insurer), the sales contract (claim against the seller), and the carrier's liability under the bill of lading (claim against the shipping line).

The confirming bank owes you nothing as the applicant. Confirmation is a beneficiary protection mechanism — it's about ensuring the seller gets paid, not ensuring the buyer gets good goods.`,
    citations: [
      'UCP600 Article 8 — Confirming bank undertaking',
      'UCP600 Article 5 — Documents vs goods, services, performance',
      'UCP600 Article 7 — Issuing bank undertaking',
      'UCP600 Article 34 — Disclaimer on goods',
    ],
    tags: ['UCP600'],
  },
  {
    slug: 'methyl-bromide-phosphine-fumigation-certificate-lc',
    title: 'LC Requires Methyl Bromide Fumigation — But It\'s Banned. Can You Use Phosphine Instead?',
    description: 'When an LC requires a specific chemical treatment that regulations have banned, you can\'t substitute — even with a superior alternative. Amend the LC first.',
    question: 'My LC for rice exports to the EU requires both a phytosanitary certificate AND a fumigation certificate showing methyl bromide treatment. But the EU banned methyl bromide under the Montreal Protocol. My fumigation company uses phosphine instead. Can I present a fumigation certificate showing phosphine treatment when the LC specifically says methyl bromide?',
    answer: `No — you cannot present a phosphine fumigation certificate when the LC specifically requires methyl bromide. The bank will examine the document against the LC terms, and "phosphine" is not "methyl bromide." This is a discrepancy regardless of the regulatory reality.

Under UCP 600 Article 14(a), the bank examines documents to determine whether they appear on their face to constitute a complying presentation. The LC says methyl bromide. Your certificate says phosphine. The bank sees a mismatch and refuses.

The irony is real: the EU banned methyl bromide for plant protection use under EU Regulation 1005/2009 (implementing the Montreal Protocol). So the LC is requiring something that's illegal in the destination country. But the bank doesn't interpret regulations — it reads documents against credit terms.

This is a classic "impossible LC condition" scenario. Your options: request an LC amendment immediately — change "methyl bromide" to "phosphine" or to a general "fumigation certificate showing treatment with an approved fumigant." This is the only clean solution. Or present the phosphine certificate and seek a discrepancy waiver — the buyer presumably knows methyl bromide is banned and should accept phosphine. But they're not obligated to waive.

Do not attempt to obtain a methyl bromide fumigation certificate — using a banned substance would violate environmental regulations and potentially create criminal liability.

Flag this to your buyer now. The LC amendment is the correct path.`,
    citations: [
      'UCP600 Article 14(a) — Face compliance examination',
      'UCP600 Article 14(d) — Data consistency',
      'EU Regulation 1005/2009 — Ozone depleting substances',
      'UCP600 Article 10 — Amendment procedure',
    ],
    tags: ['UCP600', 'Regulatory'],
  },
  {
    slug: 'urc-522-documentary-collections-basics',
    title: 'Documentary Collections Under URC 522 — How D/P and D/A Actually Work',
    description: 'Documentary collections are cheaper and simpler than LCs, but offer less protection. URC 522 governs the process — here\'s what you need to know.',
    question: 'I\'m new to trade finance. My buyer doesn\'t want to open an LC because of the cost. They suggested documentary collection instead. What\'s the difference between D/P and D/A under URC 522, and how much protection do I actually get as the seller?',
    answer: `Documentary collections are governed by URC 522 (Uniform Rules for Collections). They're simpler and cheaper than LCs because there's no bank payment guarantee — the banks act as intermediaries, not as obligors.

D/P (Documents against Payment): the presenting bank releases shipping documents to the buyer ONLY when the buyer pays. You retain control of the goods (through the bill of lading) until payment is received. If the buyer refuses to pay, the goods remain yours — but they're sitting in a foreign port, and you need to arrange return shipment or find another buyer.

D/A (Documents against Acceptance): the presenting bank releases documents when the buyer ACCEPTS a time draft (bill of exchange). The buyer gets the documents — and therefore the goods — immediately, but pays later (30, 60, 90 days). You carry credit risk: if the buyer accepts the draft but doesn't pay at maturity, your recourse is against the buyer under the draft, not against the bank.

The critical difference from an LC: under a collection, NO BANK IS OBLIGATED TO PAY YOU. The banks merely handle document delivery per your instructions. Under an LC, the issuing bank guarantees payment against compliant documents.

D/P gives you reasonable security — you keep the documents until you have the money. D/A gives you almost no security — you've handed over the goods on a promise to pay later.

Collections work well with trusted buyers, repeat relationships, and commodity trades where the goods are easily resold if the buyer defaults.`,
    citations: [
      'URC 522 Article 1 — Application and definitions',
      'URC 522 Article 7 — Release of documents',
      'URC 522 Article 10 — Payment without delay',
      'URC 522 Article 4 — Collection instruction',
    ],
    tags: ['URC 522', 'Collections'],
  },
  {
    slug: 'vessel-ais-gaps-dark-activity-sanctions',
    title: 'AIS Gaps, Flag Changes, and Ship-to-Ship Transfers — Sanctions Red Flags for Marine Insurance',
    description: 'When a vessel goes dark, changes flags, or conducts unplanned STS transfers, it\'s signalling potential sanctions evasion. Here\'s what insurers and banks should watch for.',
    question: 'We insure cargo vessels. One of our insured vessels has shown the following behaviour: three AIS gaps totalling 18 days, two flag changes from Liberia to Cameroon to Palau, and a ship-to-ship transfer off Malaysia that wasn\'t in the voyage plan. The vessel now wants to load Russian crude at Novorossiysk. Should we continue to insure this vessel?',
    answer: `This vessel is exhibiting a textbook pattern of deceptive shipping practices associated with sanctions evasion. Each indicator alone warrants investigation — together, they constitute a serious red flag cluster that should trigger an immediate risk review.

AIS gaps (18 days total): vessels disable their Automatic Identification System to conceal their location, typically during sanctioned port calls or illicit ship-to-ship transfers. OFAC, the EU, and the UK have all issued guidance identifying AIS manipulation as a primary sanctions evasion indicator.

Flag hopping (Liberia → Cameroon → Palau): changing flags, especially to jurisdictions with weaker oversight, is a classic indicator of sanctions evasion. Palau in particular has appeared on recent lists of flags associated with shadow fleet vessels carrying sanctioned oil.

Unplanned STS transfer: ship-to-ship transfers outside designated STS zones, without prior notification, are a primary method for commingling or laundering sanctioned cargo — particularly Russian crude oil.

Loading Russian crude at Novorossiysk: Russian oil exports are subject to the G7/EU/Australia price cap. Transporting Russian crude above the cap without proper attestation violates sanctions.

Our assessment: continuing to insure this vessel creates significant legal exposure. You risk violating sanctions regulations (OFAC, EU, UK), voiding your own reinsurance coverage, and potential secondary sanctions designation.

Recommended actions: suspend coverage pending a full investigation. Require the vessel owner to explain each AIS gap with port records. Verify the STS transfer cargo and counterparty. Check the vessel against consolidated sanctions lists. Consult your sanctions compliance officer before any decision to reinstate.`,
    citations: [
      'OFAC Advisory on Deceptive Shipping Practices (2020, updated 2023)',
      'EU Council Decision 2022/2367 — Russian oil price cap',
      'UK OFSI Maritime Guidance — AIS manipulation indicators',
      'IMO SOLAS Regulation V/19 — AIS requirements',
    ],
    tags: ['Sanctions', 'Maritime'],
  },
  {
    slug: 'distressed-beneficiary-typo-bank-rejection',
    title: 'Bank Rejected Documents Over a Typo — Can You Sue?',
    description: 'A single-letter typo in the beneficiary address led to document rejection. The bank may be right — but there\'s nuance in ISBP 745 about misspellings.',
    question: 'I just lost $40,000 because the bank rejected my documents over a typo in the beneficiary address. One letter wrong in the street name. I\'ve been shipping to this buyer for 5 years with no problems. This is the same bank that always accepted my documents. Now suddenly they find a problem? Is there anything I can do? Can I sue the bank?',
    answer: `Take a breath. This is a serious situation but you have more options than you think.

First, the legal question: ISBP 745 Paragraph A22 states that a misspelling or typing error that does not affect the meaning of a word or the sentence in which it occurs does not make a document discrepant. A single-letter error in a street name — where the rest of the address is correct and the beneficiary is clearly identifiable — has a strong argument for falling within this provision.

However, banks have discretion in applying this standard, and some take a strict position. The question is whether the typo genuinely created ambiguity about the beneficiary's identity, or whether it was an obvious error that anyone reading the document would recognise.

Your options, in order of urgency: request a discrepancy waiver from the applicant through the bank — if the buyer is willing to accept (and you say you've been shipping together for 5 years), this resolves it immediately. If the presentation period hasn't expired, correct the document and re-present. Challenge the rejection by citing ISBP 745 Paragraph A22 — put it in writing to the bank, referencing the specific paragraph.

Can you sue the bank? Theoretically yes, but litigation is slow, expensive, and uncertain. You'd need to prove the bank breached its examination standard under UCP 600 Article 14 — that the typo clearly fell within the ISBP 745 tolerance and the bank acted unreasonably.

The harder truth: past acceptance of your documents doesn't create precedent. Each presentation is examined independently. A bank that overlooked issues before can start examining strictly at any time.`,
    citations: [
      'ISBP745 Paragraph A22 — Misspelling and typing errors',
      'UCP600 Article 14(a) — Standard for examination',
      'UCP600 Article 14(d) — Data in documents',
      'UCP600 Article 16 — Refusal and waiver',
    ],
    tags: ['UCP600', 'ISBP745'],
  },
]
