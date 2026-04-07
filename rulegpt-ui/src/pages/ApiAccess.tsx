import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface UsageResponse {
  tier: string
  api_queries_used: number
  api_queries_limit: number
}

export function ApiAccess() {
  const auth = useAuth()
  const usage = useQuery({
    queryKey: ['usage', auth.user?.id, auth.tier],
    enabled: Boolean(auth.user) && auth.tier === 'enterprise', // legacy: was 'pro'
    queryFn: async (): Promise<UsageResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/usage`, {
        headers: {
          ...(auth.user ? { 'x-user-id': auth.user.id } : {}),
          'x-user-tier': auth.tier,
        },
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      return response.json() as Promise<UsageResponse>
    },
  })

  return (
    <main className="mx-auto flex min-h-screen w-full flex-col justify-center px-4 py-10 bg-[#FAFAFA] dark:bg-[#050505] transition-colors">
      <div className="mx-auto w-full max-w-3xl rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-8 md:p-12 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#B2F273]">API Access</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Programmatic tfrules queries</h1>
        <p className="mt-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
          Endpoint:{' '}
          <code className="rounded-sm bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[#B2F273]">
            POST /api/v1/query
          </code>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          Auth and API key issuance are backend placeholders today. This page validates usage endpoint readiness.
        </p>

        <div className="mt-8 rounded-sm border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#121212] p-4 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
          {auth.tier !== 'enterprise' ? ( // legacy: was 'pro'
            <p>Upgrade to Enterprise to unlock API usage metrics.</p>
          ) : usage.isLoading ? (
            <p>Loading usage...</p>
          ) : usage.error ? (
            <p>Usage endpoint error: {String(usage.error)}</p>
          ) : (
            <p>
              Used: {usage.data?.api_queries_used ?? 0} / {usage.data?.api_queries_limit ?? 0}
            </p>
          )}
        </div>

        <Link to="/chat" className="mt-8 inline-flex h-11 items-center justify-center rounded-sm bg-neutral-100 dark:bg-white/5 px-6 text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white transition hover:bg-neutral-200 dark:hover:bg-white/10">
          Back to chat
        </Link>
      </div>
    </main>
  )
}
