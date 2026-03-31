import { FileText } from 'lucide-react'
import type { Citation } from '@/types'

interface CitationChipProps {
  citation: Citation
  onClick: (citation: Citation) => void
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-amber-muted/20 px-3 py-1 text-xs font-mono text-primary transition-colors hover:bg-amber-muted/40 hover:border-primary/50 cursor-pointer"
      onClick={() => onClick(citation)}
    >
      <FileText className="h-3 w-3" />
      {citation.rulebook} {citation.reference}
    </button>
  )
}
