const DEFAULT_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

const TELEMETRY_ERRORS_ENDPOINT =
  ((import.meta.env.VITE_ERROR_REPORTING_ENDPOINT as string | undefined)?.trim() ||
    `${DEFAULT_API_BASE_URL}/api/telemetry/frontend-errors`).replace(/\/$/, '')

type ErrorMetadata = Record<string, unknown>

function safePost(url: string, payload: unknown) {
  const body = JSON.stringify(payload)

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
      return
    }
  } catch {
    // Ignore and fall back to fetch.
  }

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export function reportFrontendError(error: unknown, metadata: ErrorMetadata = {}) {
  const normalized =
    error instanceof Error
      ? { message: error.message, stack: error.stack ?? null }
      : { message: String(error), stack: null }

  const payload = {
    message: normalized.message,
    stack: normalized.stack,
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    source: 'web',
    occurred_at: new Date().toISOString(),
    metadata,
  }

  if (import.meta.env.DEV) {
    console.error('[monitoring]', payload)
  }

  safePost(TELEMETRY_ERRORS_ENDPOINT, payload)
}

export function installGlobalErrorHandlers() {
  const globalScope = globalThis as typeof globalThis & { __rulegptMonitoringInstalled__?: boolean }
  if (globalScope.__rulegptMonitoringInstalled__ || typeof window === 'undefined') return

  globalScope.__rulegptMonitoringInstalled__ = true

  window.addEventListener('error', (event) => {
    reportFrontendError(event.error ?? event.message, {
      kind: 'window.error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportFrontendError(event.reason, { kind: 'window.unhandledrejection' })
  })
}
