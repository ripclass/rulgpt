import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  DatabaseZap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { SessionTier } from '@/types'

interface PreviewLandingProps {
  suggestions: string[]
  isAuthenticated: boolean
  tier: SessionTier
  onOpenLogin: () => void
  onOpenSignup: () => void
  onOpenChat: () => void
  onSubmitPreview: (query: string) => Promise<void>
}

const fallbackSuggestions = [
  'What does UCP600 say about transport documents?',
  'How does ISBP745 define a compliant commercial invoice?',
  'What are OFAC requirements for trading with UAE counterparties?',
  'What is the difference between CIF and FOB under Incoterms 2020?',
]

const workflow = [
  {
    number: '01',
    title: 'Question Intake',
    description: 'Start from a trade-finance question, a sanctions scenario, or a document rule check.',
  },
  {
    number: '02',
    title: 'Rules Retrieval',
    description: 'Pull the closest published rules by domain, jurisdiction, and document type.',
  },
  {
    number: '03',
    title: 'Short Answer First',
    description: 'Lead with the decisive answer, then explain only what the rules support.',
  },
  {
    number: '04',
    title: 'Scope Control',
    description: 'Call out missing transaction facts instead of pretending the rule is complete.',
  },
  {
    number: '05',
    title: 'Learning Loop',
    description: 'Capture useful question patterns and low-confidence cases to improve retrieval and answer quality.',
  },
]

const capabilityCards = [
  {
    icon: BookOpen,
    title: 'Citations First',
    description: 'Every answer points back to the rulebook, article, or paragraph that supports it.',
  },
  {
    icon: ShieldCheck,
    title: 'Grounded by Design',
    description: 'RuleGPT refuses to bluff when the rules are partial or the transaction facts are missing.',
  },
  {
    icon: DatabaseZap,
    title: 'ICE Training Ready',
    description: 'Useful sessions stay structured so high-signal queries can become future training data.',
  },
]

const coverageTags = ['UCP600', 'ISBP745', 'Incoterms 2020', 'OFAC', 'FTA Origin Rules', 'Bank Requirements']

