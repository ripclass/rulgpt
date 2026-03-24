import type {
  HistoryItem,
  QueryRequest,
  QueryResponse,
  QuerySuggestion,
  RuleDetails,
  SavedAnswer,
} from '@/types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export interface RequestIdentity {
  userId?: string
  tier?: 'anonymous' | 'free' | 'pro'
}

function identityHeaders(identity?: RequestIdentity) {
  return {
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
}

export { API_BASE_URL }
