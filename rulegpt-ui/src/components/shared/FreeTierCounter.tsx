interface FreeTierCounterProps {
  usedCount: number
  limitValue: number
  remaining: number
}

export function FreeTierCounter({ usedCount, limitValue, remaining }: FreeTierCounterProps) {
  const progress = Math.min(100, (usedCount / limitValue) * 100)
  return (
    <div className="rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-3 shadow-sm transition-colors">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        <span>{usedCount} of {limitValue} free queries</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-[#FF4F00] transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
