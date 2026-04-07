import { AlertTriangle } from 'lucide-react'
import { ChatThread } from '@/components/chat/ChatThread'
import { QueryInput } from '@/components/input/QueryInput'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'
import type { Citation, Message } from '@/types'
import { RuxMark } from '@/components/shared/RuxMascot'

interface MainAreaProps {
  messages: Message[]
  suggestions: string[]
  isLoading: boolean
  error: string | null
  canSave: boolean
  activeQuickCategory?: string | null
  previewMode?: boolean
  reachedLimit?: boolean
  isAuthenticated?: boolean
  onOpenSignup?: () => void
  onUpgrade?: () => void
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
  reachedLimit,
  isAuthenticated,
  onOpenSignup,
  onUpgrade,
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
    <main className="flex min-h-[100dvh] flex-1 flex-col pb-28 md:pb-0 bg-[#FAFAFA] dark:bg-[#171717] selection:bg-[#B2F273] selection:text-neutral-900 relative transition-colors">
      {/* Subtle Environment Status Badge */}
      <div className="absolute top-6 right-8 hidden md:flex items-center gap-2 z-[50]">
        <div className={`w-1.5 h-1.5 rounded-full ${previewMode ? 'bg-neutral-400' : 'bg-[#B2F273] animate-pulse'}`} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
          {previewMode ? 'Preview Node' : 'Live Engine'}
        </span>
      </div>

      {isEmpty ? (
        <section className="flex flex-1 flex-col items-center justify-center px-4 py-10 md:px-8 relative z-10">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center mb-16">
            {error ? (
              <div className="mb-8 flex w-full items-center gap-3 rounded-sm border border-red-500/20 bg-red-50 py-4 px-5 text-sm font-medium text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            ) : null}

            <div className="flex w-full flex-col items-center text-center">
              <RuxMark className="h-12 w-12 mb-6 shadow-sm rounded-sm" />
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                Verify any rule.
              </h2>
              <p className="mt-4 max-w-xl text-lg font-light text-neutral-500 leading-relaxed">
                Connect directly into the trade finance consensus. The engine parses UCP600, ISBP745, Incoterms, global sanctions, and FTAs in real-time.
              </p>
            </div>
            
            <div className="mt-12 w-full">
              <QueryInput
                layout="centered"
                disabled={isLoading || reachedLimit}
                placeholder={reachedLimit ? 'Limit reached' : placeholder}
                previewMode={previewMode}
                onSubmit={onSubmitQuery}
              />
            </div>

            <div className="mt-12 w-full">
              {reachedLimit ? (
                <div className="relative w-full rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] px-6 py-6 shadow-sm transition-colors group">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B2F273] rounded-l-sm" />
                  <div className="mb-4 flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">System Notification</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-900 dark:text-neutral-100 mb-6">
                    You have exhausted your free query limit. Register for unlimited queries, or upgrade for synced history, saved answers, and priority routing.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {isAuthenticated ? null : (
                      <button onClick={onOpenSignup} className="rounded-sm border border-neutral-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                        Create free account
                      </button>
                    )}
                    <button onClick={onUpgrade} className="rounded-sm bg-[#B2F273] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-neutral-900 shadow-md shadow-[#B2F273]/20 transition hover:bg-[#9AD65E]">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              ) : (
                <SuggestedQueries suggestions={suggestions} onPick={onPickSuggestion} />
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="flex-1 overflow-y-auto px-4 py-8 md:px-8 relative z-10">
            <div className="mx-auto max-w-4xl space-y-6">
              {error ? (
                <div className="flex items-center gap-3 rounded-sm border border-red-500/20 bg-red-50 py-4 px-5 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
              ) : null}

              <ChatThread
                messages={messages}
                isLoading={isLoading}
                canSave={canSave}
                reachedLimit={reachedLimit}
                isAuthenticated={isAuthenticated}
                onOpenSignup={onOpenSignup}
                onUpgrade={onUpgrade}
                onCitationClick={onCitationClick}
                onSave={onSaveMessage}
              />
            </div>
          </section>

          <div className="sticky bottom-0 z-20 bg-[#FAFAFA]/90 dark:bg-[#171717]/90 px-4 py-6 md:px-8 backdrop-blur-md transition-colors">
            <div className="mx-auto max-w-4xl">
              <QueryInput
                disabled={isLoading || reachedLimit}
                placeholder={reachedLimit ? 'Limit reached (Upgrade to continue)' : placeholder}
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
