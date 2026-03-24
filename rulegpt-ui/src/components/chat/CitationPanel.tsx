import { X } from 'lucide-react'
import type { RuleDetails } from '@/types'
import { Button } from '@/components/ui/button'

interface CitationPanelProps {
  open: boolean
  rule: RuleDetails | null
  onClose: () => void
}

export function CitationPanel({ open, rule, onClose }: CitationPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md border-l border-border bg-[#0d0d0d]/95 p-5 shadow-2xl backdrop-blur transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Rule Reference</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close rule panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!rule ? (
        <p className="text-sm text-muted-foreground">Select a citation to view full rule details.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rule ID</p>
            <p className="font-medium">{rule.rule_id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
            <p className="font-medium">
              {rule.rulebook} {rule.reference}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Title</p>
            <p className="font-medium">{rule.title ?? 'Untitled rule'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Rule Text</p>
            <p className="leading-relaxed text-foreground/90">{rule.text ?? 'Full text unavailable from backend.'}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
