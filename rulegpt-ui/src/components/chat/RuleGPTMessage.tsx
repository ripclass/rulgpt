import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { CitationChip } from '@/components/chat/CitationChip'
import { ConfidenceBadge } from '@/components/chat/ConfidenceBadge'
import { DomainTag } from '@/components/chat/DomainTag'
import { MessageActions } from '@/components/chat/MessageActions'
import { TRDRHubCTA } from '@/components/conversion/TRDRHubCTA'
import { ArtifactView } from '@/components/workbench/ArtifactView'
import { PaywallDialog } from '@/components/workbench/PaywallDialog'
import { api, ApiError, type RequestIdentity } from '@/lib/api'
import { useAuthModal } from '@/contexts/AuthModalContext'
import type { ArtifactKind, ArtifactResponse, Citation, DraftType, Message, PaymentRequiredDetail } from '@/types'
import { RuxMark } from '@/components/shared/RuxMascot'

function isPaymentRequiredDetail(value: unknown): value is PaymentRequiredDetail {
  return Boolean(value) && typeof value === 'object' && (value as { error?: unknown }).error === 'payment_required'
}

interface RuleGPTMessageProps {
  message: Message
  canSave?: boolean
  identity?: RequestIdentity
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
  onFollowup?: (query: string) => void
  onProCheckout?: () => void
  onOneoffCheckout?: (kind: ArtifactKind) => void
}

