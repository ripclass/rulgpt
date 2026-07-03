function readBooleanEnv(name: string, defaultValue = false) {
  const value = import.meta.env[name] as string | undefined
  if (value === undefined) return defaultValue
  return !['false', '0', 'off', 'no'].includes(value.toLowerCase())
}

export function isPreviewModeEnabled() {
  // Live by default (2026-07 Phase 4 launch) — set VITE_PREVIEW_MODE=true to force the product-shell preview.
  return readBooleanEnv('VITE_PREVIEW_MODE', false)
}
