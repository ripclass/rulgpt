import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  return (
    <div className="glass-panel rounded-xl p-3">
      <p className="text-sm font-medium">Upgrade to Pro</p>
      <p className="mt-1 text-xs text-muted-foreground">Saved work, exports, faster routing, and API access.</p>
      <Button asChild className="mt-3 w-full">
        <Link to="/upgrade">Upgrade - $20/mo</Link>
      </Button>
    </div>
  )
}
