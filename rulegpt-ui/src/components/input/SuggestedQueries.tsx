interface SuggestedQueriesProps {
  suggestions: string[]
  onPick: (value: string) => void
  disabled?: boolean
}

export function SuggestedQueries({ suggestions, onPick, disabled }: SuggestedQueriesProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          className="btn-secondary h-auto whitespace-normal rounded-xl px-4 py-4 text-left text-sm"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-parchment)',
            fontFamily: 'var(--font-body)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          disabled={disabled}
          onClick={() => onPick(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
