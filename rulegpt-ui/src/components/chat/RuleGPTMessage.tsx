import { toast } from 'sonner'
import { CitationChip } from '@/components/chat/CitationChip'
import { ConfidenceBadge } from '@/components/chat/ConfidenceBadge'
import { DomainTag } from '@/components/chat/DomainTag'
import { MessageActions } from '@/components/chat/MessageActions'
import { TRDRHubCTA } from '@/components/conversion/TRDRHubCTA'
import type { Citation, Message } from '@/types'

interface RuleGPTMessageProps {
  message: Message
  canSave?: boolean
  onCitationClick: (citation: Citation) => void
  onSave: (queryId: string) => void
}

export function RuleGPTMessage({ message, canSave, onCitationClick, onSave }: RuleGPTMessageProps) {
  return (
    <div className="flex justify-start">
      <article className="w-full border border-black/10 bg-white px-5 py-5 text-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">RuleGPT</p>
          <div className="flex flex-wrap items-center gap-2">
            {message.confidence ? <ConfidenceBadge confidence={message.confidence} /> : null}
            {message.domainTags?.map((domain) => (
              <DomainTag key={domain} domain={domain} />
            ))}
          </div>
        </div>

        <div className="border-t border-black/8 pt-4">
          <p className="whitespace-pre-wrap leading-7 text-[#0c111d]">{message.text}</p>
        </div>

        {message.citations && message.citations.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.citations.map((citation) => (
              <CitationChip
                key={`${citation.rule_id}-${citation.reference}`}
                citation={citation}
                onClick={onCitationClick}
              />
            ))}
          </div>
        ) : null}

        {message.suggestedFollowups && message.suggestedFollowups.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">
            {message.suggestedFollowups.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {message.showTRDRCTA ? <TRDRHubCTA text={message.trdrCtaText} url={message.trdrCtaUrl} /> : null}

        <MessageActions
          canSave={canSave}
          onCopy={() => {
            void navigator.clipboard.writeText(message.text)
            toast.success('Answer copied.')
          }}
          onSave={() => {
            if (message.queryId) {
              onSave(message.queryId)
              return
            }
            toast.error('Save unavailable for this message.')
          }}
        />

        {message.disclaimer ? (
          <p className="mt-3 border-t border-black/8 pt-3 text-[10px] leading-5 text-muted-foreground">
            {message.disclaimer}
          </p>
        ) : null}
      </article>
    </div>
  )
}
