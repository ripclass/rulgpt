import { Link } from 'react-router-dom'
import { Plus, LogOut, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryHistory } from '@/components/shared/QueryHistory'
import { SavedAnswers } from '@/components/shared/SavedAnswers'
import { FreeTierCounter } from '@/components/shared/FreeTierCounter'
import { RuxMark } from '@/components/shared/RuxMascot'
import { useTheme } from '@/contexts/ThemeContext'
import type { HistoryItem, SavedAnswer, SessionTier } from '@/types'

interface SidebarProps {
  history: HistoryItem[]
  savedAnswers: SavedAnswer[]
  activeQuickCategory?: string | null
  tier: SessionTier
  isAuthenticated: boolean
  userEmail?: string | null
  previewMode?: boolean
  usedCount: number
  remaining: number
  limitValue: number
  onNewQuery: () => void
  onPickHistory: (item: HistoryItem) => void
  onQuickCategory: (value: string) => void
  onDeleteSaved: (savedId: string) => void
  onOpenLogin: () => void
  onOpenSignup: () => void
  onLogout: () => void
}

const quickCategories = [
  'LC Compliance',
  'Customs & HS Codes',
  'Sanctions',
  'FTA Rules of Origin',
  'Trade Documentation',
  'Bank Requirements',
]

export function Sidebar({
  history,
  savedAnswers,
  activeQuickCategory,
  tier,
  isAuthenticated,
  userEmail,
  previewMode,
  usedCount,
  remaining,
  limitValue,
  onNewQuery,
  onPickHistory,
  onQuickCategory,
  onDeleteSaved,
  onOpenLogin,
  onOpenSignup,
  onLogout,
}: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <aside className="hidden h-[100dvh] sticky top-0 w-64 shrink-0 px-4 py-5 md:flex md:flex-col bg-white dark:bg-[#0A0A0A] border-r border-neutral-200 dark:border-white/10 transition-colors">
      <Link to="/" className="pb-5 border-b border-neutral-100 dark:border-white/5 flex items-center gap-3 hover:opacity-80 transition-opacity">
        <RuxMark className="w-6 h-6 border-none" />
        <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mt-0.5">tfrules</span>
      </Link>

      <button
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#FF4F00] text-[13px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-md shadow-[#FF4F00]/20"
        onClick={onNewQuery}
      >
        <Plus className="h-4 w-4" /> New chat
      </button>

      {tier === 'anonymous' ? (
        <div className="mt-5 border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#141414] rounded-sm p-3">
          <FreeTierCounter usedCount={usedCount} remaining={remaining} limitValue={limitValue} />
        </div>
      ) : null}

      <div className="mt-6 space-y-1">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Quick queries</p>
        {quickCategories.map((category) => {
          const isActive = activeQuickCategory === category
          return (
            <button
              key={category}
              type="button"
              disabled={previewMode}
              className={`w-full px-3 py-2 text-left text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 rounded-sm ${
                isActive 
                  ? 'text-[#FF4F00] bg-[#FF4F00]/10 dark:bg-[#FF4F00]/20' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5'
              }`}
              onClick={() => onQuickCategory(category)}
            >
              {category}
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex-1 overflow-y-auto pr-1 flex flex-col gap-8 custom-scrollbar">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Session History</p>
          <QueryHistory items={history} onPick={onPickHistory} disabled={previewMode} />
        </div>
        
        {savedAnswers.length > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Saved Vault</p>
            <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4 pt-5 border-t border-neutral-200 dark:border-white/10">
        {isAuthenticated ? (
          <>
            <div className="rounded-sm bg-neutral-50 dark:bg-[#141414] border border-neutral-200 dark:border-white/10 px-3 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Account</p>
              <p className="mt-1 truncate text-xs font-medium text-neutral-900 dark:text-neutral-200">
                {userEmail ?? 'Authenticated'}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-sm ${
                  tier === 'pro' || tier === 'starter' 
                    ? 'bg-[#FF4F00]/10 text-[#FF4F00]' 
                    : 'bg-neutral-200 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                }`}>
                  {tier} tier
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white dark:hover:bg-white/5 transition"
              onClick={onLogout}
            >
              <LogOut className="mr-3 h-4 w-4" /> Sign out
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <button
              className="w-full rounded-sm border-[1.5px] border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] py-2.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-white"
              onClick={onOpenLogin}
            >
              Sign in
            </button>
            <button
              className="w-full rounded-sm bg-[#FF4F00] py-2.5 text-xs font-bold text-white transition hover:bg-[#E64600] shadow-md shadow-[#FF4F00]/20"
              onClick={onOpenSignup}
            >
              Sign up
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2">
          <Button asChild variant="ghost" className="justify-start text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 dark:hover:bg-white/5 transition px-2">
            <Link to="/api-access">API Access</Link>
          </Button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
