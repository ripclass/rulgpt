import type {
  BillingPlan,
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingSubscriptionResponse,
  HistoryItem,
  QueryRequest,
  QueryResponse,
  QuerySuggestion,
  RuleDetails,
  SavedAnswer,
} from '@/types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'
const AUTH_ACCESS_TOKEN_KEY = 'rulegpt_auth_access_token'

let currentAccessToken: string | null = readStoredAccessToken()

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
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
  tier: 'anonymous' | 'free' | 'starter' | 'pro'
  user_id: string | null
  auth_issuer: string | null
  auth_error: string | null
  blockers: string[]
}

export interface BillingConfigStatusResponse {
  stripe_configured: boolean
  secret_key_configured: boolean
  webhook_secret_configured: boolean
  starter_monthly_price_configured: boolean
  starter_annual_price_configured: boolean
  pro_monthly_price_configured: boolean
  pro_annual_price_configured: boolean
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
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed.detail === 'string') message = parsed.detail
      else if (typeof parsed.message === 'string') message = parsed.message
    } catch {
      // raw text is fine as-is
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface RequestIdentity {
  userId?: string
  tier?: 'anonymous' | 'free' | 'starter' | 'pro'
  accessToken?: string | null
}

function identityHeaders(identity?: RequestIdentity) {
  return {
    ...(identity?.accessToken ? { Authorization: `Bearer ${identity.accessToken}` } : {}),
    ...(identity?.userId ? { 'x-user-id': identity.userId } : {}),
    ...(identity?.tier ? { 'x-user-tier': identity.tier } : {}),
  }
}

export const api = {
  getSuggestions: () => request<QuerySuggestion[]>('/api/suggestions'),
  getRule: (ruleId: string) => request<RuleDetails>(`/api/rules/${ruleId}`),
  submitQuery: (payload: QueryRequest, identity?: RequestIdentity) =>
    request<QueryResponse>('/api/query', {
      method: 'POST',
      body: payload,
      headers: identityHeaders(identity),
    }),
  getHistory: (identity: RequestIdentity) =>
    request<HistoryItem[]>('/api/history', {
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
}

export { API_BASE_URL }
