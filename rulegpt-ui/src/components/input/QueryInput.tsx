import { useState, type FormEvent } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface QueryInputProps {
  disabled?: boolean
  onSubmit: (value: string) => Promise<void> | void
}

export function QueryInput({ disabled, onSubmit }: QueryInputProps) {
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

  return (
    <form className="glass-panel sticky bottom-0 space-y-3 rounded-xl p-3" onSubmit={handleSubmit}>
      <Textarea
        value={value}
        placeholder="Ask a trade compliance question..."
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
        <Button size="sm" disabled={disabled || !value.trim() || isTooLong}>
          Send <SendHorizonal className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
