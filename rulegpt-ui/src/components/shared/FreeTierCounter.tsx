interface FreeTierCounterProps {
  usedCount: number
  limitValue: number
  remaining: number
}

export function FreeTierCounter({ usedCount, limitValue, remaining }: FreeTierCounterProps) {
  const progress = Math.min(100, (usedCount / limitValue) * 100)
  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium">Free queries</span>
        <span className="text-muted-foreground">
          {Math.max(0, remaining)} left / {limitValue}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
