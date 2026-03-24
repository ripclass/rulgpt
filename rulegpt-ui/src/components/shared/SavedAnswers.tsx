import type { SavedAnswer } from '@/types'
import { groupedByDate } from '@/lib/utils'

interface SavedAnswersProps {
  items: SavedAnswer[]
  onDelete: (savedId: string) => void
}

export function SavedAnswers({ items, onDelete }: SavedAnswersProps) {
  const grouped = groupedByDate(items)
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([label, rows]) => (
        <div key={label} className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          {rows.map((item) => (
            <div key={item.id} className="rounded-md border border-border/60 bg-secondary/40 px-2 py-2 text-xs">
              <p className="truncate text-foreground/90">{item.note || item.query_id}</p>
              <button
                type="button"
                className="mt-1 text-[11px] text-primary hover:underline"
                onClick={() => onDelete(item.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-muted-foreground">No saved answers yet.</p> : null}
    </div>
  )
}
