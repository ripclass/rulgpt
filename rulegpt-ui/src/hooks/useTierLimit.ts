import type { SessionTier } from '@/types'

interface TierLimitArgs {
  tier: SessionTier
  queriesRemaining: number
}

export function useTierLimit({ tier, queriesRemaining }: TierLimitArgs) {
  const limitValue = tier === 'anonymous' ? 10 : -1
  const hasLimit = tier === 'anonymous'
  const reachedLimit = hasLimit && queriesRemaining <= 0
  const usedCount = hasLimit ? Math.max(0, limitValue - queriesRemaining) : 0

  return {
    hasLimit,
    reachedLimit,
    limitValue,
    usedCount,
    remaining: queriesRemaining,
  }
}
