import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ChatThread } from '@/components/chat/ChatThread'
import { TRDRHubCTA } from '@/components/conversion/TRDRHubCTA'
import { QueryInput } from '@/components/input/QueryInput'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'
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
    <main className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-black/10 bg-background/85 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] font-mono text-xs font-bold tracking-[0.26em] text-white">
              RG
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-[-0.03em] text-[#0c111d] md:text-xl">
                RuleGPT
              </h1>
              <p className="text-xs text-muted-foreground">
                {previewMode
                  ? 'Preview conversation shell'
                  : 'Grounded answers from published trade rules'}
              </p>
            </div>
            {previewMode ? (
              <Badge variant="outline" className="border-primary/30 bg-[#f7d9cb] text-primary">
                Preview mode
              </Badge>
            ) : null}
          </div>

          {!isEmpty && onNewQuery ? (
            <button
              type="button"
              onClick={onNewQuery}
              className="rounded-none border border-black/10 bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#0c111d] transition hover:bg-[#faf7f2]"
            >
              New chat
            </button>
          ) : null}
        </div>
      </header>

      {isEmpty ? (
        <section className="flex flex-1 items-center px-4 py-10 md:px-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
            {error ? (
              <div className="mb-6 flex w-full items-center gap-2 border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            ) : null}

            <div className="w-full text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {previewMode ? 'Public preview' : 'Trade finance compliance assistant'}
              </p>
              <h2 className="mt-4 font-display text-4xl font-medium tracking-[-0.05em] text-[#0c111d] md:text-6xl">
                Ask the rule.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                Start with a trade finance question. RuleGPT is designed to answer with citations, clear confidence,
                and explicit uncertainty when a rule is missing.
              </p>
            </div>

            <div className="mt-8 w-full">
              <QueryInput
                layout="centered"
                disabled={isLoading}
                previewMode={previewMode}
                onSubmit={onSubmitQuery}
              />
            </div>

            <div className="mt-6 w-full">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Suggested prompts
              </p>
              <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} />
            </div>

            {previewMode ? (
              <div className="mt-8 w-full">
                <TRDRHubCTA />
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <section className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-3xl space-y-5">
              {error ? (
                <div className="flex items-center gap-2 border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
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

          <div className="border-t border-black/10 bg-background/92 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="mx-auto max-w-3xl">
              <QueryInput disabled={isLoading} previewMode={previewMode} onSubmit={onSubmitQuery} />
            </div>
          </div>
        </>
      )}
    </main>
  )
}
