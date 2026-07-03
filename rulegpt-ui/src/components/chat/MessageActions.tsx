import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Copy, Bookmark, FileText, Loader2, PenLine, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { DraftType } from '@/types'

interface MessageActionsProps {
  canSave?: boolean
  canGenerateArtifacts?: boolean
  isGeneratingCaseNote?: boolean
  generatingDraftType?: DraftType | null
  onCopy: () => void
  onSave: () => void
  onShare: () => void
  onThumbsUp: () => void
  onThumbsDown: () => void
  onGenerateCaseNote?: () => void
  onGenerateDraft?: (draftType: DraftType) => void
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

const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
  bank_response: 'Bank response',
  buyer_email: 'Buyer email',
  waiver_request: 'Waiver request',
  amendment_request: 'Amendment request',
  discrepancy_explanation: 'Discrepancy explanation',
}

const DRAFT_TYPES = Object.keys(DRAFT_TYPE_LABELS) as DraftType[]

function DraftDropdown({
  disabled,
  generatingDraftType,
  onGenerateDraft,
}: {
  disabled?: boolean
  generatingDraftType?: DraftType | null
  onGenerateDraft?: (draftType: DraftType) => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isGenerating = Boolean(generatingDraftType)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        style={{ ...actionBtnStyle, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
        className="btn-ghost"
        disabled={disabled || isGenerating}
        onClick={() => setOpen((v) => !v)}
      >
        {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
        Draft response <ChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-52 rounded-sm border border-neutral-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#141414]">
          {DRAFT_TYPES.map((draftType) => (
            <button
              key={draftType}
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
              onClick={() => {
                setOpen(false)
                onGenerateDraft?.(draftType)
              }}
            >
              {DRAFT_TYPE_LABELS[draftType]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function MessageActions({
  canSave = true,
  canGenerateArtifacts = true,
  isGeneratingCaseNote,
  generatingDraftType,
  onCopy,
  onSave,
  onShare,
  onThumbsUp,
  onThumbsDown,
  onGenerateCaseNote,
  onGenerateDraft,
}: MessageActionsProps) {
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
        style={{ ...actionBtnStyle, opacity: canGenerateArtifacts ? 1 : 0.4, cursor: canGenerateArtifacts ? 'pointer' : 'not-allowed' }}
        className="btn-ghost"
        disabled={!canGenerateArtifacts || isGeneratingCaseNote}
        onClick={onGenerateCaseNote}
      >
        {isGeneratingCaseNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        Generate case note
      </button>
      <DraftDropdown
        disabled={!canGenerateArtifacts}
        generatingDraftType={generatingDraftType}
        onGenerateDraft={onGenerateDraft}
      />
      <button
        type="button"
        style={{ ...iconBtnStyle, color: feedback === 'up' ? '#FF4F00' : undefined }}
        className="btn-ghost"
        disabled={feedback !== null}
        onClick={() => { setFeedback('up'); onThumbsUp() }}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        style={{ ...iconBtnStyle, color: feedback === 'down' ? '#FF4F00' : undefined }}
        className="btn-ghost"
        disabled={feedback !== null}
        onClick={() => { setFeedback('down'); onThumbsDown() }}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