export function PreviewLanding({
  suggestions,
  isAuthenticated,
  tier,
  onOpenLogin,
  onOpenSignup,
  onOpenChat,
  onSubmitPreview,
}: PreviewLandingProps) {
  const promptSuggestions = useMemo(
    () => (suggestions.length > 0 ? suggestions.slice(0, 4) : fallbackSuggestions),
    [suggestions],
  )
  const [draft, setDraft] = useState(promptSuggestions[0] ?? fallbackSuggestions[0])

  const scrollToWorkbench = () => {
    document.getElementById('landing-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePreviewSubmit = async () => {
    if (!draft.trim()) {
      toast.message('Add a sample question first.')
      return
    }
    await onSubmitPreview(draft)
  }

  const accountLabel = isAuthenticated ? `${tier.toUpperCase()} account` : 'Start free'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-4 py-4 md:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] font-mono text-sm font-bold tracking-[0.3em] text-white">
              RG
            </div>
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.22em]">RuleGPT</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Trade finance rules assistant
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="inline-flex min-h-9 items-center rounded-full bg-[#f7d9cb] px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              {accountLabel}
            </span>
            {isAuthenticated ? null : (
              <>
                <Button variant="outline" className="border-black/10 bg-white hover:bg-[#faf7f2]" onClick={onOpenLogin}>
                  Sign in
                </Button>
                <Button className="bg-[#111827] text-white hover:bg-primary" onClick={onOpenSignup}>
                  Create account
                </Button>
              </>
            )}
            <Button variant="ghost" className="font-mono text-xs uppercase tracking-[0.16em]" onClick={onOpenChat}>
              Open chat
            </Button>
            <Button asChild variant="ghost" className="font-mono text-xs uppercase tracking-[0.16em]">
              <Link to="/upgrade">Upgrade</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-10 md:py-10">
        <section className="relative overflow-hidden border border-black/10 bg-white px-5 py-5 md:min-h-[620px] md:px-12 md:py-12">
          <div className="ops-hero-art absolute inset-y-0 right-0 hidden w-[44%] md:block" />

          <div className="relative z-10 max-w-[760px] border border-black/10 bg-white px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.08)] md:px-11 md:py-10">
            <div className="mb-6 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em]">
              <span className="bg-primary px-3 py-1 font-semibold text-primary-foreground">Citation-first answers</span>
              <span className="text-muted-foreground">Trade finance rules, in plain English</span>
            </div>

            <h1 className="max-w-[12ch] font-display text-4xl font-medium leading-[1.05] tracking-[-0.05em] text-[#0c111d] md:text-7xl">
              Ask a trade finance question. Get the rule that matters.
            </h1>

            <div className="mt-6 max-w-[620px] space-y-4 text-[15px] leading-7 text-[#303030] md:text-[17px]">
              <p>
                <span className="font-semibold text-[#0c111d]">RuleGPT</span> turns trade finance rules into short,
                usable answers for exporters, importers, freight forwarders, compliance teams, and operations staff.
              </p>
              <p>
                Every answer is designed to stay grounded in published standards like{' '}
                <span className="font-semibold text-primary">
                  UCP600, ISBP745, sanctions rules, FTAs, customs guidance, and bank requirements
                </span>{' '}
                with clear citations and explicit uncertainty when the rule coverage or transaction facts are incomplete.
              </p>
            </div>

            <div className="mt-8 border-l-[3px] border-primary pl-4">
              <p className="font-display text-lg font-medium tracking-[0.02em] text-[#0c111d] md:text-xl">
                The source is part of the answer<span className="animate-pulse text-primary">_</span>
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                className="h-12 rounded-none bg-[#111827] px-5 font-mono text-xs uppercase tracking-[0.18em] text-white hover:bg-primary"
                onClick={onOpenChat}
              >
                Open chat <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-black/10 bg-white px-5 font-mono text-xs uppercase tracking-[0.18em] text-[#0c111d] hover:bg-[#faf7f2]"
              >
                <Link to="/upgrade">See pricing</Link>
              </Button>
            </div>
          </div>

          <button
            type="button"
            aria-label="Scroll to workbench"
            onClick={scrollToWorkbench}
            className="absolute bottom-6 right-6 hidden h-10 w-10 items-center justify-center border border-black/10 bg-white/90 text-[#111827] transition hover:border-primary hover:text-primary md:flex"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </section>

        <section id="landing-workbench" className="grid gap-10 border-t border-black/10 pt-14 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Why teams trust it</p>
              <h2 className="mt-4 font-display text-3xl font-medium tracking-[-0.04em] text-[#0c111d] md:text-4xl">
                Built for daily rule questions, not generic AI chat
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                RuleGPT leads with the answer, shows the rule behind it, and says clearly when the question still depends
                on transaction facts or missing coverage.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-black/10 px-5 py-4">
                <p className="font-mono text-2xl font-semibold text-[#0c111d]">Citation-led</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Answers are designed to show the exact article, paragraph, or rule reference.
                </p>
              </div>
              <div className="border border-black/10 px-5 py-4">
                <p className="font-mono text-2xl font-semibold text-[#0c111d]">ICE-ready</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Stored query and answer pairs can feed the future Enso compliance model stack.
                </p>
              </div>
            </div>

            <div className="border border-black/10 px-6 py-6">
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Workflow sequence
              </p>
              <div className="space-y-5">
                {workflow.map((item) => (
                  <div key={item.number} className="flex items-start gap-4">
                    <span className="font-mono text-sm font-bold text-black/30">{item.number}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#0c111d]">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-black/15 bg-white p-2 shadow-[0_18px_40px_rgba(17,24,39,0.06)]">
            <div className="space-y-6 border border-black/10 p-5 md:p-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>01 / Coverage domains</span>
                  <span>Coverage snapshot</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {coverageTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center border border-black/10 bg-[#faf7f2] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#243042]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>&gt;_ 01B / Suggested prompts</span>
                  <span>Click to load</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraft(suggestion)}
                      className="border border-black/10 bg-[#fafafa] px-4 py-4 text-left text-sm leading-6 text-[#243042] transition hover:border-primary hover:bg-[#fff7f1]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-black/8" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/35">Try a question</span>
                <div className="h-px flex-1 bg-black/8" />
              </div>

              <div>
                <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  &gt;_ 02 / Rule question draft
                </div>
                <div className="relative border border-black/10 bg-[#fafafa]">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="min-h-[180px] resize-none border-0 bg-transparent px-5 py-5 font-mono text-sm leading-7 text-[#0c111d] focus-visible:ring-0"
                    placeholder="Ask a trade finance rule question..."
                  />
                  <div className="absolute bottom-3 right-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/35">
                    RuleGPT
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="border border-black/10 bg-[#fafafa] px-4 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    03 / What to expect
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#243042]">
                    <li>Answers are designed to be short first, with citations and clear uncertainty.</li>
                    <li>Complex questions expand only when more detail is needed for accuracy.</li>
                    <li>Document validation and transaction approval stay outside this chat.</li>
                  </ul>
                </div>
                <div className="border border-black/10 bg-[#111827] px-4 py-4 text-white">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">Built for</p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-white/85">
                    <p>Exporters and importers</p>
                    <p>Freight forwarders and C&amp;F agents</p>
                    <p>Trade finance and compliance teams</p>
                  </div>
                </div>
              </div>

              <Button
                className="h-14 w-full rounded-none bg-[#111827] font-mono text-sm font-semibold uppercase tracking-[0.18em] text-white hover:bg-primary"
                onClick={() => {
                  void handlePreviewSubmit()
                }}
              >
                Open this in chat <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {capabilityCards.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="border border-black/10 bg-white px-5 py-5 shadow-[0_16px_36px_rgba(17,24,39,0.05)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7d9cb] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-medium tracking-[-0.03em] text-[#0c111d]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </article>
            )
          })}
        </section>

        <section className="mt-16 border border-black/10 bg-white px-5 py-6 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Built by Enso Intelligence
              </p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-medium tracking-[-0.04em] text-[#0c111d]">
                RuleGPT is the public answer layer for trade finance rules and compliance questions.
              </h2>
            </div>
            <Button
              asChild
              className="h-12 rounded-none bg-[#111827] px-5 font-mono text-xs uppercase tracking-[0.18em] text-white hover:bg-primary"
            >
              <Link to="/chat">Start asking</Link>
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="border border-black/10 px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">For</p>
              <p className="mt-2 text-lg font-semibold text-[#0c111d]">Trade operators</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Daily rule questions without searching through scattered manuals and PDFs.
              </p>
            </div>
            <div className="border border-black/10 px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">For</p>
              <p className="mt-2 text-lg font-semibold text-[#0c111d]">Compliance teams</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Faster first answers with a citation trail that can be checked quickly.
              </p>
            </div>
            <div className="border border-black/10 px-4 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">For</p>
              <p className="mt-2 text-lg font-semibold text-[#0c111d]">Trade-finance workflows</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A focused answer layer for rule interpretation, first-pass checks, and faster daily decisions.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 py-6 text-sm text-muted-foreground">
          <p>RuleGPT is designed to make trade finance rules more usable without pretending the rules are simpler than they are.</p>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em]">
            <Sparkles className="h-4 w-4 text-primary" />
            RuleGPT by Enso Intelligence
          </div>
        </div>
      </main>
    </div>
  )
}
