import { groupedByDate } from '@/lib/utils'
import type { HistoryItem } from '@/types'

interface QueryHistoryProps {
  items: HistoryItem[]
  onPick: (value: string) => void
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
                disabled={disabled}
                onClick={() => onPick(item.query_text)}
                className="w-full rounded-md border border-border/60 bg-secondary/50 px-2 py-1 text-left text-xs text-foreground/90 transition hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
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
