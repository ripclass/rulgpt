import type { Citation, Message } from '@/types'
import { UserMessage } from '@/components/chat/UserMessage'
import { RuleGPTMessage } from '@/components/chat/RuleGPTMessage'
import { LoadingDots } from '@/components/shared/LoadingDots'

interface ChatThreadProps {
  messages: Message[]
  isLoading: boolean
  canSave?: boolean
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
}

export function ChatThread({ messages, isLoading, canSave, onCitationClick, onSave }: ChatThreadProps) {
  return (
    <section className="space-y-6">
      {messages.map((message) =>
        message.role === 'user' ? (
          <div key={message.id} className="animate-slide-up">
            <UserMessage message={message} />
          </div>
        ) : (
          <div key={message.id} className="animate-slide-up">
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
        <div className="flex justify-start animate-slide-up">
          <div className="w-full rounded-lg rounded-bl-sm border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingDots />
              <span>Analyzing rules...</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
