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
      className="citation-chip inline-flex items-center gap-1.5 cursor-pointer"
      onClick={() => onClick(citation)}
    >
      <FileText className="h-3 w-3" />
      {citation.rulebook} {citation.reference}
    </button>
  )
}
