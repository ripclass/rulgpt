export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
    </span>
  )
}
