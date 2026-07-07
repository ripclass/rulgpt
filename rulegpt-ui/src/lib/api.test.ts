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
    await api.getHistory({ userId: 'user-1', tier: 'professional' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const historyInit = fetchMock.mock.calls[0][1] as RequestInit
    const historyHeaders = new Headers(historyInit.headers)
    expect(historyHeaders.get('Authorization')).toBe('Bearer stored-token')
    expect(historyHeaders.get('x-user-id')).toBe('user-1')
    expect(historyHeaders.get('x-user-tier')).toBe('professional')

    fetchMock.mockClear()
    await fetch(`${API_BASE_URL}/api/usage`)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const usageInit = fetchMock.mock.calls[0][1] as RequestInit
    const usageHeaders = new Headers(usageInit.headers)
    expect(usageHeaders.get('Authorization')).toBe('Bearer stored-token')
  })
})

describe('api.streamQuery (SSE)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  function sseResponse(frames: string[]) {
    const enc = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const f of frames) controller.enqueue(enc.encode(f))
        controller.close()
      },
    })
    return { ok: true, status: 200, body: stream, text: async () => '', json: async () => ({}) }
  }

  it('parses token frames and resolves the final done payload', async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: token\ndata: {"delta":"Under UCP600 "}\n\n',
        'event: token\ndata: {"delta":"Article 14 applies."}\n\n',
        'event: done\ndata: {"query_id":"q1","answer":"Under UCP600 Article 14 applies.","citations":[],"confidence_band":"high","suggested_followups":["f1"],"queries_remaining":4,"tier":"free","show_trdr_cta":false,"trdr_cta_text":null,"trdr_cta_url":null,"disclaimer":"d"}\n\n',
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await import('@/lib/api')

    const tokens: string[] = []
    const res = await api.streamQuery(
      { query: 'q', session_token: 't', language: 'en' },
      undefined,
      { onToken: (d) => tokens.push(d) },
    )
    expect(tokens.join('')).toBe('Under UCP600 Article 14 applies.')
    expect(res.answer).toBe('Under UCP600 Article 14 applies.')
    expect(res.confidence_band).toBe('high')
    expect(res.queries_remaining).toBe(4)
  })

  it('handles SSE frames split across chunk boundaries', async () => {
    const fetchMock = vi.fn(async () =>
      sseResponse([
        'event: token\ndata: {"del',
        'ta":"Hello "}\n\nevent: token\ndata: {"delta":"world."}\n\n',
        'event: done\ndata: {"query_id":"q2","answer":"Hello world.","citations":[],"confidence_band":"medium","suggested_followups":[],"queries_remaining":1,"tier":"free","show_trdr_cta":false,"trdr_cta_text":null,"trdr_cta_url":null,"disclaimer":"d"}\n\n',
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await import('@/lib/api')

    const tokens: string[] = []
    const res = await api.streamQuery(
      { query: 'q', session_token: 't', language: 'en' },
      undefined,
      { onToken: (d) => tokens.push(d) },
    )
    expect(tokens.join('')).toBe('Hello world.')
    expect(res.answer).toBe('Hello world.')
  })

  it('throws ApiError on a non-200 (e.g. 429 quota) before streaming', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      body: null,
      text: async () => JSON.stringify({ detail: "You've hit today's limit." }),
      json: async () => ({}),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const { api, ApiError } = await import('@/lib/api')

    await expect(
      api.streamQuery({ query: 'q', session_token: 't', language: 'en' }, undefined, { onToken: () => {} }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
