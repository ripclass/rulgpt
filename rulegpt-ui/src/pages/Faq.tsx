import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PublicPageShell } from '@/components/layout/PublicPageShell'

const faqs = [
  {
    q: 'Why not just ask ChatGPT?',
    a: 'ChatGPT will give you a confident answer. It may be right. It may be wrong. You can\'t tell. tfrules cites the rule so you can verify it yourself.',
  },
  {
    q: 'How current are the rules?',
    a: 'We cover UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data is updated regularly.',
  },
  {
    q: 'What if you don\'t have the rule I need?',
    a: 'We tell you clearly. We never make up a rule. If it\'s not in our database, we say so and suggest where to look.',
  },
  {
    q: 'Is this for experts only?',
    a: 'No. Built for daily operators \u2014 C&F agents, freight forwarders, importers, exporters, compliance teams. You don\'t need to be an ICC specialist.',
  },
  {
    q: 'Does this replace legal advice?',
    a: 'No. tfrules explains published rules and standards. It does not provide legal advice or approve a specific transaction.',
  },
]

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <PublicPageShell
      eyebrow="FAQ"
      title="Questions"
      description="The practical questions people ask before they trust a tool like this."
    >
      <section className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>{faq.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
                style={{ color: 'var(--color-text-secondary)' }}
              />
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </section>
    </PublicPageShell>
  )
}
