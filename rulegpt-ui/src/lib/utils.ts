import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateLabel(isoTime: string): string {
  const date = new Date(isoTime)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function groupedByDate<T extends { created_at?: string; createdAt?: string; saved_at?: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const value = item.created_at ?? item.createdAt ?? item.saved_at ?? new Date().toISOString()
    const key = formatDateLabel(value)
    acc[key] = [...(acc[key] ?? []), item]
    return acc
  }, {})
}
