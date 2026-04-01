import { X } from 'lucide-react'
import type { RuleDetails } from '@/types'

interface CitationPanelProps {
  open: boolean
  rule: RuleDetails | null
  onClose: () => void
}

export function CitationPanel({ open, rule, onClose }: CitationPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full sm:w-96 ${
        open ? 'citation-panel-enter' : 'translate-x-full'
      }`}
      style={{
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        padding: 'var(--space-lg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-lg"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
        >
          Rule Reference
        </h3>
        <button
          type="button"
          className="btn-ghost p-1.5 rounded"
          onClick={onClose}
          aria-label="Close rule panel"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!rule ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Select a citation to view full rule details.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              Rule ID
            </p>
            <p className="mt-1 font-medium" style={{ color: 'var(--color-parchment)' }}>
              {rule.rule_id}
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              Reference
            </p>
            <p className="mt-1 font-medium" style={{ color: 'var(--color-parchment)' }}>
              {rule.rulebook} {rule.reference}
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              Title
            </p>
            <p className="mt-1 font-medium" style={{ color: 'var(--color-parchment)' }}>
              {rule.title ?? 'Untitled rule'}
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            >
              Rule Text
            </p>
            <p
              className="mt-1 rounded-lg p-4 text-sm leading-relaxed"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-parchment)',
              }}
            >
              {rule.text ?? 'Full text unavailable from backend.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
