import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-parchment)' }}>Upgrade</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>Saved work, exports, faster routing, and API access.</p>
      <Button asChild className="btn-primary mt-3 w-full rounded-md text-xs">
        <Link to="/upgrade">Upgrade &rarr; $9/mo</Link>
      </Button>
    </div>
  )
}
