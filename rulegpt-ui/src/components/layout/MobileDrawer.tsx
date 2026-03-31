import { Link } from 'react-router-dom'
import { QueryHistory } from '@/components/shared/QueryHistory'
import { SavedAnswers } from '@/components/shared/SavedAnswers'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import type { HistoryItem, SavedAnswer } from '@/types'

interface MobileDrawerProps {
  open: boolean
  title: string
  mode: 'history' | 'saved'
  history: HistoryItem[]
  savedAnswers: SavedAnswer[]
  previewMode?: boolean
  onOpenChange: (open: boolean) => void
  onPickHistory: (item: HistoryItem) => void
  onDeleteSaved: (savedId: string) => void
}

export function MobileDrawer({
  open,
  title,
  mode,
  history,
  savedAnswers,
  previewMode,
  onOpenChange,
  onPickHistory,
  onDeleteSaved,
}: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] overflow-hidden border-border bg-card px-4 pb-8 pt-6 md:hidden">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 h-[calc(100%-5.5rem)] overflow-y-auto pr-1">
          {mode === 'history' ? (
            <QueryHistory
              items={history}
              disabled={previewMode}
              onPick={(item) => {
                onPickHistory(item)
                onOpenChange(false)
              }}
            />
          ) : (
            <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-surface-raised">
            <Link to="/api-access" onClick={() => onOpenChange(false)}>
              API Access
            </Link>
          </Button>
          <Button asChild className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
            <Link to="/upgrade" onClick={() => onOpenChange(false)}>
              Upgrade
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
