import { Button } from '@/components/ui/button'

interface SuggestedQueriesProps {
  suggestions: string[]
  onPick: (value: string) => void
}

export function SuggestedQueries({ suggestions, onPick }: SuggestedQueriesProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          className="h-auto justify-start whitespace-normal text-left text-xs text-muted-foreground"
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
