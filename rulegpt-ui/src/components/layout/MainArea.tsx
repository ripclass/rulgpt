import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
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
  previewMode,
  onSubmitQuery,
  onPickSuggestion,
  onCitationClick,
  onSaveMessage,
  onNewQuery,
}: MainAreaProps) {
  const isEmpty = messages.length === 0

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background pb-28 md:pb-0">
      <header className="border-b border-border bg-card/80 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="font-display text-lg text-foreground">tfrules</span>
              <p className="mt-1 text-sm text-muted-foreground">
                {previewMode ? 'Preview workspace' : 'Cited trade finance answers'}
              </p>
            </div>
            <Badge
              variant="outline"
              className={previewMode ? 'border-primary/25 bg-amber-muted/30 text-primary text-xs rounded-full' : 'border-success/20 bg-success/10 text-success text-xs rounded-full'}
            >
              {previewMode ? 'Preview' : 'Live'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground hover:bg-secondary"
            >
              Public site
            </Link>

            {!isEmpty && onNewQuery ? (
              <button
                type="button"
                onClick={onNewQuery}
                className="rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground hover:bg-secondary"
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
              <div className="mb-6 flex w-full items-center gap-2 rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center text-center">
              <RuxMascot pose="searching" size={64} />
              <h2 className="mt-6 font-display text-2xl text-foreground">
                Ask about any trade finance rule.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                UCP600 &middot; ISBP745 &middot; Incoterms &middot; Sanctions &middot; FTAs &middot; Customs &middot; Bank requirements
              </p>
            </div>

            <div className="mt-10 w-full">
              <QueryInput
                layout="centered"
                disabled={isLoading}
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
                <div className="flex items-center gap-2 rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
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

          <div className="sticky bottom-0 border-t border-border bg-card px-4 py-4 md:px-8">
            <div className="mx-auto max-w-[780px]">
              <QueryInput disabled={isLoading} previewMode={previewMode} onSubmit={onSubmitQuery} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
