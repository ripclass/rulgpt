import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, LogOut, Sun, Moon, ChevronUp, Zap } from 'lucide-react'
import { QueryHistory } from '@/components/shared/QueryHistory'
import { SavedAnswers } from '@/components/shared/SavedAnswers'
import { FreeTierCounter } from '@/components/shared/FreeTierCounter'
import { RuxMark } from '@/components/shared/RuxMascot'
import { useTheme } from '@/contexts/ThemeContext'
import type { SavedAnswer, SessionSummary, SessionTier } from '@/types'

interface SidebarProps {
  history: SessionSummary[]
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
  onPickHistory: (session: SessionSummary) => void
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

function UserMenu({
  isAuthenticated,
  userEmail,
  tier,
  onOpenLogin,
  onLogout,
}: {
  isAuthenticated: boolean
  userEmail?: string | null
  tier: SessionTier
  onOpenLogin: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!isAuthenticated) {
    return (
      <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-white/10 flex items-center justify-between">
        <button
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-[#FF4F00] transition"
          onClick={onOpenLogin}
        >
          Sign in for history &amp; saved
        </button>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition-colors"
          title="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    )
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-white/10 relative" ref={menuRef}>
      {/* Dropdown menu — opens upward */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141414] shadow-xl py-1 z-50">
          <Link
            to="/#pricing"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
          >
            <Zap className="h-3.5 w-3.5" /> Upgrade plan
          </Link>
          <button
            onClick={() => { setTheme(isDark ? 'light' : 'dark'); setOpen(false) }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="my-1 border-t border-neutral-100 dark:border-white/5" />
          <button
            onClick={() => { onLogout(); setOpen(false) }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}

      {/* Compact user row */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-sm px-2 py-2 hover:bg-neutral-50 dark:hover:bg-white/5 transition group"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 dark:bg-white/10 text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-200">
            {userEmail ?? 'User'}
          </p>
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${
            tier === 'pro' || tier === 'starter'
              ? 'text-[#FF4F00]'
              : 'text-neutral-400 dark:text-neutral-500'
          }`}>
            {tier}
          </p>
        </div>
        <ChevronUp className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  )
}

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

      <UserMenu
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        tier={tier}
        onOpenLogin={onOpenLogin}
        onLogout={onLogout}
      />
    </aside>
  )
}
