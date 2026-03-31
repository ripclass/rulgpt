import { Badge } from '@/components/ui/badge'
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
    <Badge className="bg-surface-raised text-muted-foreground border border-border text-xs rounded-full px-2.5 py-0.5 font-mono">
      {LABELS[domain]}
    </Badge>
  )
}
