import { X } from 'lucide-react'
import type { RuleDetails } from '@/types'

interface CitationPanelProps {
  open: boolean
  rule: RuleDetails | null
  onClose: () => void
}

function formatReference(rule: RuleDetails): string {
  const ref = rule.reference?.trim()
  const isUnknown = !ref || ref === 'unknown' || ref === 'n/a' || ref === 'null'
  if (isUnknown) {
    // Fall back to title or rulebook
    return rule.title || rule.rulebook || rule.rule_id
  }
  return rule.rulebook ? `${rule.rulebook} ${ref}` : ref
}

export function CitationPanel({ open, rule, onClose }: CitationPanelProps) {
  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full sm:w-96 flex flex-col ${
        open ? 'citation-panel-enter' : 'translate-x-full'
      }`}
      style={{
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Header — fixed */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ padding: 'var(--space-lg) var(--space-lg) var(--space-sm)' }}
      >
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

      {/* Content — scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '0 var(--space-lg) var(--space-lg)' }}
      >
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
                Reference
              </p>
              <p className="mt-1 font-medium" style={{ color: 'var(--color-parchment)' }}>
                {formatReference(rule)}
              </p>
            </div>
            {rule.title && (
              <div>
                <p
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                >
                  Title
                </p>
                <p className="mt-1 font-medium" style={{ color: 'var(--color-parchment)' }}>
                  {rule.title}
                </p>
              </div>
            )}
            {rule.domain && (
              <div>
                <p
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                >
                  Domain
                </p>
                <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {rule.domain}{rule.jurisdiction && rule.jurisdiction !== 'global' ? ` / ${rule.jurisdiction}` : ''}
                </p>
              </div>
            )}
            {rule.text && (
              <div>
                <p
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                >
                  Rule Text
                </p>
                <div
                  className="mt-1 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-parchment)',
                    fontSize: '12px',
                    lineHeight: '1.6',
                  }}
                >
                  {rule.text}
                </div>
              </div>
            )}
            {!rule.text && (
              <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
                Full rule text not available for this entry.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
