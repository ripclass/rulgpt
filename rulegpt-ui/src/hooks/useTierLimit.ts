import type { SessionTier } from '@/types'

interface TierLimitArgs {
  tier: SessionTier
  queriesRemaining: number
}

// Anonymous and free limits reset daily; professional/enterprise stay monthly.
const DAILY_TIERS: ReadonlySet<SessionTier> = new Set(['anonymous', 'free'])

export function useTierLimit({ tier, queriesRemaining }: TierLimitArgs) {
  const limitByTier: Record<SessionTier, number> = {
    anonymous: 2,
    free: 5,
    professional: 500,
    enterprise: 2000,
  }
  const limitValue = limitByTier[tier] ?? -1
  const hasLimit = queriesRemaining >= 0 && limitValue > 0
  const reachedLimit = hasLimit && queriesRemaining <= 0
  const usedCount = hasLimit ? Math.max(0, limitValue - queriesRemaining) : 0
  const period = DAILY_TIERS.has(tier) ? 'today' : 'this month'

  return {
    hasLimit,
    reachedLimit,
    limitValue,
    usedCount,
    remaining: queriesRemaining,
    period,
  }
}
