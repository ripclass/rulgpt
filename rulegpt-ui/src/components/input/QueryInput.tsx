import { useState, type FormEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

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
      className={isCentered ? 'space-y-4 rounded-lg p-4 md:p-5' : 'space-y-3'}
      style={
        isCentered
          ? {
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }
          : undefined
      }
      onSubmit={handleSubmit}
    >
      <Textarea
        value={value}
        placeholder={placeholder}
        className={
          isCentered
            ? 'input-dark min-h-[138px] resize-none text-[15px] leading-7'
            : 'input-dark min-h-[88px] resize-none text-[14px] leading-7'
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
          <p
            className="text-xs"
            style={{ color: isTooLong ? 'var(--color-error)' : 'var(--color-text-muted)' }}
          >
            {count}/500
          </p>
          {previewMode ? (
            <p className="mt-1 max-w-[26rem] text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Preview mode shows the conversation shell while live retrieval is paused.
            </p>
          ) : !isCentered ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Press Enter to send. Use Shift+Enter for a new line.
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn-primary inline-flex items-center rounded-full px-5"
            style={{ fontSize: isCentered ? '1rem' : '0.875rem' }}
            disabled={disabled || !value.trim() || isTooLong}
          >
            Send <SendHorizonal className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  )
}
