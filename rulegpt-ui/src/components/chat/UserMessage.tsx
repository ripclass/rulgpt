import type { Message } from '@/types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[72%] rounded-lg rounded-br-sm px-5 py-4 text-sm"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-parchment)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <p className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
          You
        </p>
        <p className="mt-1 whitespace-pre-wrap leading-7">{message.text}</p>
        <p className="mt-2 text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
