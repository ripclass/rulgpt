import { Badge } from '@/components/ui/badge'
import type { ConfidenceBand } from '@/types'

const BAND_STYLE: Record<ConfidenceBand, string> = {
  high: 'bg-success/10 text-success border border-success/20 text-xs font-mono uppercase rounded-full px-2 py-0.5',
  medium: 'bg-warning/10 text-warning border border-warning/20 text-xs font-mono uppercase rounded-full px-2 py-0.5',
  low: 'bg-error/10 text-error border border-error/20 text-xs font-mono uppercase rounded-full px-2 py-0.5',
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceBand }) {
  return <Badge className={BAND_STYLE[confidence]}>{confidence.toUpperCase()}</Badge>
}
