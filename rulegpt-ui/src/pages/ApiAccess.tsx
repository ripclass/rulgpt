import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '@/lib/api'
import { Button } from '@/components/ui/button'
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center bg-background px-4 py-10">
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-wide text-primary">API Access</p>
        <h1 className="mt-2 text-2xl font-semibold">Programmatic tfrules queries</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Endpoint: <code className="rounded bg-secondary px-1 py-0.5">POST /api/v1/query</code>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Auth and API key issuance are backend placeholders today. This page validates usage endpoint readiness.
        </p>

        <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm">
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

        <Button asChild variant="outline" className="mt-5">
          <Link to="/chat">Back to chat</Link>
        </Button>
      </div>
    </main>
  )
}
