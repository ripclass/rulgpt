import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery as useRQQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MainArea } from '@/components/layout/MainArea'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { CitationPanel } from '@/components/chat/CitationPanel'
import { LoginModal } from '@/components/auth/LoginModal'
import { SignupModal } from '@/components/auth/SignupModal'
import { api } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@/hooks/useQuery'
import { useSession } from '@/hooks/useSession'
import { useTierLimit } from '@/hooks/useTierLimit'
import { isPreviewModeEnabled } from '@/lib/config'
import type { Citation, HistoryItem, Message, RuleDetails, SavedAnswer } from '@/types'

const LOCAL_HISTORY_KEY = 'rulegpt_local_history'

function parseLocalHistory(): HistoryItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistLocalHistory(items: HistoryItem[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items.slice(0, 40)))
  } catch {
    // Ignore local storage failures.
  }
}

function mergeHistory(primary: HistoryItem[], secondary: HistoryItem[]) {
  const seen = new Set<string>()
  const merged: HistoryItem[] = []
  for (const item of [...primary, ...secondary]) {
    const key = item.query_id || `${item.created_at}:${item.query_text}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }
  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

function buildHistoryMessages(item: HistoryItem): Message[] {
  return [
    {
      id: `${item.query_id}-user`,
      role: 'user',
      text: item.query_text,
      createdAt: item.created_at,
    },
    {
      id: item.query_id,
      queryId: item.query_id,
      role: 'assistant',
      text: item.answer_text,
      createdAt: item.created_at,
      confidence: item.confidence_band,
      citations: [],
      domainTags: [],
    },
  ]
}

export function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [citationPanelOpen, setCitationPanelOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<RuleDetails | null>(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [mobileDrawerMode, setMobileDrawerMode] = useState<'history' | 'saved'>('history')
  const [activeQuickCategory, setActiveQuickCategory] = useState<string | null>(null)
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>(parseLocalHistory)
  const seededQueryRef = useRef<string | null>(null)

  const auth = useAuth()
  const { sessionToken, resetSession } = useSession()
  const previewMode = isPreviewModeEnabled()

  const query = useQuery({
    sessionToken,
    tier: auth.tier,
    userId: auth.user?.id,
    accessToken: auth.accessToken,
  })

  const suggestions = useRQQuery({
    queryKey: ['suggestions'],
    queryFn: api.getSuggestions,
    enabled: !previewMode,
    staleTime: 15 * 60 * 1000,
  })

  const historyQuery = useRQQuery({
    queryKey: ['history', auth.user?.id, auth.tier, auth.accessToken ?? null],
    queryFn: () => api.getHistory({ userId: auth.user?.id, tier: auth.tier, accessToken: auth.accessToken }),
    enabled: auth.isAuthenticated && !previewMode,
    staleTime: 60_000,
  })

  const savedQuery = useRQQuery({
    queryKey: ['saved', auth.user?.id, auth.tier, auth.accessToken ?? null],
    queryFn: () => api.listSaved({ userId: auth.user?.id, tier: auth.tier, accessToken: auth.accessToken }),
    enabled: auth.isAuthenticated && !previewMode,
    staleTime: 60_000,
  })

  const tierLimit = useTierLimit({
    tier: auth.tier,
    queriesRemaining: query.queriesRemaining,
  })

  const suggestionTexts = useMemo(
    () =>
      suggestions.data?.map((item) => item.text) ?? [
        'What documents are required for a CIF shipment under UCP600?',
        'Does my garment qualify for RCEP preferential tariff from Bangladesh?',
      ],
    [suggestions.data],
  )

  const historyItems = useMemo(
    () => mergeHistory(historyQuery.data ?? [], localHistory),
    [historyQuery.data, localHistory],
  )

  const savedAnswers = useMemo<SavedAnswer[]>(() => savedQuery.data ?? [], [savedQuery.data])

  const recordHistory = (item: HistoryItem) => {
    setLocalHistory((prev) => {
      const next = mergeHistory([item], prev)
      persistLocalHistory(next)
      return next
    })
  }

  const submitQuery = async (value: string) => {
    setActiveQuickCategory(null)
    track('chat_query_submitted', {
      preview_mode: previewMode,
      authenticated: auth.isAuthenticated,
      tier: auth.tier,
      length: value.length,
    })

    if (previewMode) {
      const createdAt = new Date().toISOString()
      const previewQueryId = `preview-${Date.now()}`
      const previewMessages: Message[] = [
        {
          id: crypto.randomUUID(),
          role: 'user',
          text: value,
          createdAt,
        },
        {
          id: `preview-${crypto.randomUUID()}`,
          queryId: previewQueryId,
          role: 'assistant',
          text: 'tfrules is showing the product shell here. Once the live answer engine is enabled for this environment, this same flow will return citation-backed answers.',
          createdAt: new Date().toISOString(),
          confidence: 'low',
          citations: [],
          showTRDRCTA: false,
          trdrCtaText: null,
          trdrCtaUrl: null,
          disclaimer:
            'Preview mode only. Based on published trade finance rules and standards once the live engine is connected. Not legal advice.',
          suggestedFollowups: [
            'Which rulebook or jurisdiction should this answer search first?',
            'Do you need a rule explanation or a document checklist?',
            'Should this answer prioritize ICC rules, sanctions, or customs guidance?',
          ],
          domainTags: [],
        },
      ]
      query.setMessages((prev) => [...prev, ...previewMessages])
      recordHistory({
        query_id: previewQueryId,
        query_text: value,
        answer_text: previewMessages[1]?.text ?? '',
        confidence_band: 'low',
        created_at: createdAt,
      })
      return
    }
    const response = await query.submitQuery(value)
    if (!response) return
    recordHistory({
      query_id: response.query_id,
      query_text: value,
      answer_text: response.answer,
      confidence_band: response.confidence_band,
      created_at: new Date().toISOString(),
    })
    if (auth.isAuthenticated) {
      void queryClient.invalidateQueries({ queryKey: ['history'] })
    }
  }

  const openCitation = async (citation: Citation) => {
    setCitationPanelOpen(true)
    try {
      const rule = await api.getRule(citation.rule_id)
      setSelectedRule(rule)
    } catch {
      setSelectedRule({
        rule_id: citation.rule_id,
        rulebook: citation.rulebook,
        reference: citation.reference,
        text: citation.excerpt,
        title: 'Rule details unavailable',
        domain: null,
        jurisdiction: null,
        document_type: null,
        metadata: null,
      })
    }
  }

  const saveMessage = async (queryId: string) => {
    if (!auth.isAuthenticated || !auth.user) {
      setLoginOpen(true)
      return
    }
    try {
      await api.saveAnswer(queryId, null, { userId: auth.user.id, tier: auth.tier, accessToken: auth.accessToken })
      toast.success('Saved to your account.')
      void queryClient.invalidateQueries({ queryKey: ['saved'] })
    } catch (error) {
      toast.error(`Save failed: ${String(error)}`)
    }
  }

  const handleNewQuery = () => {
    resetSession()
    query.clearMessages()
    setActiveQuickCategory(null)
    setCitationPanelOpen(false)
    setSelectedRule(null)
    setMobileDrawerOpen(false)
  }

  const deleteSaved = async (savedId: string) => {
    if (!auth.isAuthenticated || !auth.user) return
    try {
      await api.deleteSaved(savedId, { userId: auth.user.id, tier: auth.tier, accessToken: auth.accessToken })
      toast.success('Removed from saved answers.')
      void queryClient.invalidateQueries({ queryKey: ['saved'] })
    } catch (error) {
      toast.error(`Remove failed: ${String(error)}`)
    }
  }

  const openHistoryItem = (item: HistoryItem) => {
    setActiveQuickCategory(null)
    track('chat_history_opened', {
      query_id: item.query_id,
      created_at: item.created_at,
    })
    query.setMessages(buildHistoryMessages(item))
  }

  useEffect(() => {
    const state = (location.state as { initialQuery?: string; authMode?: 'login' | 'signup' } | null) ?? null
    const initialQuery = state?.initialQuery
    let shouldClearState = false

    if (state?.authMode === 'login') {
      setLoginOpen(true)
      shouldClearState = true
    } else if (state?.authMode === 'signup') {
      setSignupOpen(true)
      shouldClearState = true
    }

    if (initialQuery && seededQueryRef.current !== initialQuery) {
      seededQueryRef.current = initialQuery
      void submitQuery(initialQuery)
      shouldClearState = true
    }

    if (shouldClearState) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        history={historyItems}
        savedAnswers={savedAnswers}
        activeQuickCategory={activeQuickCategory}
        tier={auth.tier}
        isAuthenticated={auth.isAuthenticated}
        previewMode={previewMode}
        usedCount={tierLimit.usedCount}
        remaining={tierLimit.remaining}
        limitValue={tierLimit.limitValue}
        onNewQuery={handleNewQuery}
        onPickHistory={openHistoryItem}
        onQuickCategory={(value) => {
          setActiveQuickCategory(value)
        }}
        onDeleteSaved={(savedId) => {
          void deleteSaved(savedId)
        }}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenSignup={() => setSignupOpen(true)}
        onLogout={() => {
          void auth.logout()
          handleNewQuery()
        }}
      />

      <MainArea
        messages={query.messages}
        suggestions={suggestionTexts}
        isLoading={query.isLoading}
        error={query.error}
        canSave={!previewMode && auth.isAuthenticated}
        activeQuickCategory={activeQuickCategory}
        previewMode={previewMode}
        onSubmitQuery={submitQuery}
        onNewQuery={handleNewQuery}
        onPickSuggestion={(value) => {
          void submitQuery(value)
        }}
        onCitationClick={(citation) => {
          void openCitation(citation)
        }}
        onSaveMessage={(queryId) => {
          void saveMessage(queryId)
        }}
      />

      <CitationPanel open={citationPanelOpen} rule={selectedRule} onClose={() => setCitationPanelOpen(false)} />

      <MobileDrawer
        open={mobileDrawerOpen}
        title={mobileDrawerMode === 'history' ? 'History' : 'Saved'}
        mode={mobileDrawerMode}
        history={historyItems}
        savedAnswers={savedAnswers}
        previewMode={previewMode}
        onOpenChange={setMobileDrawerOpen}
        onPickHistory={openHistoryItem}
        onDeleteSaved={(savedId) => {
          void deleteSaved(savedId)
        }}
      />

      <MobileNav
        onNewQuery={handleNewQuery}
        onHistory={() => {
          setMobileDrawerMode('history')
          setMobileDrawerOpen(true)
        }}
        onSaved={() => {
          setMobileDrawerMode('saved')
          setMobileDrawerOpen(true)
        }}
        onPro={() => navigate('/upgrade')}
      />

      <LoginModal
        open={loginOpen}
        isLoading={auth.isLoading}
        oauth={auth.oauth}
        authStatus={auth.authStatus}
        onOpenChange={setLoginOpen}
        onSwitchMode={() => {
          setLoginOpen(false)
          setSignupOpen(true)
        }}
        onSubmit={async (email, password) => {
          try {
            await auth.login(email, password)
            toast.success('Signed in.')
            setLoginOpen(false)
          } catch (error) {
            toast.error(`Login failed: ${String(error)}`)
          }
        }}
        onOAuth={async (provider) => {
          try {
            await auth.loginWithOAuth(provider)
          } catch (error) {
            toast.error(`OAuth unavailable: ${String(error)}`)
          }
        }}
      />

      <SignupModal
        open={signupOpen}
        isLoading={auth.isLoading}
        oauth={auth.oauth}
        authStatus={auth.authStatus}
        onOpenChange={setSignupOpen}
        onSwitchMode={() => {
          setSignupOpen(false)
          setLoginOpen(true)
        }}
        onSubmit={async (email, password) => {
          try {
            const result = await auth.signup(email, password)
            if (result.status === 'signed_in') {
              toast.success('Account created.')
              setSignupOpen(false)
              return
            }
            if (result.status === 'existing_account') {
              toast.message('That email already looks registered. Sign in instead.')
              setSignupOpen(false)
              setLoginOpen(true)
              return
            }
            toast.success('Check your email to confirm your account.')
            setSignupOpen(false)
          } catch (error) {
            toast.error(`Signup failed: ${String(error)}`)
          }
        }}
        onOAuth={async (provider) => {
          try {
            await auth.loginWithOAuth(provider)
          } catch (error) {
            toast.error(`OAuth unavailable: ${String(error)}`)
          }
        }}
      />

      {tierLimit.reachedLimit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-panel max-w-md rounded-xl p-5 text-center">
            <p className="text-lg font-semibold">Monthly free query limit reached</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Register for unlimited queries or upgrade to Pro for exports and API access.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm"
                onClick={() => setSignupOpen(true)}
              >
                Create free account
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => {
                  resetSession()
                  navigate('/upgrade')
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
