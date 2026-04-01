import { Link } from 'react-router-dom'
import { Plus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryHistory } from '@/components/shared/QueryHistory'
import { SavedAnswers } from '@/components/shared/SavedAnswers'
import { FreeTierCounter } from '@/components/shared/FreeTierCounter'
import { UpgradeCTA } from '@/components/conversion/UpgradeCTA'
import { RuxMark } from '@/components/shared/RuxMascot'
import type { HistoryItem, SavedAnswer, SessionTier } from '@/types'

interface SidebarProps {
  history: HistoryItem[]
  savedAnswers: SavedAnswer[]
  activeQuickCategory?: string | null
  tier: SessionTier
  isAuthenticated: boolean
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
    <aside
      className="hidden h-screen w-64 shrink-0 px-4 py-5 md:flex md:flex-col"
      style={{ background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)' }}
    >
      <div className="pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <RuxMark />
          <span className="wordmark wordmark--on-dark text-lg">tfrules</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Trade rules, cited.</p>
      </div>

      <button
        className="btn-primary mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md text-sm font-medium"
        onClick={onNewQuery}
      >
        <Plus className="h-4 w-4" /> New chat
      </button>

      {tier === 'anonymous' ? (
        <div className="mt-4">
          <FreeTierCounter usedCount={usedCount} remaining={remaining} limitValue={limitValue} />
        </div>
      ) : null}

      <div className="mt-4 space-y-1">
        <p className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Quick categories</p>
        {quickCategories.map((category) => (
          <button
            key={category}
            type="button"
            disabled={previewMode}
            className="w-full rounded-md px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              color: activeQuickCategory === category ? 'var(--color-amber)' : 'var(--color-text-secondary)',
              background: activeQuickCategory === category ? 'var(--color-amber-muted)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (activeQuickCategory !== category) {
                e.currentTarget.style.background = 'var(--color-surface-raised)'
                e.currentTarget.style.color = 'var(--color-parchment)'
              }
            }}
            onMouseLeave={(e) => {
              if (activeQuickCategory !== category) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-secondary)'
              }
            }}
            onClick={() => onQuickCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>History</p>
        <QueryHistory items={history} onPick={onPickHistory} disabled={previewMode} />
        <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Saved</p>
        <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
      </div>

      <div className="mt-4 space-y-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        <UpgradeCTA tier={tier} />
        {isAuthenticated ? (
          <Button
            variant="ghost"
            className="w-full justify-start"
            style={{ color: 'var(--color-text-secondary)' }}
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <button
              className="btn-secondary w-full rounded-md py-2 text-sm"
              onClick={onOpenLogin}
            >
              Sign in
            </button>
            <button
              className="btn-primary w-full rounded-md py-2 text-sm"
              onClick={onOpenSignup}
            >
              Sign up
            </button>
          </div>
        )}
        <Button asChild variant="ghost" className="w-full justify-start text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <Link to="/api-access">API access</Link>
        </Button>
      </div>
    </aside>
  )
}
