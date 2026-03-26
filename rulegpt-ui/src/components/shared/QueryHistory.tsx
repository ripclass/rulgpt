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
        <div key={label} className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="space-y-1">
            {rows.map((item) => (
              <button
                key={item.query_id}
                type="button"
                title={item.query_text}
                disabled={disabled}
                onClick={() => onPick(item)}
                className="w-full truncate rounded-none border border-black/10 bg-white px-3 py-2 text-left text-xs text-[#243042] transition hover:border-primary hover:bg-[#fff7f1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {item.query_text}
              </button>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-muted-foreground">No query history yet.</p> : null}
    </div>
  )
}
