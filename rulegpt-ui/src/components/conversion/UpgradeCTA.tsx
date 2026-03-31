import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <p className="text-sm font-semibold text-foreground">Upgrade</p>
      <p className="mt-1 text-xs text-muted-foreground">Saved work, exports, faster routing, and API access.</p>
      <Button asChild className="mt-3 w-full bg-primary text-xs text-primary-foreground hover:bg-amber-hover">
        <Link to="/upgrade">Upgrade &rarr; $9/mo</Link>
      </Button>
    </div>
  )
}
