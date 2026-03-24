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
  onOpenChange: (open: boolean) => void
  onPickHistory: (value: string) => void
  onDeleteSaved: (savedId: string) => void
}

export function MobileDrawer({
  open,
  title,
  mode,
  history,
  savedAnswers,
  onOpenChange,
  onPickHistory,
  onDeleteSaved,
}: MobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] overflow-hidden border-border bg-[#0b0b0b] px-4 pb-8 pt-6 md:hidden">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 h-[calc(100%-5.5rem)] overflow-y-auto pr-1">
          {mode === 'history' ? (
            <QueryHistory
              items={history}
              onPick={(value) => {
                onPickHistory(value)
                onOpenChange(false)
              }}
            />
          ) : (
            <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/api-access" onClick={() => onOpenChange(false)}>
              API Access
            </Link>
          </Button>
          <Button asChild className="w-full">
            <Link to="/upgrade" onClick={() => onOpenChange(false)}>
              Upgrade
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
