import { Badge } from '@/components/ui/badge'
import type { ConfidenceBand } from '@/types'

const BAND_STYLE: Record<ConfidenceBand, string> = {
  high: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  low: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceBand }) {
  return <Badge className={BAND_STYLE[confidence]}>{confidence.toUpperCase()}</Badge>
}
