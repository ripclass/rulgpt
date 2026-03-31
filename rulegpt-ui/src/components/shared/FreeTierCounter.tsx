interface FreeTierCounterProps {
  usedCount: number
  limitValue: number
  remaining: number
}

export function FreeTierCounter({ usedCount, limitValue, remaining }: FreeTierCounterProps) {
  const progress = Math.min(100, (usedCount / limitValue) * 100)
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{usedCount} of {limitValue} free queries this month</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/70 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
