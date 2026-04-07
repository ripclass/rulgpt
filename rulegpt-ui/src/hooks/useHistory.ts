import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SessionSummary, SessionTier } from '@/types'

export function useHistory(
  userId?: string,
  tier: SessionTier = 'anonymous',
  accessToken?: string | null,
  enabled = true,
) {
  return useQuery<SessionSummary[]>({
    queryKey: ['history', userId, tier, accessToken ?? null],
    queryFn: () => api.getHistory({ userId, tier, accessToken }),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  })
}
