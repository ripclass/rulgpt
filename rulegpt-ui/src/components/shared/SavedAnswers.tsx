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
        <div key={label} className="space-y-1">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
          {rows.map((item) => (
            <div key={item.id} className="rounded-md px-2 py-1.5 text-sm hover:bg-surface-raised">
              <p className="truncate text-foreground">{item.note || item.query_id}</p>
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground hover:text-error"
                onClick={() => onDelete(item.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No saved answers yet.</p> : null}
    </div>
  )
}
