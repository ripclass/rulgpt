import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('api auth transport', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('adds bearer auth to request helpers and same-origin API fetches', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => [],
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { api, API_BASE_URL, setApiAccessToken } = await import('@/lib/api')

    setApiAccessToken('stored-token')
    await api.getHistory({ userId: 'user-1', tier: 'pro' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const historyInit = fetchMock.mock.calls[0][1] as RequestInit
    const historyHeaders = new Headers(historyInit.headers)
    expect(historyHeaders.get('Authorization')).toBe('Bearer stored-token')
    expect(historyHeaders.get('x-user-id')).toBe('user-1')
    expect(historyHeaders.get('x-user-tier')).toBe('pro')

    fetchMock.mockClear()
    await fetch(`${API_BASE_URL}/api/usage`)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const usageInit = fetchMock.mock.calls[0][1] as RequestInit
    const usageHeaders = new Headers(usageInit.headers)
    expect(usageHeaders.get('Authorization')).toBe('Bearer stored-token')
  })
})
