function readBooleanEnv(name: string, defaultValue = false) {
  const value = import.meta.env[name] as string | undefined
  if (value === undefined) return defaultValue
  return !['false', '0', 'off', 'no'].includes(value.toLowerCase())
}

export function isPreviewModeEnabled() {
  return readBooleanEnv('VITE_PREVIEW_MODE', true)
}
