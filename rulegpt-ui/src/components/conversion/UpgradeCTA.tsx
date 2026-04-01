import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  const ctaLabel = tier === 'starter' ? 'Upgrade to Pro -> $19/mo' : 'Plans from $9/mo'
  const helperText =
    tier === 'starter'
      ? 'Need higher volume, API access, or priority routing? Move up to Pro.'
      : 'Saved work, exports, and paid plans when the free tier is no longer enough.'
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--color-parchment)' }}>Upgrade</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{helperText}</p>
      <Button asChild className="btn-primary mt-3 w-full rounded-md text-xs">
        <Link to="/upgrade">{ctaLabel}</Link>
      </Button>
    </div>
  )
}
