import type { DomainType } from '@/types'

const LABELS: Record<DomainType, string> = {
  icc: 'ICC standards',
  sanctions: 'Sanctions',
  fta: 'FTA',
  customs: 'Customs',
  bank_specific: 'Bank specific',
  other: 'Other',
}

export function DomainTag({ domain }: { domain: DomainType }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs"
      style={{
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      {LABELS[domain]}
    </span>
  )
}
