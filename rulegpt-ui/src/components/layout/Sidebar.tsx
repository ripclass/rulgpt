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
    <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card px-4 py-5 md:flex md:flex-col">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <RuxMark />
          <span className="font-display text-lg text-foreground">tfrules</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Trade rules, cited.</p>
      </div>

      <Button className="mt-4 h-11 w-full bg-primary text-primary-foreground hover:bg-amber-hover" onClick={onNewQuery}>
        <Plus className="mr-2 h-4 w-4" /> New chat
      </Button>

      {tier === 'anonymous' ? (
        <div className="mt-4">
          <FreeTierCounter usedCount={usedCount} remaining={remaining} limitValue={limitValue} />
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Quick categories</p>
        {quickCategories.map((category) => (
          <button
            key={category}
            type="button"
            disabled={previewMode}
            className="w-full rounded border border-[hsl(var(--border-subtle))] bg-surface-raised px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onQuickCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">History</p>
        <QueryHistory items={history} onPick={onPickHistory} disabled={previewMode} />
        <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Saved</p>
        <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
      </div>

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <UpgradeCTA tier={tier} />
        {isAuthenticated ? (
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-surface-raised" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-surface-raised" onClick={onOpenLogin}>
              Sign in
            </Button>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-amber-hover" onClick={onOpenSignup}>
              Sign up
            </Button>
          </div>
        )}
        <Button asChild variant="ghost" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised">
          <Link to="/api-access">API access</Link>
        </Button>
      </div>
    </aside>
  )
}
