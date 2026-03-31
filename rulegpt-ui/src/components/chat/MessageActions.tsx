import { Copy, Bookmark, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageActionsProps {
  canSave?: boolean
  onCopy: () => void
  onSave: () => void
}

export function MessageActions({ canSave = true, onCopy, onSave }: MessageActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 opacity-0 transition-opacity group-hover:opacity-100">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised"
        onClick={onCopy}
      >
        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised"
        disabled={!canSave}
        onClick={onSave}
      >
        <Bookmark className="mr-1 h-3.5 w-3.5" /> Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised"
      >
        <Share2 className="mr-1 h-3.5 w-3.5" /> Share
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-surface-raised"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-surface-raised"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
