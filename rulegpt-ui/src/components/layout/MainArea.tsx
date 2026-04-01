import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ChatThread } from '@/components/chat/ChatThread'
import { QueryInput } from '@/components/input/QueryInput'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'
import { RuxMascot } from '@/components/shared/RuxMascot'
import type { Citation, Message } from '@/types'

interface MainAreaProps {
  messages: Message[]
  suggestions: string[]
  isLoading: boolean
  error: string | null
  canSave: boolean
  activeQuickCategory?: string | null
  previewMode?: boolean
  onSubmitQuery: (query: string) => Promise<void>
  onPickSuggestion: (value: string) => void
  onCitationClick: (citation: Citation) => void
  onSaveMessage: (queryId: string) => void
  onNewQuery?: () => void
}

export function MainArea({
  messages,
  suggestions,
  isLoading,
  error,
  canSave,
  activeQuickCategory,
  previewMode,
  onSubmitQuery,
  onPickSuggestion,
  onCitationClick,
  onSaveMessage,
  onNewQuery,
}: MainAreaProps) {
  const isEmpty = messages.length === 0
  const placeholder = activeQuickCategory
    ? `Ask about ${activeQuickCategory.toLowerCase()}...`
    : 'Ask about any trade finance rule...'

  return (
    <main
      className="flex min-h-screen flex-1 flex-col pb-28 md:pb-0"
      style={{ background: 'var(--color-obsidian)' }}
    >
      <header
        className="px-4 py-4 md:px-8"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(17,17,17,0.9)', backdropFilter: 'blur(8px)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="wordmark wordmark--on-dark text-lg">tfrules</span>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {previewMode ? 'Preview workspace' : 'Cited trade finance answers'}
              </p>
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={
                previewMode
                  ? { background: 'var(--color-amber-muted)', color: 'var(--color-amber)', border: '1px solid var(--color-amber-muted)' }
                  : { background: 'rgba(16,185,129,0.1)', color: 'var(--color-confidence-high)', border: '1px solid rgba(16,185,129,0.3)' }
              }
            >
              {previewMode ? 'Preview' : 'Live'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-md px-3 py-2 text-xs transition"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface-raised)' }}
            >
              Public site
            </Link>

            {!isEmpty && onNewQuery ? (
              <button
                type="button"
                onClick={onNewQuery}
                className="rounded-md px-3 py-2 text-xs transition"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-surface-raised)' }}
              >
                New chat
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {isEmpty ? (
        <section className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
            {error ? (
              <div
                className="mb-6 flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm"
                style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}
              >
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center text-center">
              <RuxMascot pose="searching" size={64} />
              <h2 className="heading-lg mt-6" style={{ color: 'var(--color-parchment)' }}>
                Ask about any trade finance rule.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                UCP600 &middot; ISBP745 &middot; Incoterms &middot; Sanctions &middot; FTAs &middot; Customs &middot; Bank requirements
              </p>
            </div>

            <div className="mt-10 w-full">
              <QueryInput
                layout="centered"
                disabled={isLoading}
                placeholder={placeholder}
                previewMode={previewMode}
                onSubmit={onSubmitQuery}
              />
            </div>

            <div className="mt-6 w-full">
              <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-[780px] space-y-6">
              {error ? (
                <div
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                  style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}
                >
                  <AlertTriangle className="h-4 w-4" /> {error}
                </div>
              ) : null}

              <ChatThread
                messages={messages}
                isLoading={isLoading}
                canSave={canSave}
                onCitationClick={onCitationClick}
                onSave={onSaveMessage}
              />
            </div>
          </section>

          <div
            className="sticky bottom-0 px-4 py-4 md:px-8"
            style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            <div className="mx-auto max-w-[780px]">
              <QueryInput
                disabled={isLoading}
                placeholder={placeholder}
                previewMode={previewMode}
                onSubmit={onSubmitQuery}
              />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
