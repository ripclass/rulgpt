import { Printer } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CitationChip } from '@/components/chat/CitationChip'
import type { ArtifactResponse, Citation } from '@/types'

interface ArtifactViewProps {
  open: boolean
  artifact: ArtifactResponse | null
  onOpenChange: (open: boolean) => void
  onCitationClick?: (citation: Citation) => void
}

/** Footer disclaimer is always rendered exactly as returned — this literal is only a display fallback. */
const FALLBACK_DISCLAIMER = 'Advisory only — not legal advice.'

export function ArtifactView({ open, artifact, onOpenChange, onCitationClick }: ArtifactViewProps) {
  if (!artifact) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-neutral-200 bg-white dark:border-white/10 dark:bg-[#121212] rounded-sm">
        <div className="artifact-print-area">
          <DialogHeader>
            <DialogTitle className="text-neutral-900 dark:text-white">{artifact.title}</DialogTitle>
            <DialogDescription className="sr-only">Generated artifact</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center justify-end gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-sm border border-neutral-200 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-900 transition hover:bg-neutral-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <Printer className="h-3.5 w-3.5" /> Download PDF
            </button>
          </div>

          <article className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100">
            {artifact.body_markdown}
          </article>

          {artifact.citations.length > 0 ? (
            <div className="mt-6 border-t border-neutral-100 pt-4 dark:border-white/5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Referenced Articles</p>
              <div className="flex flex-wrap gap-2">
                {artifact.citations.map((citation) => (
                  <CitationChip
                    key={`${citation.rule_id}-${citation.reference}`}
                    citation={citation}
                    onClick={(c) => onCitationClick?.(c)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <p className="mt-6 border-t border-neutral-100 pt-4 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:border-white/5 dark:text-neutral-600">
            {artifact.disclaimer || FALLBACK_DISCLAIMER}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
