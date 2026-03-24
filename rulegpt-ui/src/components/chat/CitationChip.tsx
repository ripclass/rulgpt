import type { Citation } from '@/types'

interface CitationChipProps {
  citation: Citation
  onClick: (citation: Citation) => void
}

export function CitationChip({ citation, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground transition hover:border-primary/60 hover:text-primary"
      onClick={() => onClick(citation)}
    >
      {citation.rulebook} {citation.reference}
    </button>
  )
}
