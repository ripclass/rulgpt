import { Link } from 'react-router-dom'
import { Plus, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryHistory } from '@/components/shared/QueryHistory'
import { SavedAnswers } from '@/components/shared/SavedAnswers'
import { FreeTierCounter } from '@/components/shared/FreeTierCounter'
import { UpgradeCTA } from '@/components/conversion/UpgradeCTA'
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
    <aside className="hidden h-screen w-[308px] shrink-0 border-r border-black/10 bg-[#f7f3ec] px-4 py-5 md:flex md:flex-col">
      <div className="border-b border-black/10 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">RuleGPT / Chat</p>
        <p className="mt-2 text-xl font-semibold tracking-tight text-[#0c111d]">Trade rules, without the memo.</p>
      </div>

      <Button className="mt-4 h-11 w-full rounded-none bg-[#111827] font-mono text-xs uppercase tracking-[0.16em] text-white hover:bg-primary" onClick={onNewQuery}>
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
            className="w-full rounded-none border border-black/10 bg-white px-3 py-2 text-left text-xs text-[#0c111d] transition hover:border-primary hover:bg-[#fff7f1] disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className="mt-4 space-y-3">
        <UpgradeCTA tier={tier} />
        {isAuthenticated ? (
          <Button variant="ghost" className="w-full justify-start rounded-none border border-black/10 bg-white text-[#0c111d] hover:bg-[#faf7f2]" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="w-full rounded-none border-black/10 bg-white hover:bg-[#faf7f2]" onClick={onOpenLogin}>
              Sign in
            </Button>
            <Button className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90" onClick={onOpenSignup}>
              Sign up
            </Button>
          </div>
        )}
        <Button asChild variant="ghost" className="w-full justify-start rounded-none text-xs text-[#0c111d] hover:bg-[#faf7f2]">
          <Link to="/api-access">API access</Link>
        </Button>
      </div>
    </aside>
  )
}
