import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, FileText, MessageSquare, PenLine, SendHorizonal } from 'lucide-react'
import { RuxMark } from '@/components/shared/RuxMascot'
import { PublicFooter } from '@/components/shared/PublicFooter'
import { api } from '@/lib/api'
import type { CheckoutPlan, SessionTier } from '@/types'

interface ChatFirstLandingProps {
  isAuthenticated: boolean
  tier: SessionTier
  userEmail?: string | null
  onOpenLogin: () => void
  onOpenSignup: () => void
  onOpenChat: () => void
  onSubmitQuery: (query: string) => void
  onStartCheckout: (plan: CheckoutPlan, interval: 'monthly' | 'annual') => void
  isCheckingOut?: boolean
}

const SUGGESTED_QUERIES = [
  'Is "Dress Shirts" vs "Shirts" a discrepancy under UCP 600?',
  'BL date is one day after LC shipment deadline. Late shipment?',
  'Does RCEP allow cumulation of Malaysian inputs for Vietnamese exports?',
  'Crude oil LC at 40% below market — what TBML red flags?',
]

const FEATURE_ROWS = [
  {
    icon: MessageSquare,
    verb: 'Ask',
    title: 'Cited Q&A on every ICC standard.',
    description: 'UCP 600, ISBP 821, URDG 758, ISP98, eUCP 2.1, sanctions, FTAs, customs — answered with exact article citations, not opinion.',
    snippet: '] What documents are required for a CIF shipment under UCP600?\n> UCP600 Art. 19-21 · answer in 4s',
    href: null as string | null,
    badge: null as string | null,
  },
  {
    icon: FileText,
    verb: 'Interpret MT700',
    title: 'Paste an LC, get a field-by-field risk read.',
    description: 'Drop the raw SWIFT MT700 text in and get every field explained, soft-clause language flagged, and cited rules attached. Free.',
    snippet: ':46A: Documents required\n> Flag: ambiguous — "acceptable to applicant" is a soft clause',
    href: '/chat?mode=mt700',
    badge: 'Free',
  },
  {
    icon: PenLine,
    verb: 'Draft',
    title: 'Case notes and bank-ready responses.',
    description: 'Turn any answer into a case note or a drafted bank response, buyer email, waiver request, amendment request, or discrepancy explanation.',
    snippet: '> Draft: discrepancy_explanation.md\n> citations: UCP600 Art. 14, ISBP 821 Block C3',
    href: null,
    badge: 'Pro',
  },
]

function formatTotalRules(totalRules: number | null | undefined): string {
  if (typeof totalRules === 'number' && totalRules > 0) {
    return totalRules.toLocaleString()
  }
  return '10,000+'
}