export function RuleGPTMessage({
  message,
  canSave,
  identity,
  onCitationClick,
  onSave,
  onFollowup,
  onProCheckout,
  onOneoffCheckout,
}: RuleGPTMessageProps) {
  const authModal = useAuthModal()
  const [isGeneratingCaseNote, setIsGeneratingCaseNote] = useState(false)
  const [generatingDraftType, setGeneratingDraftType] = useState<DraftType | null>(null)
  const [artifact, setArtifact] = useState<ArtifactResponse | null>(null)
  const [artifactOpen, setArtifactOpen] = useState(false)
  const [paywallDetail, setPaywallDetail] = useState<PaymentRequiredDetail | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  // Citations are kept out of the way by default so the answer reads clean;
  // the count stays visible (it's still a *cited* answer) and one tap reveals
  // the exact articles for anyone who wants to verify.
  const [citationsOpen, setCitationsOpen] = useState(false)

  const handleArtifactError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 402 && isPaymentRequiredDetail(error.detail)) {
      setPaywallDetail(error.detail)
      setPaywallOpen(true)
      return
    }
    const detailMessage = error instanceof ApiError ? error.message : 'Please try again.'
    toast.error(`Generation failed: ${detailMessage}`)
  }

  const generateCaseNote = async () => {
    if (!canSave) {
      authModal.openLogin()
      return
    }
    if (!message.queryId) {
      toast.error('Case note unavailable for this message.')
      return
    }
    setIsGeneratingCaseNote(true)
    try {
      const response = await api.createCaseNote(message.queryId, identity ?? {})
      setArtifact(response)
      setArtifactOpen(true)
    } catch (error) {
      handleArtifactError(error)
    } finally {
      setIsGeneratingCaseNote(false)
    }
  }

  const generateDraft = async (draftType: DraftType) => {
    if (!canSave) {
      authModal.openLogin()
      return
    }
    if (!message.queryId) {
      toast.error('Draft unavailable for this message.')
      return
    }
    setGeneratingDraftType(draftType)
    try {
      const response = await api.createDraft(message.queryId, draftType, identity ?? {})
      setArtifact(response)
      setArtifactOpen(true)
    } catch (error) {
      handleArtifactError(error)
    } finally {
      setGeneratingDraftType(null)
    }
  }

  return (
    <div className="flex justify-start mb-6">
      <article className="group relative w-full rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] px-6 py-6 shadow-sm transition-colors">
        {/* Minimal left accent line for system messages */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#FF4F00] rounded-l-sm" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 dark:border-white/5 pb-4 transition-colors">
          <div className="flex items-center gap-2">
            <RuxMark className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              RulGPT
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {message.confidence ? <ConfidenceBadge confidence={message.confidence} /> : null}
            {message.domainTags?.map((domain) => (
              <DomainTag key={domain} domain={domain} />
            ))}
          </div>
        </div>

        <div className="pt-2">
          <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-900 dark:text-neutral-100">
            {message.text}
          </p>
        </div>

        {message.citations && message.citations.length > 0 ? (
          <div className="mt-6 border-t border-neutral-100 dark:border-white/5 pt-5 transition-colors">
            <button
              type="button"
              onClick={() => setCitationsOpen((open) => !open)}
              aria-expanded={citationsOpen}
              className="group/cite inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-neutral-500 hover:text-[#FF4F00] dark:hover:text-[#FF4F00] transition-colors cursor-pointer"
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform duration-200 ${citationsOpen ? 'rotate-90' : ''}`}
              />
              {citationsOpen
                ? 'Referenced Articles'
                : `${message.citations.length} source${message.citations.length > 1 ? 's' : ''} cited`}
            </button>
            {citationsOpen ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.citations.map((citation) => (
                  <CitationChip
                    key={`${citation.rule_id}-${citation.reference}`}
                    citation={citation}
                    onClick={onCitationClick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {message.suggestedFollowups && message.suggestedFollowups.length > 0 ? (
          <div className="mt-6 border-t border-neutral-100 dark:border-white/5 pt-5 transition-colors">
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Suggested Topics</p>
            <div className="space-y-2">
              {message.suggestedFollowups.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onFollowup?.(item)}
                  className="block w-full text-left text-[14px] leading-6 text-neutral-600 dark:text-neutral-400 hover:text-[#FF4F00] dark:hover:text-[#FF4F00] transition-colors cursor-pointer py-1 px-3 rounded-sm hover:bg-neutral-50 dark:hover:bg-white/5"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-100 dark:border-white/5 pt-4 flex items-center justify-between transition-colors">
          <div className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <MessageActions
            canSave={canSave}
            canGenerateArtifacts={canSave}
            isGeneratingCaseNote={isGeneratingCaseNote}
            generatingDraftType={generatingDraftType}
            onGenerateCaseNote={() => void generateCaseNote()}
            onGenerateDraft={(draftType) => void generateDraft(draftType)}
            onCopy={() => {
              void navigator.clipboard.writeText(message.text)
              toast.success('Answer copied to clipboard.')
            }}
            onSave={() => {
              if (message.queryId) {
                onSave(message.queryId)
                return
              }
              toast.error('Save unavailable for this message.')
            }}
            onShare={() => {
              const text = `${message.text}\n\n— via rulgpt.com`
              if (navigator.share) {
                void navigator.share({ title: 'RulGPT Answer', text, url: 'https://rulgpt.com' })
              } else {
                void navigator.clipboard.writeText(text)
                toast.success('Answer copied for sharing.')
              }
            }}
            onThumbsUp={() => {
              if (!message.queryId) return
              api.submitFeedback(message.queryId, 'thumbs_up')
                .then(() => toast.success('Thanks for the feedback.'))
                .catch(() => toast.error('Feedback failed. Try again.'))
            }}
            onThumbsDown={() => {
              if (!message.queryId) return
              api.submitFeedback(message.queryId, 'thumbs_down')
                .then(() => toast.success('Thanks — we\'ll work on improving this.'))
                .catch(() => toast.error('Feedback failed. Try again.'))
            }}
          />
        </div>

        {message.showTRDRCTA ? (
          <div className="mt-6">
            <TRDRHubCTA text={message.trdrCtaText} url={message.trdrCtaUrl} />
          </div>
        ) : null}

        {message.disclaimer ? (
          <p className="mt-4 text-[11px] font-medium text-neutral-500 dark:text-neutral-600 uppercase tracking-wide">
            * {message.disclaimer}
          </p>
        ) : null}
      </article>

      <ArtifactView
        open={artifactOpen}
        artifact={artifact}
        onOpenChange={setArtifactOpen}
        onCitationClick={onCitationClick}
      />

      <PaywallDialog
        open={paywallOpen}
        detail={paywallDetail}
        onOpenChange={setPaywallOpen}
        onOneoffCheckout={(kind) => {
          setPaywallOpen(false)
          onOneoffCheckout?.(kind)
        }}
        onProCheckout={() => {
          setPaywallOpen(false)
          onProCheckout?.()
        }}
      />
    </div>
  )
}
