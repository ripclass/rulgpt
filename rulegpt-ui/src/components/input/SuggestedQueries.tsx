import { Button } from '@/components/ui/button'

interface SuggestedQueriesProps {
  suggestions: string[]
  onPick: (value: string) => void
  disabled?: boolean
}

export function SuggestedQueries({ suggestions, onPick, disabled }: SuggestedQueriesProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          className="h-auto justify-start whitespace-normal rounded-none border-black/10 bg-white px-4 py-4 text-left text-sm leading-6 text-[#243042] hover:bg-[#fff7f1] hover:text-[#0c111d]"
          disabled={disabled}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
