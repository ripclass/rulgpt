import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { PublicPageShell } from '@/components/layout/PublicPageShell'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'for first use',
    points: [
      'Start asking immediately',
      'Citation-backed answers',
      'Limited monthly usage',
      'No saved history across devices',
    ],
  },
  {
    name: 'Pro',
    price: '$20',
    period: 'per month',
    points: [
      'Synced history and saved answers',
      'Exports and formatted reports',
      'Priority routing for harder questions',
      'API access with fair-use limits',
    ],
  },
]

export function Pricing() {
  return (
    <PublicPageShell
      eyebrow="Pricing"
      title="Simple pricing for a focused product"
      description="RuleGPT is designed as a daily trade-rules assistant, not an unlimited generic chatbot. The plan is priced to stay useful, sustainable, and fast."
    >
      <section className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="border border-black/10 bg-white px-6 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{plan.name}</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="font-display text-5xl font-medium tracking-[-0.06em] text-[#0c111d]">{plan.price}</span>
              <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm leading-7 text-[#243042]">
              {plan.points.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-8 border border-black/10 bg-white px-6 py-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
        <div className="mt-4 space-y-3 text-sm leading-7 text-[#243042]">
          <p>RuleGPT answers from published trade-finance rules and standards. It is designed to save time on first-pass interpretation, not replace transaction-level review.</p>
          <p>API access is included for operational use, but heavy-volume programmatic usage will move to dedicated pricing as adoption patterns become clearer.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-none bg-[#111827] text-white hover:bg-primary">
            <Link to="/chat">Open chat</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none border-black/10 bg-white hover:bg-[#faf7f2]">
            <Link to="/upgrade">Upgrade to Pro</Link>
          </Button>
        </div>
      </section>
    </PublicPageShell>
  )
}
