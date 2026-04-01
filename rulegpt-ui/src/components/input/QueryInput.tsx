import { useState, type FormEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface QueryInputProps {
  disabled?: boolean
  previewMode?: boolean
  layout?: 'centered' | 'docked'
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onSubmit: (value: string) => Promise<void> | void
}

export function QueryInput({
  disabled,
  previewMode,
  layout = 'docked',
  placeholder = 'Ask about any trade finance rule...',
  value: controlledValue,
  onValueChange,
  onSubmit,
}: QueryInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const value = controlledValue ?? internalValue

  const setValue = (nextValue: string) => {
    onValueChange?.(nextValue)
    if (controlledValue === undefined) {
      setInternalValue(nextValue)
    }
  }

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
          ? 'space-y-4 rounded-lg border border-border bg-card p-4 md:p-5'
          : 'space-y-3'
      }
      onSubmit={handleSubmit}
    >
      <Textarea
        value={value}
        placeholder={placeholder}
        className={
          isCentered
            ? 'min-h-[138px] resize-none rounded-lg border border-border bg-surface-raised px-4 py-4 text-[15px] leading-7 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary'
            : 'min-h-[88px] resize-none rounded-lg border border-border bg-surface-raised px-4 py-3 text-[14px] leading-7 text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary'
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
          <p className={`text-xs ${isTooLong ? 'text-error' : 'text-muted-foreground'}`}>
            {count}/500
          </p>
          {previewMode ? (
            <p className="mt-1 max-w-[26rem] text-xs text-muted-foreground">
              Preview mode shows the conversation shell while live retrieval is paused.
            </p>
          ) : !isCentered ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Press Enter to send. Use Shift+Enter for a new line.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button
            size={isCentered ? 'default' : 'sm'}
            className="rounded-full bg-foreground px-5 text-background hover:bg-foreground/90"
            disabled={disabled || !value.trim() || isTooLong}
          >
            Send <SendHorizonal className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