export function ChatFirstLanding({
  isAuthenticated,
  tier,
  userEmail,
  onOpenLogin,
  onOpenSignup,
  onOpenChat,
  onSubmitQuery,
  onStartCheckout,
  isCheckingOut,
}: ChatFirstLandingProps) {
  const [heroQuery, setHeroQuery] = useState('')

  const stats = useQuery({
    queryKey: ['landing-stats'],
    queryFn: api.getStats,
    staleTime: 60 * 60 * 1000,
    retry: false,
  })

  const statsLabel = formatTotalRules(stats.data?.total_rules)

  const submitHero = () => {
    const trimmed = heroQuery.trim()
    if (!trimmed) return
    onSubmitQuery(trimmed)
  }

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#FF4F00] selection:text-white">
      {/* Slim nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5 text-neutral-900">
            <RuxMark className="h-6 w-6 border-none" />
            <span className="text-lg font-semibold tracking-tight">RulGPT</span>
          </Link>
          <nav className="hidden items-center gap-8 text-[14px] font-medium text-neutral-600 md:flex">
            <Link to="/blog" className="transition hover:text-neutral-900">Blog</Link>
            <a href="#pricing" className="transition hover:text-neutral-900">Pricing</a>
            <Link to="/faq" className="transition hover:text-neutral-900">FAQ</Link>
            {isAuthenticated ? (
              <button onClick={onOpenChat} className="rounded-sm bg-[#FF4F00] px-5 py-2 text-white transition hover:bg-[#E64600]">
                Open chat
              </button>
            ) : (
              <button onClick={onOpenLogin} className="transition hover:text-neutral-900">
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — the chat input IS the hero */}
      <section className="section-obsidian relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden bg-[#050B14] px-6 py-20">
        <div className="absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-[#FF4F00]/8 blur-[150px] mix-blend-screen" />
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Before the bank rejects it, ask RulGPT.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-300 md:text-lg">
            Cited answers on UCP 600, ISBP 821, URDG 758, ISP98, eUCP 2.1, URC 522, sanctions, FTAs and
            customs — grounded in a {statsLabel}-rule grounded corpus with verbatim regulatory citations.
          </p>

          <form
            className="mt-8 w-full"
            onSubmit={(event) => {
              event.preventDefault()
              submitHero()
            }}
          >
            <div className="relative flex flex-col rounded-2xl bg-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.12] focus-within:bg-white/[0.14] focus-within:ring-1 focus-within:ring-white/20">
              <textarea
                value={heroQuery}
                onChange={(event) => setHeroQuery(event.target.value)}
                placeholder="Ask about any trade finance rule..."
                rows={3}
                className="w-full min-h-[100px] resize-none border-0 bg-transparent px-5 pt-5 pb-14 text-[15px] font-medium text-white placeholder-neutral-400 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    submitHero()
                  }
                }}
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  {heroQuery.length} / 500
                </span>
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!heroQuery.trim()}
                  className="flex items-center justify-center rounded-full bg-[#FF4F00] p-2 text-white transition hover:bg-[#E64600] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <SendHorizonal className="relative left-[1px] h-4 w-4" />
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {SUGGESTED_QUERIES.map((query) => (
              <button
                key={query}
                type="button"
                onClick={() => onSubmitQuery(query)}
                className="h-auto whitespace-normal rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-neutral-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                {query}
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-widest text-neutral-500">
            2 free answers, no account needed.
          </p>
        </div>
      </section>

      {/* Three verbs */}
      <section className="border-t border-neutral-200 bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="space-y-16">
            {FEATURE_ROWS.map((row) => {
              const Icon = row.icon
              const content = (
                <div className="grid items-center gap-8 md:grid-cols-2">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-neutral-100 text-[#FF4F00]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest text-[#FF4F00]">{row.verb}</span>
                      {row.badge ? (
                        <span className="rounded-sm bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          {row.badge}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight text-neutral-900">{row.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">{row.description}</p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-950 p-6 font-mono text-xs leading-relaxed text-neutral-400">
                    {row.snippet.split('\n').map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                </div>
              )
              return row.href ? (
                <Link key={row.verb} to={row.href} className="block transition hover:opacity-90">
                  {content}
                </Link>
              ) : (
                <div key={row.verb}>{content}</div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-neutral-200 bg-neutral-50 py-24 scroll-mt-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-neutral-900 md:text-4xl">Simple pricing.</h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-sm border border-neutral-200 bg-white p-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#FF4F00]">Free</h3>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">$0</p>
                <ul className="mt-6 space-y-3 text-sm text-neutral-600">
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-neutral-300" /> 5 questions/day with citations</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-neutral-300" /> MT700 interpreter</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-neutral-300" /> Glossary</li>
                </ul>
              </div>
              <button onClick={onOpenChat} className="mt-8 w-full rounded-sm border border-neutral-200 py-3 text-sm font-semibold uppercase tracking-wide text-neutral-900 transition hover:bg-neutral-50">
                Start free
              </button>
            </div>

            <div className="relative flex flex-col justify-between rounded-sm border border-[#FF4F00] bg-neutral-900 p-8 shadow-2xl">
              <span className="absolute -top-3 left-6 rounded-sm bg-[#FF4F00] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                Most Popular
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Pro</h3>
                <p className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight text-white">$29</span>
                  <span className="text-base font-medium text-neutral-500">/mo</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-neutral-300">
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> Fair-use Q&amp;A</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> Unlimited case notes + drafts</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> PDF export</li>
                </ul>
              </div>
              <button
                onClick={() => (isAuthenticated ? onStartCheckout('pro', 'monthly') : onOpenLogin())}
                disabled={isCheckingOut}
                className="mt-8 w-full rounded-sm bg-[#FF4F00] py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-[#FF4F00]/20 transition hover:bg-[#E64600] disabled:opacity-50"
              >
                {isCheckingOut ? 'Redirecting...' : 'Go Pro'}
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-sm border border-neutral-200 bg-white p-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Enterprise</h3>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">Contact us</p>
                <ul className="mt-6 space-y-3 text-sm text-neutral-600">
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> Everything in Pro</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> Volume &amp; team seats</li>
                  <li className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[#FF4F00]" /> Dedicated support</li>
                </ul>
              </div>
              <a
                href="mailto:hello@rulgpt.com"
                className="mt-8 block w-full rounded-sm border border-neutral-200 py-3 text-center text-sm font-semibold uppercase tracking-wide text-neutral-900 transition hover:bg-neutral-50"
              >
                Contact us
              </a>
            </div>
          </div>

          <p className="mt-10 text-center text-sm font-medium text-neutral-500">
            No subscription? Case note $9 &middot; Draft $19, pay as you go.
          </p>
        </div>
      </section>

      {/* LCopilot cross-CTA */}
      <section className="border-t border-neutral-200 bg-white py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <a
            href="https://trdrhub.com/lcopilot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-lg font-semibold text-neutral-900 transition hover:text-[#FF4F00]"
          >
            Need the full document check? &rarr; LCopilot
          </a>
          {userEmail ? null : (
            <p className="mt-3 text-sm text-neutral-500">
              <button onClick={onOpenSignup} className="underline hover:text-neutral-900">Create a free account</button> to save history and unlock case notes.
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </p>
          )}
          <p className="mt-2 text-xs uppercase tracking-widest text-neutral-400">Current plan: {tier}</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
