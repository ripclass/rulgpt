import type { Message } from '@/types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end mb-6 group">
      <div className="flex flex-col items-end">
        <div className="max-w-[75%] rounded-3xl bg-neutral-100 dark:bg-[#2A2A2A] px-5 py-3.5 transition-colors">
          <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-900 dark:text-neutral-100">
            {message.text}
          </p>
        </div>
        {/* Timestamp hidden by default, shows on hover of the whole message group like Claude */}
        <div className="mt-1.5 opacity-0 transition-opacity group-hover:opacity-100 px-2">
          <span className="text-[11px] font-medium text-neutral-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}
