type EventPayload = Record<string, unknown>

const DEFAULT_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000'

const TELEMETRY_EVENTS_ENDPOINT =
  ((import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined)?.trim() ||
    `${DEFAULT_API_BASE_URL}/api/telemetry/events`).replace(/\/$/, '')

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

export function track(eventName: string, payload: EventPayload = {}) {
  const enrichedPayload = {
    event: eventName,
    payload,
    path: typeof window !== 'undefined' ? window.location.pathname : null,
    source: 'web',
    occurred_at: new Date().toISOString(),
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', enrichedPayload)
  }

  safePost(TELEMETRY_EVENTS_ENDPOINT, enrichedPayload)
}
