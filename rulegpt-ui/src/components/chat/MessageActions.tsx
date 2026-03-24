import { Copy, Bookmark, Share2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageActionsProps {
  canSave?: boolean
  onCopy: () => void
  onSave: () => void
}

export function MessageActions({ canSave = true, onCopy, onSave }: MessageActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-black/8 pt-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-[#faf7f2] hover:text-[#0c111d]"
        onClick={onCopy}
      >
        <Copy className="mr-1 h-3.5 w-3.5" /> Copy
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-[#faf7f2] hover:text-[#0c111d]"
        disabled={!canSave}
        onClick={onSave}
      >
        <Bookmark className="mr-1 h-3.5 w-3.5" /> Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-[#faf7f2] hover:text-[#0c111d]"
      >
        <Share2 className="mr-1 h-3.5 w-3.5" /> Share
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-[#faf7f2] hover:text-[#0c111d]"
      >
        <ThumbsUp className="mr-1 h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-none px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-[#faf7f2] hover:text-[#0c111d]"
      >
        <ThumbsDown className="mr-1 h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
