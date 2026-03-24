import type { Citation, Message } from '@/types'
import { UserMessage } from '@/components/chat/UserMessage'
import { RuleGPTMessage } from '@/components/chat/RuleGPTMessage'

interface ChatThreadProps {
  messages: Message[]
  isLoading: boolean
  canSave?: boolean
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
}

export function ChatThread({ messages, isLoading, canSave, onCitationClick, onSave }: ChatThreadProps) {
  return (
    <section className="space-y-5">
      {messages.map((message) =>
        message.role === 'user' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <RuleGPTMessage
            key={message.id}
            message={message}
            canSave={canSave}
            onCitationClick={onCitationClick}
            onSave={onSave}
          />
        ),
      )}
      {isLoading ? (
        <div className="flex justify-start">
          <div className="rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm text-muted-foreground shadow-[0_12px_30px_rgba(17,24,39,0.04)]">
            RuleGPT is analyzing rules...
          </div>
        </div>
      ) : null}
    </section>
  )
}
