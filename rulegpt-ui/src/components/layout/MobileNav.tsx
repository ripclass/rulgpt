import { MessageSquare, Clock3, Bookmark, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MobileNavProps {
  onNewQuery: () => void
  onHistory: () => void
  onSaved: () => void
  onPro: () => void
}

export function MobileNav({ onNewQuery, onHistory, onSaved, onPro }: MobileNavProps) {
  return (
    <nav className="glass-panel fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-xl px-3 py-2 md:hidden">
      <Button size="sm" variant="ghost" onClick={onNewQuery}>
        <MessageSquare className="mr-1 h-4 w-4" />
        New
      </Button>
      <Button size="sm" variant="ghost" onClick={onHistory}>
        <Clock3 className="mr-1 h-4 w-4" />
        History
      </Button>
      <Button size="sm" variant="ghost" onClick={onSaved}>
        <Bookmark className="mr-1 h-4 w-4" />
        Saved
      </Button>
      <Button size="sm" variant="ghost" onClick={onPro}>
        <Sparkles className="mr-1 h-4 w-4 text-primary" />
        Pro
      </Button>
    </nav>
  )
}
