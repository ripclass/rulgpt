import type {
  ArtifactKind,
  ArtifactResponse,
  BillingPlan,
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingSubscriptionResponse,
  CheckoutOneoffResponse,
  DraftType,
  InterpretResponse,
  QueryRequest,
  QueryResponse,
  QuerySuggestion,
  RuleDetails,
  SavedAnswer,
  SessionSummary,
  SessionTier,
} from '@/types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
const AUTH_ACCESS_TOKEN_KEY = 'rulegpt_auth_access_token'

let currentAccessToken: string | null = readStoredAccessToken()

export class ApiError extends Error {
  status: number
  /** Parsed JSON `detail` field, when the backend sent a structured error body (e.g. the 402 paywall payload). */
  detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export interface AuthStatusResponse {
  supabase_url_configured: boolean
  issuer_configured: boolean
  jwks_configured: boolean
  service_role_configured: boolean
  jwt_verification_ready: boolean
  admin_user_sync_ready: boolean
  authenticated: boolean
  tier: SessionTier
  user_id: string | null
  auth_issuer: string | null
  auth_error: string | null
  blockers: string[]
}

export interface StatsResponse {
  total_rules: number | null
}

export interface BillingConfigStatusResponse {
  stripe_configured: boolean
  secret_key_configured: boolean
  webhook_secret_configured: boolean
  professional_monthly_price_configured: boolean
  professional_annual_price_configured: boolean
  enterprise_monthly_price_configured: boolean
  enterprise_annual_price_configured: boolean
  pro_monthly_price_configured: boolean
  checkout_ready: boolean
  webhook_ready: boolean
  supported_plans: BillingPlan[]
  supported_intervals: Array<'monthly' | 'annual'>
  blockers: string[]
}

function readStoredAccessToken() {
  try {
    return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function getApiAccessToken() {
  return currentAccessToken ?? readStoredAccessToken()
}

export function setApiAccessToken(accessToken: string | null) {
  currentAccessToken = accessToken
  try {
    if (accessToken) {
      localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken)
    } else {
      localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY)
    }
  } catch {
    // Ignore storage failures in private browsing or test environments.
  }
}

function buildHeaders(headers: HeadersInit | undefined, accessToken?: string | null) {
  const nextHeaders = new Headers(headers)
  const token = accessToken ?? getApiAccessToken()
  if (token && !nextHeaders.has('Authorization')) {
    nextHeaders.set('Authorization', `Bearer ${token}`)
  }
  return nextHeaders
}

function shouldAttachAuth(url: string) {
  return url.startsWith(API_BASE_URL)
}

function patchFetch() {
  const globalScope = globalThis as typeof globalThis & { __rulegptFetchPatched__?: boolean }
  if (globalScope.__rulegptFetchPatched__ || typeof fetch !== 'function') return

  const nativeFetch = fetch.bind(globalThis)
  globalScope.__rulegptFetchPatched__ = true
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url
    if (!shouldAttachAuth(url)) {
      return nativeFetch(input, init)
    }
    const headers = buildHeaders(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    return nativeFetch(input, {
      ...init,
      headers,
    })
  }) as typeof fetch
}

patchFetch()

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders({
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    }),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const raw = await response.text()
    let message = raw || `Request failed with status ${response.status}`
    let detail: unknown
    try {
      const parsed = JSON.parse(raw)
      detail = parsed.detail
      if (typeof parsed.detail === 'string') message = parsed.detail
      else if (typeof parsed.message === 'string') message = parsed.message
      else if (parsed.detail && typeof parsed.detail === 'object') {
        const structuredMessage = (parsed.detail as { error?: string }).error
        if (structuredMessage) message = structuredMessage
      }
    } catch {
      // raw text is fine as-is
    }
    throw new ApiError(message, response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface RequestIdentity {
  userId?: string
  tier?: SessionTier
  accessToken?: string | null
}

interface SseFrame {
  event: string | null
  data: Record<string, unknown> | null
}

function parseSseFrame(block: string): SseFrame {
  let event: string | null = null
  let dataRaw: string | null = null
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim()
    else if (line.startsWith('data:')) dataRaw = line.slice('data:'.length).trim()
  }
  let data: Record<string, unknown> | null = null
  if (dataRaw) {
    try {
      data = JSON.parse(dataRaw)
    } catch {
      data = null
    }
  }
  return { event, data }
}

export interface StreamCallbacks {
  /** Called for each incremental answer chunk as it arrives. */
  onToken: (delta: string) => void
}

/**
 * Stream an answer from POST /api/query/stream (Server-Sent Events). Invokes
 * `onToken` for each chunk and resolves with the finalized QueryResponse.
 * Throws ApiError on a non-200 (e.g. 429 quota, before the stream) or on a
 * mid-stream `error` event — callers can fall back to the non-streaming
 * `submitQuery` on network/5xx failures.
 */
