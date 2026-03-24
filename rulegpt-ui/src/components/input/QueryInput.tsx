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
          ? 'space-y-4 border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(17,24,39,0.05)] md:p-5'
          : 'space-y-3 border border-black/10 bg-white p-3 shadow-[0_10px_24px_rgba(17,24,39,0.04)]'
      }
      onSubmit={handleSubmit}
    >
      <Textarea
        value={value}
        placeholder="Ask a trade finance rule question..."
        className={
          isCentered
            ? 'min-h-[138px] resize-none border-black/5 bg-[#fcfcfb] px-4 py-4 text-[15px] leading-7'
            : 'min-h-[88px] resize-none border-black/5 bg-[#fcfcfb] px-4 py-3 text-[14px] leading-7'
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${isTooLong ? 'text-red-500' : 'text-muted-foreground'}`}>
            {count}/500
          </p>
          {previewMode ? (
            <p className="mt-1 max-w-[26rem] text-[11px] leading-5 text-muted-foreground">
              Preview mode shows the conversation shell while live retrieval is paused.
            </p>
          ) : !isCentered ? (
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Press Enter to send. Use Shift+Enter for a new line.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size={isCentered ? 'default' : 'sm'}
            className="rounded-none bg-[#111827] px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white hover:bg-primary"
            disabled={disabled || !value.trim() || isTooLong}
          >
            Send <SendHorizonal className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
