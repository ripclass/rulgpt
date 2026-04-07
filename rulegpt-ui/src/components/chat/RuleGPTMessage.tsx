import { toast } from 'sonner'
import { CitationChip } from '@/components/chat/CitationChip'
import { ConfidenceBadge } from '@/components/chat/ConfidenceBadge'
import { DomainTag } from '@/components/chat/DomainTag'
import { MessageActions } from '@/components/chat/MessageActions'
import { TRDRHubCTA } from '@/components/conversion/TRDRHubCTA'
import { api } from '@/lib/api'
import type { Citation, Message } from '@/types'
import { RuxMark } from '@/components/shared/RuxMascot'

interface RuleGPTMessageProps {
  message: Message
  canSave?: boolean
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
}

export function RuleGPTMessage({ message, canSave, onCitationClick, onSave }: RuleGPTMessageProps) {
  return (
    <div className="flex justify-start mb-6">
      <article className="group relative w-full rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] px-6 py-6 shadow-sm transition-colors">
        {/* Minimal left accent line for system messages */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B2F273] rounded-l-sm" />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 dark:border-white/5 pb-4 transition-colors">
          <div className="flex items-center gap-2">
            <RuxMark className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">
              tfrules
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
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Referenced Articles</p>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationChip
                  key={`${citation.rule_id}-${citation.reference}`}
                  citation={citation}
                  onClick={onCitationClick}
                />
              ))}
            </div>
          </div>
        ) : null}

        {message.suggestedFollowups && message.suggestedFollowups.length > 0 ? (
          <div className="mt-6 border-t border-neutral-100 dark:border-white/5 pt-5 transition-colors">
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">Suggested Topics</p>
            <ul className="list-disc space-y-2 pl-5 text-[14px] leading-6 text-neutral-600 dark:text-neutral-400">
              {message.suggestedFollowups.map((item) => (
                <li key={item} className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer">{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 border-t border-neutral-100 dark:border-white/5 pt-4 flex items-center justify-between transition-colors">
          <div className="text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <MessageActions
            canSave={canSave}
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
              const text = `${message.text}\n\n— via tfrules.com`
              if (navigator.share) {
                void navigator.share({ title: 'TFRules Answer', text, url: 'https://www.tfrules.com' })
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
    </div>
  )
}
