import type { SessionTier } from '@/types'

interface TierLimitArgs {
  tier: SessionTier
  queriesRemaining: number
}

export function useTierLimit({ tier, queriesRemaining }: TierLimitArgs) {
  const limitByTier: Record<SessionTier, number> = {
    anonymous: 5,
    free: 5,
    professional: 500,
    enterprise: 2000,
    // Legacy aliases
    starter: 500,
    pro: 500,
    expert: 2000,
  }
  const limitValue = limitByTier[tier] ?? -1
  const hasLimit = queriesRemaining >= 0 && limitValue > 0
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
