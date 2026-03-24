import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HistoryItem } from '@/types'

export function useHistory(
  userId?: string,
  tier: 'anonymous' | 'free' | 'pro' = 'anonymous',
  accessToken?: string | null,
  enabled = true,
) {
  return useQuery<HistoryItem[]>({
    queryKey: ['history', userId, tier, accessToken ?? null],
    queryFn: () => api.getHistory({ userId, tier, accessToken }),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  })
}
