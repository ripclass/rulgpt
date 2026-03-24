import { AlertTriangle } from 'lucide-react'
import { ChatThread } from '@/components/chat/ChatThread'
import { QueryInput } from '@/components/input/QueryInput'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'
import type { Citation, Message } from '@/types'

interface MainAreaProps {
  messages: Message[]
  suggestions: string[]
  isLoading: boolean
  error: string | null
  canSave: boolean
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
  onSubmitQuery,
  onPickSuggestion,
  onCitationClick,
  onSaveMessage,
}: MainAreaProps) {
  const isEmpty = messages.length === 0

  return (
    <main className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-border px-4 py-4 md:px-8">
        <h1 className="text-xl font-semibold md:text-2xl">RuleGPT</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded answers from trade finance rulesets. No legal advice.
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
            <p className="text-lg font-medium">Start with a suggested compliance question</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers are grounded in RulHub rulesets with citations.
            </p>
            <div className="mt-4">
              <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} />
            </div>
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
        <QueryInput disabled={isLoading} onSubmit={onSubmitQuery} />
      </div>
    </main>
  )
}
