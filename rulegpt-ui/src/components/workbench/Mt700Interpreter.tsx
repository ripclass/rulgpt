import { useState } from 'react'
import { AlertTriangle, Flag, SendHorizonal } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { CitationChip } from '@/components/chat/CitationChip'
import { api, ApiError, type RequestIdentity } from '@/lib/api'
import type { Citation, InterpretResponse } from '@/types'

interface Mt700InterpreterProps {
  identity?: RequestIdentity
  onCitationClick?: (citation: Citation) => void
}

export function Mt700Interpreter({ identity, onCitationClick }: Mt700InterpreterProps) {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InterpretResponse | null>(null)

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.interpretMt700(trimmed, identity ?? {})
      setResult(response)
    } catch (err) {
      setResult(null)
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Interpretation failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col overflow-y-auto bg-[#FAFAFA] pb-28 transition-colors dark:bg-[#171717] md:pb-0">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">Interpret MT700</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Paste the raw SWIFT MT700 text and get a field-by-field read: what each field means, which clauses
          are risky, and which rules apply. Free.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste the raw SWIFT MT700 text, including :tag: markers..."
          rows={10}
          disabled={isLoading}
          className="min-h-[220px] rounded-sm border-neutral-200 bg-white font-mono text-[13px] dark:border-white/10 dark:bg-[#141414] dark:text-neutral-100"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading || !text.trim()}
          className="inline-flex w-fit items-center gap-2 rounded-sm bg-[#FF4F00] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizonal className="h-3.5 w-3.5" />
          {isLoading ? 'Interpreting...' : 'Interpret'}
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-sm border border-red-500/20 bg-red-50 px-5 py-4 text-sm font-medium text-red-600 dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-6">
          {result.fields.length > 0 ? (
            <section className="rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#141414]">
              <div className="border-b border-neutral-100 px-5 py-3 dark:border-white/5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Parsed fields</p>
              </div>
              <table className="w-full text-left text-sm">
                <tbody>
                  {result.fields.map((field) => (
                    <tr key={field.tag} className="border-b border-neutral-100 last:border-0 dark:border-white/5">
                      <td className="w-24 px-5 py-3 align-top font-mono text-xs text-neutral-400">:{field.tag}:</td>
                      <td className="w-48 px-3 py-3 align-top text-xs font-semibold text-neutral-700 dark:text-neutral-300">{field.name}</td>
                      <td className="px-3 py-3 align-top text-neutral-900 dark:text-neutral-100">{field.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {result.flags.length > 0 ? (
            <section className="rounded-sm border border-amber-500/30 bg-amber-50 px-5 py-4 dark:bg-amber-500/5">
              <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                <Flag className="h-3.5 w-3.5" /> Soft-clause flags
              </p>
              <ul className="space-y-2">
                {result.flags.map((flag) => (
                  <li key={`${flag.tag}-${flag.name}`} className="text-sm text-neutral-800 dark:text-neutral-200">
                    <span className="font-mono text-xs text-amber-700 dark:text-amber-400">:{flag.tag}: ({flag.name})</span>{' '}
                    {flag.note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-sm border border-neutral-200 dark:border-white/10 bg-white px-5 py-5 dark:bg-[#141414]">
            <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-neutral-900 dark:text-neutral-100">
              {result.answer}
            </p>

            {result.citations.length > 0 ? (
              <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-white/5">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Referenced Articles</p>
                <div className="flex flex-wrap gap-2">
                  {result.citations.map((citation) => (
                    <CitationChip
                      key={`${citation.rule_id}-${citation.reference}`}
                      citation={citation}
                      onClick={(c) => onCitationClick?.(c)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <a
            href={result.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-neutral-900 transition hover:text-[#FF4F00] dark:text-white"
          >
            {result.cta_text}
          </a>

          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-600">
            {result.disclaimer}
          </p>
        </div>
      ) : null}
    </div>
    </main>
  )
}
