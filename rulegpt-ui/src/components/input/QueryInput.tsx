import { useState, type FormEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface QueryInputProps {
  disabled?: boolean
  previewMode?: boolean
  onSubmit: (value: string) => Promise<void> | void
}

export function QueryInput({ disabled, previewMode, onSubmit }: QueryInputProps) {
  const [value, setValue] = useState('')

  const count = value.length
  const isTooLong = count > 500

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!value.trim() || isTooLong || disabled) return
    if (previewMode) {
      toast.message('Preview mode is active. Live queries will return when the RulHub API is ready.')
      return
    }
    const query = value
    setValue('')
    await onSubmit(query)
  }

  const buttonLabel = previewMode ? 'Preview only' : 'Send'

  return (
    <form className="glass-panel sticky bottom-0 space-y-3 rounded-xl p-3" onSubmit={handleSubmit}>
      <Textarea
        value={value}
        placeholder={previewMode ? 'Live Q&A will open when the RulHub API is ready.' : 'Ask a trade compliance question...'}
        className="min-h-[90px] resize-none"
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      />
      <div className="flex items-center justify-between">
        <p className={`text-xs ${isTooLong ? 'text-red-400' : 'text-muted-foreground'}`}>{count}/500</p>
        <div className="flex items-center gap-3">
          {previewMode ? (
            <p className="max-w-[16rem] text-[11px] text-muted-foreground">
              Examples stay visible while live submission is paused.
            </p>
          ) : null}
          <Button size="sm" disabled={disabled || !value.trim() || isTooLong}>
            {buttonLabel} <SendHorizonal className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
