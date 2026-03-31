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
      className={`fixed right-0 top-0 z-40 h-full w-full border-l border-border bg-card p-5 shadow-2xl transition-transform duration-300 sm:w-96 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">Rule Reference</h3>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close rule panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!rule ? (
        <p className="text-sm text-muted-foreground">Select a citation to view full rule details.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Rule ID</p>
            <p className="mt-1 font-medium text-foreground">{rule.rule_id}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Reference</p>
            <p className="mt-1 font-medium text-foreground">
              {rule.rulebook} {rule.reference}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Title</p>
            <p className="mt-1 font-medium text-foreground">{rule.title ?? 'Untitled rule'}</p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Rule Text</p>
            <p className="mt-1 rounded-lg border border-[hsl(var(--border-subtle))] bg-surface-raised p-4 font-mono text-sm leading-relaxed text-foreground">
              {rule.text ?? 'Full text unavailable from backend.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
