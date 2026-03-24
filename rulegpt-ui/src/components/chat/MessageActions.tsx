import { Copy, Bookmark, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageActionsProps {
  canSave?: boolean
  onCopy: () => void
  onSave: () => void
}

export function MessageActions({ canSave = true, onCopy, onSave }: MessageActionsProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={!canSave} onClick={onSave}>
        <Bookmark className="mr-1 h-3.5 w-3.5" /> Save
      </Button>
      <Button type="button" variant="ghost" size="sm">
        <Share2 className="mr-1 h-3.5 w-3.5" /> Share
      </Button>
      <Button type="button" variant="ghost" size="sm">
        <ThumbsUp className="mr-1 h-3.5 w-3.5" />
      </Button>
      <Button type="button" variant="ghost" size="sm">
        <ThumbsDown className="mr-1 h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
