import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'pro') return null
  const ctaLabel = tier === 'starter' ? 'Upgrade to Pro' : 'Plans from $9/mo'
  const helperText =
    tier === 'starter'
      ? 'Need higher volume, API access, or priority routing? Move up to Pro.'
      : 'Saved work, exports, and paid plans when the free tier is no longer enough.'
  return (
    <div className="rounded-sm bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-white/10 px-4 py-4 transition-colors">
      <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">Upgrade</p>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{helperText}</p>
      <Button asChild className="mt-4 w-full rounded-sm bg-[#FF4F00] text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-sm shadow-[#FF4F00]/20 border-none">
        <Link to="/upgrade">{ctaLabel}</Link>
      </Button>
    </div>
  )
}
