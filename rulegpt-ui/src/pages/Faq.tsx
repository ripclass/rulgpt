import { PublicPageShell } from '@/components/layout/PublicPageShell'

const faqs = [
  {
    question: 'What does RuleGPT actually do?',
    answer:
      'RuleGPT answers trade finance and trade-compliance questions in plain English, with citations back to the underlying rules, articles, and standards.',
  },
  {
    question: 'Is this for experts only?',
    answer:
      'No. The product is designed for daily operators, exporters, importers, freight forwarders, C&F agents, and compliance teams who need a usable answer quickly.',
  },
  {
    question: 'Does RuleGPT replace legal advice or document review?',
    answer:
      'No. RuleGPT explains published rules and standards. It does not provide legal advice or approve a specific transaction or document set.',
  },
  {
    question: 'What happens if the rules are incomplete?',
    answer:
      'RuleGPT is designed to say that clearly. It should separate what the retrieved rules support from what still depends on missing transaction facts or missing coverage.',
  },
  {
    question: 'Which rulebooks and domains are covered?',
    answer:
      'Current coverage focuses on ICC rules, sanctions, FTAs, customs guidance, and bank requirements, with the rules corpus expanding continuously.',
  },
]

export function Faq() {
  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Questions people will ask before they trust it"
      description="A product like RuleGPT wins or loses on trust. These are the practical questions the site should answer clearly."
    >
      <section className="space-y-4">
        {faqs.map((faq) => (
          <article key={faq.question} className="border border-black/10 bg-white px-6 py-5">
            <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">{faq.question}</h2>
            <p className="mt-3 text-sm leading-7 text-[#243042]">{faq.answer}</p>
          </article>
        ))}
      </section>
    </PublicPageShell>
  )
}
