import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { SEOHead } from '@/components/shared/SEOHead'

const faqs = [
  {
    q: 'Why not just ask a standard AI model?',
    a: 'Generative models will give you a confident answer. It may be right. It may be a hallucination. In trade finance, an error means a discrepancy. tfrules operates strictly over a curated topological graph and cites exact articles so you can verify it yourself.',
  },
  {
    q: 'What is the scope of the engine?',
    a: 'We cover ICC Core (UCP600/ISBP745), current OFAC/EU/UN sanctions, FTA origin rules, central bank regulations of 48 jurisdictions, and granular commodity compliance requirements.',
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
    <>
    <SEOHead title="FAQ — TFRules" description="Frequently asked questions about tfrules.com. How it works, what it covers, accuracy, pricing, and data handling." path="/faq" />
    <PublicPageShell
      eyebrow="FAQ"
      title="Questions"
      description="The practical questions people ask before they trust a tool like this."
    >
      <section className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="rounded-sm bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-neutral-900 dark:text-white">{faq.q}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform text-neutral-400 dark:text-neutral-500 ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </section>
    </PublicPageShell>
    </>
  )
}
