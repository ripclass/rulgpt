import { useMemo, useState } from 'react'
import { useQuery as useRQQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainArea } from '@/components/layout/MainArea'
import { MobileNav } from '@/components/layout/MobileNav'
import { MobileDrawer } from '@/components/layout/MobileDrawer'
import { CitationPanel } from '@/components/chat/CitationPanel'
import { LoginModal } from '@/components/auth/LoginModal'
import { SignupModal } from '@/components/auth/SignupModal'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useHistory } from '@/hooks/useHistory'
import { useQuery } from '@/hooks/useQuery'
import { useSession } from '@/hooks/useSession'
import { useTierLimit } from '@/hooks/useTierLimit'
import { isPreviewModeEnabled } from '@/lib/config'
import type { Citation, Message, RuleDetails } from '@/types'

export function Home() {
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [citationPanelOpen, setCitationPanelOpen] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<RuleDetails | null>(null)

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

  const history = useHistory(auth.user?.id, auth.tier, auth.accessToken, !previewMode)
  const savedAnswers = useRQQuery({
    queryKey: ['saved', auth.user?.id, auth.tier, auth.accessToken ?? null],
    queryFn: () => api.listSaved({ userId: auth.user?.id, tier: auth.tier, accessToken: auth.accessToken }),
    enabled: Boolean(auth.user?.id) && !previewMode,
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

  const submitQuery = async (value: string) => {
    if (previewMode) {
      const createdAt = new Date().toISOString()
      const previewMessages: Message[] = [
        {
          id: crypto.randomUUID(),
          role: 'user',
          text: value,
          createdAt,
        },
        {
          id: `preview-${crypto.randomUUID()}`,
          queryId: `preview-${Date.now()}`,
          role: 'assistant',
          text: 'Preview mode is active, so RuleGPT is not calling the live rules engine yet. Once RulHub is connected, this space will return a citation-grounded answer in this same chat flow.',
          createdAt: new Date().toISOString(),
          confidence: 'low',
          citations: [],
          showTRDRCTA: value.toLowerCase().includes('document') || value.toLowerCase().includes('lc'),
          trdrCtaText: null,
          trdrCtaUrl: null,
          disclaimer:
            'Preview mode only. Based on published trade finance rules and standards once the live engine is connected. Not legal advice.',
          suggestedFollowups: [
            'Which rulebook or jurisdiction should this answer search first?',
            'Do you need a rule explanation or actual document validation?',
            'Should this answer prioritize ICC rules, sanctions, or customs guidance?',
          ],
          domainTags: [],
        },
      ]
      query.setMessages((prev) => [...prev, ...previewMessages])
      return
    }
    const response = await query.submitQuery(value)
    if (!response) return
    if (response.show_trdr_cta) {
      toast.message('RuleGPT detected a document-validation use case. TRDR Hub CTA is shown.')
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
      void savedAnswers.refetch()
      toast.success('Saved to your account.')
    } catch (error) {
      toast.error(`Save failed: ${String(error)}`)
    }
  }

  const deleteSaved = async (savedId: string) => {
    if (!auth.user) return
    try {
      await api.deleteSaved(savedId, { userId: auth.user.id, tier: auth.tier, accessToken: auth.accessToken })
      void savedAnswers.refetch()
    } catch {
      toast.error('Delete failed.')
    }
  }

  return (
    <div className="min-h-screen md:flex">
      {!previewMode ? (
        <Sidebar
          history={history.data ?? []}
          savedAnswers={savedAnswers.data ?? []}
          tier={auth.tier}
          isAuthenticated={auth.isAuthenticated}
          previewMode={previewMode}
          usedCount={tierLimit.usedCount}
          remaining={tierLimit.remaining}
          limitValue={tierLimit.limitValue}
          onNewQuery={() => query.clearMessages()}
          onPickHistory={(value) => {
            void submitQuery(value)
          }}
          onDeleteSaved={(savedId) => {
            void deleteSaved(savedId)
          }}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenSignup={() => setSignupOpen(true)}
          onLogout={() => {
            void auth.logout()
          }}
        />
      ) : null}

      <MainArea
        messages={query.messages}
        suggestions={suggestionTexts}
        isLoading={query.isLoading}
        error={query.error}
        canSave={!previewMode && auth.isAuthenticated}
        previewMode={previewMode}
        onSubmitQuery={submitQuery}
        onNewQuery={query.clearMessages}
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

      {!previewMode ? (
        <MobileNav
          onNewQuery={query.clearMessages}
          onHistory={() => setHistoryDrawerOpen(true)}
          onSaved={() => setSavedDrawerOpen(true)}
          onPro={() => navigate('/upgrade')}
        />
      ) : null}

      {!previewMode ? (
        <MobileDrawer
          open={historyDrawerOpen}
          title="Query history"
          mode="history"
          history={history.data ?? []}
          savedAnswers={savedAnswers.data ?? []}
          previewMode={previewMode}
          onOpenChange={setHistoryDrawerOpen}
          onPickHistory={(value) => {
            void submitQuery(value)
          }}
          onDeleteSaved={(savedId) => {
            void deleteSaved(savedId)
          }}
        />
      ) : null}

      {!previewMode ? (
        <MobileDrawer
          open={savedDrawerOpen}
          title="Saved answers"
          mode="saved"
          history={history.data ?? []}
          savedAnswers={savedAnswers.data ?? []}
          previewMode={previewMode}
          onOpenChange={setSavedDrawerOpen}
          onPickHistory={(value) => {
            void submitQuery(value)
          }}
          onDeleteSaved={(savedId) => {
            void deleteSaved(savedId)
          }}
        />
      ) : null}

      <CitationPanel open={citationPanelOpen} rule={selectedRule} onClose={() => setCitationPanelOpen(false)} />

      <LoginModal
        open={loginOpen}
        isLoading={auth.isLoading}
        oauth={auth.oauth}
        onOpenChange={setLoginOpen}
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
        onOpenChange={setSignupOpen}
        onSubmit={async (email, password) => {
          try {
            await auth.signup(email, password)
            toast.success('Account created.')
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
