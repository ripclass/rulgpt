import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { HistoryItem } from '@/types'

export function useHistory(userId?: string, tier: 'anonymous' | 'free' | 'pro' = 'anonymous') {
  return useQuery<HistoryItem[]>({
    queryKey: ['history', userId],
    queryFn: () => api.getHistory({ userId, tier }),
    enabled: Boolean(userId),
    staleTime: 60_000,
  })
}
