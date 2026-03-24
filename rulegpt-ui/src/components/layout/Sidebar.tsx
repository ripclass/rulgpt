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
  onPickHistory: (value: string) => void
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
  onDeleteSaved,
  onOpenLogin,
  onOpenSignup,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="hidden h-screen w-[280px] shrink-0 border-r border-border bg-[#0b0b0b] p-4 md:flex md:flex-col">
      <div>
        <p className="text-xl font-semibold tracking-tight">RuleGPT</p>
        <p className="mt-1 text-xs text-muted-foreground">Trade finance compliance assistant</p>
      </div>

      <Button className="mt-4 w-full" onClick={onNewQuery}>
        <Plus className="mr-2 h-4 w-4" /> New Query
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
            className="w-full rounded-md border border-border/60 bg-secondary/50 px-2 py-1 text-left text-xs transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPickHistory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-y-auto pr-1">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Query history</p>
        <QueryHistory items={history} onPick={onPickHistory} disabled={previewMode} />
        <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-muted-foreground">Saved answers</p>
        <SavedAnswers items={savedAnswers} onDelete={onDeleteSaved} />
      </div>

      <div className="mt-4 space-y-3">
        <UpgradeCTA tier={tier} />
        <a
          href="https://trdrhub.com"
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          Validate documents to TRDR Hub
        </a>
        {isAuthenticated ? (
          <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={onOpenLogin}>
              Sign in
            </Button>
            <Button className="w-full" onClick={onOpenSignup}>
              Sign up
            </Button>
          </div>
        )}
        <Button asChild variant="ghost" className="w-full justify-start text-xs">
          <Link to="/api-access">API access</Link>
        </Button>
      </div>
    </aside>
  )
}
