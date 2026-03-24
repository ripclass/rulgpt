type EventPayload = Record<string, unknown>

export function track(eventName: string, payload: EventPayload = {}) {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', eventName, payload)
  }
}
