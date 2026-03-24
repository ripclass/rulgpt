import { useState, type FormEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface QueryInputProps {
  disabled?: boolean
  previewMode?: boolean
  layout?: 'centered' | 'docked'
  onSubmit: (value: string) => Promise<void> | void
}

export function QueryInput({ disabled, previewMode, layout = 'docked', onSubmit }: QueryInputProps) {
  const [value, setValue] = useState('')

  const count = value.length
  const isTooLong = count > 500

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!value.trim() || isTooLong || disabled) return
    const query = value
    setValue('')
    await onSubmit(query)
  }

  const isCentered = layout === 'centered'

  return (
    <form
      className={
        isCentered
          ? 'space-y-4 border border-black/10 bg-white p-4 shadow-[0_20px_44px_rgba(17,24,39,0.08)] md:p-5'
          : 'space-y-3 border border-black/10 bg-white p-3 shadow-[0_16px_36px_rgba(17,24,39,0.06)]'
      }
      onSubmit={handleSubmit}
    >
      <Textarea
        value={value}
        placeholder="Ask a trade finance rule question..."
        className={
          isCentered
            ? 'min-h-[138px] resize-none border-black/5 bg-[#fcfcfb] px-4 py-4 text-[15px] leading-7'
            : 'min-h-[90px] resize-none border-black/5 bg-[#fcfcfb]'
        }
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
        <div>
          <p className={`text-xs ${isTooLong ? 'text-red-500' : 'text-muted-foreground'}`}>{count}/500</p>
          {previewMode ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Preview mode shows the conversation shell while live retrieval is paused.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size={isCentered ? 'default' : 'sm'}
            className="rounded-none bg-[#111827] font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:bg-primary"
            disabled={disabled || !value.trim() || isTooLong}
          >
            Send <SendHorizonal className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
