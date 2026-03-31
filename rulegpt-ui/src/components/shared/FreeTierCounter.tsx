interface FreeTierCounterProps {
  usedCount: number
  limitValue: number
  remaining: number
}

export function FreeTierCounter({ usedCount, limitValue, remaining }: FreeTierCounterProps) {
  const progress = Math.min(100, (usedCount / limitValue) * 100)
  return (
    <div className="rounded-lg bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{usedCount} of {limitValue} free queries used this month</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
