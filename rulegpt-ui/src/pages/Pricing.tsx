import { Link } from 'react-router-dom'
import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { SEOHead } from '@/components/shared/SEOHead'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    queries: '5 questions/day',
    features: [
      'Citation-backed answers',
      'ICC, sanctions, FTA, customs coverage',
      'MT700 interpreter',
      'No credit card required',
    ],
    cta: 'Start free',
    href: '/chat',
    featured: false,
    badge: null,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    queries: 'Fair-use Q&A',
    features: [
      'Fair-use Q&A, no hard daily cap',
      '15,000-rule grounded corpus, 48 jurisdictions',
      'Unlimited case notes + drafts',
      'PDF export',
      'Priority support',
    ],
    cta: 'Get Pro',
    href: '/upgrade',
    featured: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Contact us',
    period: null,
    queries: 'Volume & team seats',
    features: [
      'Everything in Pro',
      'Volume & team seats',
      'Dedicated account support',
    ],
    cta: 'Contact us',
    href: 'mailto:hello@rulgpt.com',
    featured: false,
    badge: null,
  },
]

export function Pricing() {
  return (
    <>
    <SEOHead title="Pricing | RulGPT" description="Free, Pro, and Enterprise plans for cited trade finance rule answers. From $0 to $29/month." path="/pricing" />
    <PublicPageShell
      eyebrow="Pricing"
      title="Expert trade finance answers. Simple pricing."
      description="The same ICC, sanctions, and FTA knowledge that costs $500/hr from a consultant — available instantly."
    >
      {/* Pricing cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isExternal = plan.href.startsWith('mailto:')

          return (
            <article
              key={plan.name}
              className={`rounded-sm p-6 bg-white dark:bg-[#121212] flex flex-col border relative ${
                plan.featured
                  ? 'border-[#FF4F00] shadow-md shadow-[#FF4F00]/5'
                  : 'border-neutral-200 dark:border-white/10'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-4 bg-[#FF4F00] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                {plan.name}
              </h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{plan.period}</span>
                )}
              </div>
              <p className="mt-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">{plan.queries}</p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                    <Check className="h-3.5 w-3.5 mt-0.5 text-[#FF4F00] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isExternal ? (
                <a
                  href={plan.href}
                  className="mt-6 block w-full rounded-sm px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest transition bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10"
                >
                  {plan.cta}
                </a>
              ) : (
                <Link
                  to={plan.href}
                  className={`mt-6 block w-full rounded-sm px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest transition ${
                    plan.featured
                      ? 'bg-[#FF4F00] text-white hover:bg-[#E64600]'
                      : 'bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </article>
          )
        })}
      </section>

      {/* Comparison with alternatives */}
      <section className="mt-12 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white mb-4">
          How RulGPT compares
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-sm bg-neutral-50 dark:bg-white/[0.02]">
            <p className="font-bold text-neutral-900 dark:text-white">Trade finance consultant</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">$500/hr</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">2-3 day turnaround typical</p>
          </div>
          <div className="p-4 rounded-sm bg-neutral-50 dark:bg-white/[0.02]">
            <p className="font-bold text-neutral-900 dark:text-white">ICC Academy training</p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">$2,799/yr</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Teaches rules, doesn't apply them</p>
          </div>
          <div className="p-4 rounded-sm border-2 border-[#FF4F00]">
            <p className="font-bold text-[#FF4F00]">RulGPT Pro</p>
            <p className="text-2xl font-bold text-[#FF4F00] mt-2">$29/mo</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Instant answers. 15,000-rule grounded corpus. 24/7.</p>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-6 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Notes</h2>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>RulGPT answers from published trade finance rules and standards. It is a first-pass interpretation tool, not a replacement for transaction-level legal review.</p>
          <p>All plans include access to ICC standards (UCP600, ISBP 821, ISP98, URDG758, URC522, URR725), Incoterms 2020, sanctions screening rules, FTA rules of origin, and 48 country-specific regulation sets.</p>
          <p>Enterprise customers can contact us for custom API access and volume pricing.</p>
        </div>
      </section>
    </PublicPageShell>
    </>
  )
}
