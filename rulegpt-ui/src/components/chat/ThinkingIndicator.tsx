import { useEffect, useState } from 'react'
import { LoadingDots } from '@/components/shared/LoadingDots'

const STAGES = [
  'Searching 5,400+ rules...',
  'Checking ICC standards...',
  'Cross-referencing citations...',
  'Verifying against UCP 600...',
  'Analyzing jurisdiction rules...',
  'Scanning sanctions database...',
  'Matching ISBP 745 paragraphs...',
  'Building cited answer...',
]

export function ThinkingIndicator() {
  const [stageIndex, setStageIndex] = useState(0)

  useEffect(() => {
    // Advance through stages every 2-3 seconds
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex justify-start chat-message-enter">
      <div className="w-full relative px-6 py-5 border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] shadow-sm rounded-sm transition-colors">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF4F00]/40 rounded-l-sm animate-pulse" />
        <div className="flex items-center gap-3">
          <LoadingDots className="text-[#FF4F00]" />
          <span
            key={stageIndex}
            className="text-[13px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400 animate-fade-in"
          >
            {STAGES[stageIndex]}
          </span>
        </div>
      </div>
    </div>
  )
}
