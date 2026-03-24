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
    <section className="space-y-4">
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
          <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            RuleGPT is analyzing rules...
          </div>
        </div>
      ) : null}
    </section>
  )
}
