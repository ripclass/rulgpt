import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { SessionTier } from '@/types'

export function UpgradeCTA({ tier }: { tier: SessionTier }) {
  if (tier === 'enterprise') return null // legacy: was 'pro'
  const ctaLabel = tier === 'professional' ? 'Upgrade to Enterprise' : 'Plans from $79/mo' // legacy: 'starter' → 'professional', '$9/mo' → '$79/mo'
  const helperText =
    tier === 'professional' // legacy: was 'starter'
      ? 'Need higher volume, priority model routing, or session export? Move up to Enterprise.'
      : 'Synced history, saved answers, and exports when the free tier is no longer enough.'
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
