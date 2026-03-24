import type { Message } from '@/types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[72%] border border-primary/16 bg-[#fff7f1] px-5 py-4 text-sm text-[#0c111d]">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/70">You</p>
        <p className="whitespace-pre-wrap leading-7">{message.text}</p>
        <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
