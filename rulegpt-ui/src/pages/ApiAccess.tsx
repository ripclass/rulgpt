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
    enabled: Boolean(auth.user) && auth.tier === 'pro',
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
    <main
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10"
      style={{ background: 'var(--color-obsidian)', fontFamily: 'var(--font-body)' }}
    >
      <div className="card-dark rounded-2xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--color-amber)' }}>API Access</p>
        <h1 className="heading-lg mt-2" style={{ color: 'var(--color-parchment)' }}>Programmatic tfrules queries</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Endpoint:{' '}
          <code
            className="rounded px-1 py-0.5"
            style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-surface-raised)', color: 'var(--color-amber)' }}
          >
            POST /api/v1/query
          </code>
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Auth and API key issuance are backend placeholders today. This page validates usage endpoint readiness.
        </p>

        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          {auth.tier !== 'pro' ? (
            <p>Upgrade to Pro to unlock API usage metrics.</p>
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

        <Link to="/chat" className="btn-secondary mt-5 inline-block rounded-md px-5 py-2 text-sm">
          Back to chat
        </Link>
      </div>
    </main>
  )
}
