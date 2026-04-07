import { MessageSquare, Clock3, Bookmark, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface MobileNavProps {
  onNewQuery: () => void
  onHistory: () => void
  onSaved: () => void
  onPro: () => void
}

export function MobileNav({ onNewQuery, onHistory, onSaved }: MobileNavProps) {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 md:hidden" style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onNewQuery}>
        <MessageSquare className="mr-1 h-4 w-4" />
        <span className="text-xs">New</span>
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onHistory}>
        <Clock3 className="mr-1 h-4 w-4" />
        <span className="text-xs">History</span>
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onSaved}>
        <Bookmark className="mr-1 h-4 w-4" />
        <span className="text-xs">Saved</span>
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => navigate('/settings')}>
        <User className="mr-1 h-4 w-4" />
        <span className="text-xs">Account</span>
      </Button>
    </nav>
  )
}
