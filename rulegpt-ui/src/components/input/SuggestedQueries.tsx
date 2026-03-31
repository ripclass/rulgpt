import { Button } from '@/components/ui/button'

interface SuggestedQueriesProps {
  suggestions: string[]
  onPick: (value: string) => void
  disabled?: boolean
}

export function SuggestedQueries({ suggestions, onPick, disabled }: SuggestedQueriesProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          className="h-auto justify-start whitespace-normal rounded-xl border border-border bg-card px-4 py-4 text-left text-sm text-foreground transition-all hover:bg-muted cursor-pointer"
          disabled={disabled}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
