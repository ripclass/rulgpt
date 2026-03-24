import { Badge } from '@/components/ui/badge'
import type { DomainType } from '@/types'

const DOMAIN_STYLES: Record<DomainType, string> = {
  icc: 'bg-blue-500/15 text-blue-300 border-blue-500/35',
  sanctions: 'bg-red-500/15 text-red-300 border-red-500/35',
  fta: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
  customs: 'bg-violet-500/15 text-violet-300 border-violet-500/35',
  bank_specific: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
  other: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/35',
}

const LABELS: Record<DomainType, string> = {
  icc: 'ICC standards',
  sanctions: 'Sanctions',
  fta: 'FTA',
  customs: 'Customs',
  bank_specific: 'Bank specific',
  other: 'Other',
}

export function DomainTag({ domain }: { domain: DomainType }) {
  return <Badge className={DOMAIN_STYLES[domain]}>{LABELS[domain]}</Badge>
}
