import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">Upgrade</p>
      <p className="mt-1 text-xs text-muted-foreground">Saved work, exports, faster routing, and API access.</p>
      <Button asChild className="mt-3 w-full rounded-full bg-foreground text-xs text-background hover:bg-foreground/90">
        <Link to="/upgrade">Upgrade &rarr; $9/mo</Link>
      </Button>
    </div>
  )
}
