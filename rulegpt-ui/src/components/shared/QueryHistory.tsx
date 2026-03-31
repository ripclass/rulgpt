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
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="space-y-0.5">
            {rows.map((item) => (
              <button
                key={item.query_id}
                type="button"
                title={item.query_text}
                disabled={disabled}
                onClick={() => onPick(item)}
                className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-surface-raised cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.query_text}
              </button>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No query history yet.</p> : null}
    </div>
  )
}
