import { Link } from 'react-router-dom'
import { PublicPageShell } from '@/components/layout/PublicPageShell'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['20 queries per month', 'Citation-backed answers', 'No credit card required'],
    cta: 'Start free \u2192',
    href: '/chat',
    featured: false,
  },
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    features: ['500 queries per month', 'Synced history', 'Saved answers', 'One avoided discrepancy fee covers a year'],
    cta: 'Get started \u2192',
    href: '/upgrade',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['2,000 queries per month', 'Priority routing', 'API access', 'Exports and reports'],
    cta: 'Go Pro \u2192',
    href: '/upgrade',
    featured: false,
  },
]

export function Pricing() {
  return (
    <PublicPageShell
      eyebrow="Pricing"
      title="Start free. Pay when it saves you money."
      description="Simple pricing for a focused product. No unlimited plans, no hidden fees."
    >
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-sm p-6 bg-white dark:bg-[#121212] flex flex-col border ${
              plan.featured
                ? 'border-[#FF4F00] shadow-md shadow-[#FF4F00]/5'
                : 'border-neutral-200 dark:border-white/10'
            }`}
          >
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">{plan.name}</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">{plan.price}</span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-[13px] font-medium text-neutral-600 dark:text-neutral-400">&ndash; {f}</li>
              ))}
            </ul>
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
          </article>
        ))}
      </section>

      <section
        className="mt-10 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10"
      >
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Notes</h2>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          <p>tfrules answers from published trade-finance rules and standards. It saves time on first-pass interpretation, not replace transaction-level review.</p>
          <p>API access is included for operational use. Heavy-volume programmatic usage will move to dedicated pricing as adoption patterns become clearer.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
