import type { ConfidenceBand } from '@/types'

const BAND_CLASS: Record<ConfidenceBand, string> = {
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceBand }) {
  return (
    <span className={BAND_CLASS[confidence]}>
      {confidence.toUpperCase()}
    </span>
  )
}
