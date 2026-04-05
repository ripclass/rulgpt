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
  placeholder = 'Awaiting query injection...',
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
      className={`relative w-full ${isCentered ? '' : ''}`}
      onSubmit={handleSubmit}
    >
      <div className={`relative flex flex-col rounded-2xl bg-neutral-100 dark:bg-[#2A2A2A] hover:bg-neutral-200/60 dark:hover:bg-[#333333] focus-within:!bg-white dark:focus-within:!bg-[#2A2A2A] focus-within:shadow-[0_0_15px_rgba(0,0,0,0.05)] focus-within:ring-1 focus-within:ring-neutral-200 dark:focus-within:ring-white/10 transition-all duration-300`}>
        <Textarea
          value={value}
          placeholder={placeholder}
          className={`w-full min-h-[100px] resize-none border-0 bg-transparent px-5 pt-5 pb-16 text-[15px] font-medium text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus-visible:ring-0 outline-none shadow-none ${isCentered ? 'min-h-[140px]' : ''}`}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSubmit()
            }
          }}
        />
        
        {/* Absolute positioned bottom controls so they sit cleanly inside the text area without a dividing line */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {previewMode && (
              <span className="hidden sm:inline-block text-[11px] font-semibold text-neutral-400 tracking-wide uppercase px-1">
                System in standby
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{ color: isTooLong ? 'rgb(239 68 68)' : 'rgb(163 163 163)' }}
            >
              {count} / 500
            </span>
            <button
              type="submit"
              className="flex items-center justify-center p-2 rounded-full bg-neutral-900 text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
              disabled={disabled || !value.trim() || isTooLong}
            >
              <SendHorizonal className="h-4 w-4 relative left-[1px]" />
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
