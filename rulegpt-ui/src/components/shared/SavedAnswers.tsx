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
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2 pl-2">{label}</p>
          {rows.map((item) => (
            <div key={item.id} className="relative group rounded-sm px-3 py-2 text-[13px] font-medium transition-all text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5">
              <p className="truncate pr-8">{item.note || item.query_id}</p>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 transition-opacity"
                onClick={() => onDelete(item.id)}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      ))}
      {items.length === 0 ? <p className="text-xs text-neutral-400 dark:text-neutral-500 pl-2">No saved answers yet.</p> : null}
    </div>
  )
}
