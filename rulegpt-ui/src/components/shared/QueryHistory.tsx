import { groupedByDate } from '@/lib/utils'
import type { HistoryItem } from '@/types'

interface QueryHistoryProps {
  items: HistoryItem[]
  onPick: (item: HistoryItem) => void
  disabled?: boolean
}

export function QueryHistory({ items, onPick, disabled }: QueryHistoryProps) {
  const grouped = groupedByDate(items)
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([label, rows]) => (
        <div key={label} className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 pl-2">{label}</p>
          <div className="space-y-0.5">
            {rows.map((item) => (
              <button
                key={item.query_id}
                type="button"
                title={item.query_text}
                disabled={disabled}
                onClick={() => onPick(item)}
                className="w-full truncate px-3 py-2 text-left text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 rounded-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                {item.query_text}
              </button>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-neutral-400 dark:text-neutral-500 pl-2">No query history yet.</p> : null}
    </div>
  )
}
