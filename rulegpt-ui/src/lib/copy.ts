import type { SessionTier } from '@/types'

/** Tier-aware messaging shown when a user hits their query limit. */
export function limitReachedCopy(tier?: SessionTier | null): string {
  if (tier === 'anonymous') {
    return "You've used your 2 free answers for today. Create a free account for 5 questions a day — no card needed."
  }
  if (tier === 'free') {
    return "You've hit today's 5-question limit. Upgrade to Pro ($29/mo) for fair-use Q&A, case notes, and drafts."
  }
  return 'You have exhausted your free query limit. Register for unlimited queries, or upgrade for synced history, saved answers, and priority routing.'
}
