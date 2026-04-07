import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { Check } from 'lucide-react'

type Interval = 'monthly' | 'annual'

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    queries: '5 queries/month',
    models: '100% Haiku',
    features: [
      'Citation-backed answers',
      'ICC, sanctions, FTA, customs coverage',
      'No credit card required',
    ],
    cta: 'Start free',
    href: '/chat',
    featured: false,
    badge: null,
  },
  {
    name: 'Professional',
    monthlyPrice: 79,
    annualPrice: 790,
    queries: '500 queries/month',
    models: 'Haiku + Sonnet + Opus',
    features: [
      'Full citation-backed answers',
      '5,400+ rules from RulHub',
      'Sanctions queries routed to Opus',
      'Session history and saved answers',
      'Priority support',
    ],
    cta: 'Get Professional',
    href: '/upgrade?plan=professional',
    featured: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 199,
    annualPrice: 1990,
    queries: '2,000 queries/month',
    models: 'Expanded Opus access',
    features: [
      'Everything in Professional',
      'Lower Opus routing threshold',
      '5+ rules or 3+ domains triggers Opus',
      'Full session export',
      'Dedicated account support',
    ],
    cta: 'Get Enterprise',
    href: '/upgrade?plan=enterprise',
    featured: false,
    badge: null,
  },
]

function formatPrice(amount: number) {
  if (amount === 0) return '$0'
  return `$${amount}`
}

export function Pricing() {
  const [interval, setInterval] = useState<Interval>('monthly')

  return (
    <PublicPageShell
      eyebrow="Pricing"
      title="Expert trade finance answers. Simple pricing."
      description="The same ICC, sanctions, and FTA knowledge that costs $500/hr from a consultant — available instantly."
    >
      {/* Monthly / Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => setInterval('monthly')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition ${
            interval === 'monthly'
              ? 'bg-[#B2F273] text-neutral-900'
              : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval('annual')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-sm transition ${
            interval === 'annual'
              ? 'bg-[#B2F273] text-neutral-900'
              : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'
          }`}
        >
          Annual
          <span className="ml-1.5 text-[10px] font-medium opacity-80">Save 2 months</span>
        </button>
      </div>

      {/* Pricing cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price = interval === 'annual' && plan.annualPrice > 0
            ? plan.annualPrice
            : plan.monthlyPrice
          const period = plan.monthlyPrice === 0 ? '/month' : interval === 'annual' ? '/year' : '/month'
          const monthlySavings = interval === 'annual' && plan.monthlyPrice > 0
            ? plan.monthlyPrice * 12 - plan.annualPrice
            : 0

          return (
            <article
              key={plan.name}
              className={`rounded-sm p-6 bg-white dark:bg-[#121212] flex flex-col border relative ${
                plan.featured
                  ? 'border-[#B2F273] shadow-md shadow-[#B2F273]/5'
                  : 'border-neutral-200 dark:border-white/10'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-4 bg-[#B2F273] text-neutral-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
                  {plan.badge}
                </span>
              )}
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
                {plan.name}
              </h2>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {formatPrice(price)}
                </span>
                <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{period}</span>
              </div>
              {monthlySavings > 0 && (
                <p className="mt-1 text-xs font-medium text-[#B2F273]">Save ${monthlySavings}/year</p>
              )}
              <p className="mt-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">{plan.queries}</p>
              <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">AI: {plan.models}</p>

              <ul className="mt-5 space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
                    <Check className="h-3.5 w-3.5 mt-0.5 text-[#B2F273] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to={plan.href}
                className={`mt-6 block w-full rounded-sm px-4 py-2.5 text-center text-xs font-bold uppercase tracking-widest transition ${
                  plan.featured
                    ? 'bg-[#B2F273] text-neutral-900 hover:bg-[#9AD65E]'
                    : 'bg-neutral-100 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          )
        })}
      </section>

      {/* Comparison with alternatives */}
      <section className="mt-12 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white mb-4">
          How tfrules compares
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
          <div className="p-4 rounded-sm border-2 border-[#B2F273]">
            <p className="font-bold text-[#B2F273]">tfrules Professional</p>
            <p className="text-2xl font-bold text-[#B2F273] mt-2">$79/mo</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Instant answers. 5,400+ rules. 24/7.</p>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="mt-6 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Notes</h2>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>tfrules answers from published trade finance rules and standards. It is a first-pass interpretation tool, not a replacement for transaction-level legal review.</p>
          <p>All plans include access to ICC standards (UCP600, ISBP745, ISP98, URDG758, URC522, URR725), Incoterms 2020, sanctions screening rules, FTA rules of origin, and 48 country-specific regulation sets.</p>
          <p>Enterprise customers can contact us for custom API access and volume pricing.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
