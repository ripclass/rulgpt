import { groupedByDate } from '@/lib/utils'
import type { SessionSummary } from '@/types'

interface QueryHistoryProps {
  items: SessionSummary[]
  onPick: (session: SessionSummary) => void
  disabled?: boolean
}

export function QueryHistory({ items, onPick, disabled }: QueryHistoryProps) {
  const grouped = groupedByDate(items.map(s => ({ ...s, created_at: s.last_active })))
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([label, rows]) => (
        <div key={label} className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 pl-2">{label}</p>
          <div className="space-y-0.5">
            {rows.map((item) => {
              const session = item as unknown as SessionSummary
              return (
                <button
                  key={session.session_id}
                  type="button"
                  title={session.first_query}
                  disabled={disabled}
                  onClick={() => onPick(session)}
                  className="w-full truncate px-3 py-2 text-left text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 rounded-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  <span className="truncate block">{session.first_query}</span>
                  {session.query_count > 1 && (
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {session.query_count} messages
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-neutral-400 dark:text-neutral-500 pl-2">No session history yet.</p> : null}
    </div>
  )
}
