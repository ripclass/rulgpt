import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery as useRQQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MainArea } from '@/components/layout/MainArea'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { CitationPanel } from '@/components/chat/CitationPanel'
import { api } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/contexts/AuthModalContext'
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
  const authModal = useAuthModal()
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const checkoutState = params.get('checkout')
    if (checkoutState !== 'success') return

    void auth
      .refreshSession()
      .then((status) => {
        if (status?.tier === 'starter' || status?.tier === 'pro') {
          toast.success(`Billing updated. Your account is now ${status.tier}.`)
        } else {
          toast.success('Checkout completed. Refreshing your account status...')
        }
      })
      .catch(() => {
        toast.message('Checkout completed. Sign out and back in if your tier looks stale.')
      })
      .finally(() => {
        navigate(location.pathname, { replace: true })
      })
  }, [auth, location.pathname, location.search, navigate])

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
      authModal.openLogin()
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
    setLocalHistory([])
    persistLocalHistory([])
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
      authModal.openLogin()
      shouldClearState = true
    } else if (state?.authMode === 'signup') {
      authModal.openSignup()
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
    <div className="min-h-screen md:flex bg-[#FAFAFA] dark:bg-[#171717] transition-colors">
      <Sidebar
        history={historyItems}
        savedAnswers={savedAnswers}
        activeQuickCategory={activeQuickCategory}
        tier={auth.tier}
        isAuthenticated={auth.isAuthenticated}
        userEmail={auth.user?.email ?? null}
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
        onOpenLogin={() => authModal.openLogin()}
        onOpenSignup={() => authModal.openSignup()}
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
        reachedLimit={tierLimit.reachedLimit}
        isAuthenticated={auth.isAuthenticated}
        onOpenSignup={() => authModal.openSignup()}
        onUpgrade={() => {
          resetSession()
          navigate('/upgrade')
        }}
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

    </div>
  )
}
