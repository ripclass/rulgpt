import type { Message } from '@/types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] rounded-lg rounded-br-sm border border-border bg-card px-5 py-4 text-sm text-foreground">
        <p className="font-mono text-xs text-muted-foreground">You</p>
        <p className="mt-1 whitespace-pre-wrap leading-7">{message.text}</p>
        <p className="mt-2 text-right text-xs text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