async function streamQuery(
  payload: QueryRequest,
  identity: RequestIdentity | undefined,
  callbacks: StreamCallbacks,
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/query/stream`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json', ...identityHeaders(identity) }),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const raw = await response.text()
    let message = raw || `Request failed with status ${response.status}`
    let detail: unknown
    try {
      const parsed = JSON.parse(raw)
      detail = parsed.detail
      if (typeof parsed.detail === 'string') message = parsed.detail
      else if (typeof parsed.message === 'string') message = parsed.message
    } catch {
      // raw text is fine as-is
    }
    throw new ApiError(message, response.status, detail)
  }
  if (!response.body) {
    throw new ApiError('Streaming not supported by this browser', 0)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: QueryResponse | null = null
  let streamError: ApiError | null = null

  const handleBlock = (block: string) => {
    const { event, data } = parseSseFrame(block)
    if (!event) return
    if (event === 'token' && data) callbacks.onToken(String(data.delta ?? ''))
    else if (event === 'done' && data) done = data as unknown as QueryResponse
    else if (event === 'error' && data) {
      streamError = new ApiError(String(data.message ?? 'Request failed'), Number(data.status ?? 500))
    }
  }

  for (;;) {
    const { value, done: readerDone } = await reader.read()
    if (readerDone) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      handleBlock(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 2)
    }
  }
  if (buffer.trim()) handleBlock(buffer)

  if (streamError) throw streamError
  if (!done) throw new ApiError('Stream ended without a result', 0)
  return done
}

function identityHeaders(identity?: RequestIdentity) {
  return {
    ...(identity?.accessToken ? { Authorization: `Bearer ${identity.accessToken}` } : {}),
    ...(identity?.userId ? { 'x-user-id': identity.userId } : {}),
    ...(identity?.tier ? { 'x-user-tier': identity.tier } : {}),
  }
}

export const api = {
  getStats: () => request<StatsResponse>('/api/stats'),
  getSuggestions: () => request<QuerySuggestion[]>('/api/suggestions'),
  getRule: (ruleId: string) => request<RuleDetails>(`/api/rules/${ruleId}`),
  submitQuery: (payload: QueryRequest, identity?: RequestIdentity) =>
    request<QueryResponse>('/api/query', {
      method: 'POST',
      body: payload,
      headers: identityHeaders(identity),
    }),
  streamQuery,
  getHistory: (identity: RequestIdentity) =>
    request<SessionSummary[]>('/api/history', {
      headers: identityHeaders(identity),
    }),
  listSaved: (identity: RequestIdentity) =>
    request<SavedAnswer[]>('/api/saved', {
      headers: identityHeaders(identity),
    }),
  saveAnswer: (queryId: string, note: string | null, identity: RequestIdentity) =>
    request<SavedAnswer>(`/api/save/${queryId}`, {
      method: 'POST',
      body: { note },
      headers: identityHeaders(identity),
    }),
  deleteSaved: (savedId: string, identity: RequestIdentity) =>
    request<void>(`/api/saved/${savedId}`, {
      method: 'DELETE',
      headers: identityHeaders(identity),
    }),
  submitFeedback: (queryId: string, feedbackType: 'thumbs_up' | 'thumbs_down') =>
    request<{ id: string; feedback_type: string }>(`/api/feedback/${queryId}`, {
      method: 'POST',
      body: { feedback_type: feedbackType },
    }),
  getAuthStatus: () => request<AuthStatusResponse>('/api/auth/status'),
  getBillingStatus: () => request<BillingConfigStatusResponse>('/api/billing/status'),
  createBillingCheckout: (payload: BillingCheckoutRequest, identity: RequestIdentity) =>
    request<BillingCheckoutResponse>('/api/billing/checkout', {
      method: 'POST',
      body: payload,
      headers: identityHeaders(identity),
    }),
  getBillingSubscription: (identity: RequestIdentity) =>
    request<BillingSubscriptionResponse>('/api/billing/subscription', {
      headers: identityHeaders(identity),
    }),
  interpretMt700: (text: string, identity?: RequestIdentity) =>
    request<InterpretResponse>('/api/interpret/mt700', {
      method: 'POST',
      body: { text },
      headers: identityHeaders(identity),
    }),
  createCaseNote: (queryId: string, identity: RequestIdentity) =>
    request<ArtifactResponse>('/api/artifacts/case-note', {
      method: 'POST',
      body: { query_id: queryId },
      headers: identityHeaders(identity),
    }),
  createDraft: (queryId: string, draftType: DraftType, identity: RequestIdentity) =>
    request<ArtifactResponse>('/api/artifacts/draft', {
      method: 'POST',
      body: { query_id: queryId, draft_type: draftType },
      headers: identityHeaders(identity),
    }),
  createOneoffCheckout: (
    kind: ArtifactKind,
    payload: { success_url: string; cancel_url: string; customer_email?: string | null },
    identity: RequestIdentity,
  ) =>
    request<CheckoutOneoffResponse>('/api/billing/checkout-oneoff', {
      method: 'POST',
      body: { kind, ...payload },
      headers: identityHeaders(identity),
    }),
}

export { API_BASE_URL }
