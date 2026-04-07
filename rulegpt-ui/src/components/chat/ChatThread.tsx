import type { Citation, Message } from '@/types'
import { UserMessage } from '@/components/chat/UserMessage'
import { RuleGPTMessage } from '@/components/chat/RuleGPTMessage'
import { LoadingDots } from '@/components/shared/LoadingDots'

interface ChatThreadProps {
  messages: Message[]
  isLoading: boolean
  canSave?: boolean
  reachedLimit?: boolean
  isAuthenticated?: boolean
  onOpenSignup?: () => void
  onUpgrade?: () => void
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
}

export function ChatThread({
  messages,
  isLoading,
  canSave,
  reachedLimit,
  isAuthenticated,
  onOpenSignup,
  onUpgrade,
  onCitationClick,
  onSave,
}: ChatThreadProps) {
  return (
    <section className="space-y-6">
      {messages.map((message) =>
        message.role === 'user' ? (
          <div key={message.id} className="chat-message-enter">
            <UserMessage message={message} />
          </div>
        ) : (
          <div key={message.id} className="chat-message-enter">
            <RuleGPTMessage
              message={message}
              canSave={canSave}
              onCitationClick={onCitationClick}
              onSave={onSave}
            />
          </div>
        ),
      )}
      {isLoading ? (
        <div className="flex justify-start chat-message-enter">
          <div className="w-full relative px-6 py-5 border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] shadow-sm rounded-sm transition-colors">
            {/* Minimal left accent line for system messages */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-neutral-200 dark:bg-white/10 rounded-l-sm" />
            <div className="flex items-center gap-3 text-[13px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              <LoadingDots />
              <span className="animate-pulse">Retrieving rules...</span>
            </div>
          </div>
        </div>
      ) : null}

      {reachedLimit ? (
        <div className="flex justify-start chat-message-enter mt-2">
          <div className="relative w-full rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] px-6 py-6 shadow-sm transition-colors group">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00261C] rounded-l-sm" />
            <div className="mb-4 flex items-center gap-2 border-b border-neutral-100 dark:border-white/5 pb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">System Notification</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-900 dark:text-neutral-100 mb-6">
              You have exhausted your free query limit. Register for unlimited free queries, or upgrade for synced history, saved answers, and priority routing.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? null : (
                <button onClick={onOpenSignup} className="rounded-sm border border-neutral-200 dark:border-white/10 px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition">
                  Create free account
                </button>
              )}
              <button onClick={onUpgrade} className="rounded-sm bg-[#00261C] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-md shadow-[#B2F273]/20 transition hover:bg-[#B2F273] hover:text-neutral-900">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
