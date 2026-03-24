import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function Upgrade() {
  const auth = useAuth()
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-wide text-primary">RuleGPT Pro</p>
        <h1 className="mt-2 text-3xl font-semibold">Upgrade for teams and daily workflows</h1>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>Formatted compliance reports</li>
          <li>Bulk export (session PDF/JSON)</li>
          <li>API access up to 10,000 queries/month</li>
          <li>Priority routing for model generation</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              auth.setTier('pro')
            }}
          >
            Enable Pro (local preview)
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to chat</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Stripe checkout UI is wired here. Real billing depends on backend Stripe handlers and webhook deployment.
        </p>
      </div>
    </main>
  )
}
