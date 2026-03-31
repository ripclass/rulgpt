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
    href: '/chat',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['2,000 queries per month', 'Priority routing', 'API access', 'Exports and reports'],
    cta: 'Go Pro \u2192',
    href: '/chat',
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
            className={`rounded-lg border p-6 ${
              plan.featured ? 'border-primary bg-card' : 'border-border bg-card'
            }`}
          >
            <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground">&ndash; {f}</li>
              ))}
            </ul>
            <Link
              to={plan.href}
              className={`mt-6 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                plan.featured
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'border border-border text-foreground hover:border-primary/50'
              }`}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-lg border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Notes</h2>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>tfrules answers from published trade-finance rules and standards. It saves time on first-pass interpretation, not replace transaction-level review.</p>
          <p>API access is included for operational use. Heavy-volume programmatic usage will move to dedicated pricing as adoption patterns become clearer.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
