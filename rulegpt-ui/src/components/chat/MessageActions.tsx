import { useState } from 'react'
import { Copy, Bookmark, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'

interface MessageActionsProps {
  canSave?: boolean
  onCopy: () => void
  onSave: () => void
  onShare: () => void
  onThumbsUp: () => void
  onThumbsDown: () => void
}

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  fontSize: '12px',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-secondary)',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'color var(--duration-fast) var(--ease-default), background var(--duration-fast) var(--ease-default)',
}

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  color: 'var(--color-text-secondary)',
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  transition: 'color var(--duration-fast) var(--ease-default), background var(--duration-fast) var(--ease-default)',
}

export function MessageActions({ canSave = true, onCopy, onSave, onShare, onThumbsUp, onThumbsDown }: MessageActionsProps) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-2 pt-3 opacity-0 transition-opacity group-hover:opacity-100"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <button type="button" style={actionBtnStyle} className="btn-ghost" onClick={onCopy}>
        <Copy className="h-3.5 w-3.5" /> Copy
      </button>
      <button
        type="button"
        style={{ ...actionBtnStyle, opacity: canSave ? 1 : 0.4, cursor: canSave ? 'pointer' : 'not-allowed' }}
        className="btn-ghost"
        disabled={!canSave}
        onClick={onSave}
      >
        <Bookmark className="h-3.5 w-3.5" /> Save
      </button>
      <button type="button" style={actionBtnStyle} className="btn-ghost" onClick={onShare}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      <button
        type="button"
        style={{ ...iconBtnStyle, color: feedback === 'up' ? '#B2F273' : undefined }}
        className="btn-ghost"
        disabled={feedback !== null}
        onClick={() => { setFeedback('up'); onThumbsUp() }}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        style={{ ...iconBtnStyle, color: feedback === 'down' ? '#B2F273' : undefined }}
        className="btn-ghost"
        disabled={feedback !== null}
        onClick={() => { setFeedback('down'); onThumbsDown() }}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
