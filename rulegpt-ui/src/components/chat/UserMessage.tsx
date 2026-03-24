import type { Message } from '@/types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-lg shadow-primary/15">
        <p className="whitespace-pre-wrap">{message.text}</p>
        <p className="mt-2 text-right text-[10px] opacity-80">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
