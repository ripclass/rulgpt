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
          <div
            className="w-full rounded-lg rounded-bl-sm px-5 py-4"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <LoadingDots />
              <span style={{ fontFamily: 'var(--font-body)' }}>Analyzing rules...</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
