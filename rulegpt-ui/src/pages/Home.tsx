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

// Local history is in-memory only — clears on page refresh.
// Authenticated users get persistent history from the backend.
function persistLocalHistory(_items: HistoryItem[]) {
  // no-op: intentionally not persisted to localStorage to avoid stale data
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
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([])
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

  const categorySuggestions: Record<string, string[]> = {
    'LC Compliance': [
      'My invoice says "Men\'s 100% Cotton Woven Dress Shirts" but the LC says "Men\'s 100% Cotton Woven Shirts". The bank rejected it. Is the word "Dress" really a discrepancy under UCP 600?',
      'The LC requires a full set of 3/3 original bills of lading but the shipping line only issued 2/2. Can the bank accept this or is it an automatic refusal?',
      'I shipped on June 10 but the bill of lading on-board date says June 11 because the carrier delayed the notation. The LC last shipment date is June 10. Is this a late shipment discrepancy?',
      'My LC says "insurance for 110% CIF value" but my insurance certificate shows coverage for 110% of the invoice value, and the invoice is FOB. Is this a discrepancy?',
      'The LC requires documents "in English" but my certificate of origin from the chamber of commerce is bilingual (Arabic and English). Can the bank refuse it?',
    ],
    'Customs & HS Codes': [
      'I\'m exporting garments that are 60% cotton and 40% polyester. The buyer classified it under HS 6205 but my country says 6206. Which classification rule applies and who decides?',
      'My buyer is a subsidiary of our parent company. Customs is questioning whether the invoice price is arm\'s length. What valuation method should I use for related-party transactions?',
      'I\'m importing machinery temporarily into Nigeria for a construction project. It\'ll be re-exported in 6 months. What customs regime should I use to avoid paying full duty?',
      'I\'m shipping frozen seafood to the EU. Customs says I need a health certificate, a catch certificate, and an IUU declaration. Can I clear goods if one document arrives late?',
      'My HS code was reclassified after shipment and now the duty rate is higher. Can customs retroactively apply the new classification to goods already cleared?',
    ],
    'Sanctions': [
      'We received an LC for crude oil from UAE to China but the unit price is 40% below market. The beneficiary was incorporated 3 months ago. What TBML red flags should we check?',
      'Our client wants to ship dual-use industrial equipment to Turkey. It\'s not on the EU control list but it is on the US Commerce Control List. We\'re a European bank — which regime applies?',
      'A vessel in our transaction changed its flag from Iran to Panama 6 months ago. The cargo is legitimate agricultural goods. Do we still need to do enhanced due diligence?',
      'We\'re processing an LC where the beneficiary\'s name is a close match — but not exact — to an entry on the OFAC SDN list. What\'s the threshold for a "hit" and what should we do?',
      'Our client wants to ship medical supplies to a country under EU sanctions. There\'s a humanitarian exemption. What documentation do we need to process the LC without violating sanctions?',
    ],
    'FTA Rules of Origin': [
      'I\'m exporting wooden furniture from Vietnam to Australia. The raw timber was imported from Malaysia. Does that count as originating material under RCEP cumulation rules?',
      'My garment factory in Bangladesh uses fabric from China and buttons from India. Can I still get a RCEP certificate of origin for the finished shirts exported to Japan?',
      'I\'m shipping auto parts from Mexico to the US under USMCA. The steel in the parts was smelted in Brazil. Does the product still qualify for preferential tariff treatment?',
      'My buyer in Kenya wants an AFCFTA certificate of origin for textiles I\'m exporting from Ethiopia. What percentage of local content do I need and how do I prove it?',
      'I have a shipment going from Thailand to Canada. Can I use RCEP or CPTPP — or both? Which one gives me a better tariff rate and can I switch between them per shipment?',
    ],
    'Trade Documentation': [
      'My bill of lading shows "shipped on board" but doesn\'t name the vessel. The LC requires the vessel name. Is this a discrepancy under ISBP745 or can the carrier add it later?',
      'The LC requires "marine insurance covering warehouse to warehouse". My policy says "port to port". Is this a valid discrepancy or does the Incoterms coverage handle the difference?',
      'My packing list shows total weight as 10,050 kg but the bill of lading says 10,000 kg. The LC is silent on weight tolerance. Can the bank refuse for this 0.5% difference?',
      'The LC was issued under UCP 600 but the buyer now wants to present documents electronically. Can we switch to eUCP mid-transaction or do we need an amendment?',
      'My multimodal transport document covers shipment from factory in Dhaka to warehouse in Hamburg. The LC only requires a bill of lading. Will the bank accept the multimodal document instead?',
    ],
    'Bank Requirements': [
      'We received documents on Monday. Our examiner found a discrepancy on Wednesday but the senior reviewer disagrees. How many banking days do we have before we must give notice under Article 16?',
      'We\'re the confirming bank on an LC and the documents have discrepancies. The issuing bank says they\'ll accept on approval basis. Are we obligated to go along or can we refuse independently?',
      'An LC came through SWIFT MT700 but field 46A lists documents we\'ve never seen before — a "fumigation compliance report". The applicant insists. Can we advise this LC as-is?',
      'We issued an LC with deferred payment at 90 days from BL date. The beneficiary wants to discount the deferred payment. What are our obligations if we agreed to a deferred payment undertaking?',
      'Our client wants to transfer the LC to a second beneficiary in another country. The first beneficiary wants to substitute invoices. What are our obligations as the transferring bank under Article 38?',
    ],
  }

  const defaultSuggestions = suggestions.data?.map((item) => item.text) ?? [
    'My LC says "Cotton Woven Shirts" but my invoice says "Cotton Woven Dress Shirts". The bank rejected it. Is the word "Dress" really a discrepancy under UCP 600?',
    'I shipped on June 10 but the BL on-board date says June 11 because the carrier delayed. The LC last shipment date is June 10. Is this late shipment?',
  ]

  const suggestionTexts = useMemo(
    () => activeQuickCategory && categorySuggestions[activeQuickCategory]
      ? categorySuggestions[activeQuickCategory]
      : defaultSuggestions,
    [activeQuickCategory, defaultSuggestions],
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
          setActiveQuickCategory((prev) => prev === value ? null : value)
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
          navigate('/#pricing')
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
        onPro={() => navigate('/#pricing')}
      />

    </div>
  )
}
