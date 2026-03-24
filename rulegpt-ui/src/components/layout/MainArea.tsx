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
}: MainAreaProps) {
  const isEmpty = messages.length === 0

  return (
    <main className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold md:text-2xl">RuleGPT</h1>
          {previewMode ? (
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              Preview mode
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {previewMode
            ? 'A branded shell is live while the RulHub API is being prepared.'
            : 'Grounded answers from trade finance rulesets. No legal advice.'}
        </p>
      </header>

      <section className="flex-1 space-y-4 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        ) : null}

        {isEmpty ? (
          <div className="glass-panel rounded-2xl p-5 md:p-7">
            {previewMode ? (
              <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.25em] text-primary">Coming soon</p>
                    <h2 className="max-w-xl text-2xl font-semibold leading-tight md:text-3xl">
                      RuleGPT is ready for preview, and live answers will unlock when the RulHub API is connected.
                    </h2>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      Use this shell to review the branded experience, test auth surfaces, and see where citations,
                      TRDR Hub routing, and example prompts will land in the full product.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border bg-secondary/50 px-3 py-1">Preview shell</span>
                    <span className="rounded-full border border-border bg-secondary/50 px-3 py-1">Waitlist-ready</span>
                    <span className="rounded-full border border-border bg-secondary/50 px-3 py-1">Mobile + desktop</span>
                  </div>

                  <TRDRHubCTA />
                </div>

                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Example questions</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    These prompts are visible for product review, but they will not call the backend until preview mode
                    is turned off.
                  </p>
                  <div className="mt-4">
                    <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} disabled />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-lg font-medium">Start with a suggested compliance question</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Answers are grounded in RulHub rulesets with citations.
                </p>
                <div className="mt-4">
                  <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} />
                </div>
              </>
            )}
          </div>
        ) : (
          <ChatThread
            messages={messages}
            isLoading={isLoading}
            canSave={canSave}
            onCitationClick={onCitationClick}
            onSave={onSaveMessage}
          />
        )}
      </section>

      <div className="px-4 pb-24 md:px-8 md:pb-6">
        <QueryInput disabled={isLoading} previewMode={previewMode} onSubmit={onSubmitQuery} />
      </div>
    </main>
  )
}
