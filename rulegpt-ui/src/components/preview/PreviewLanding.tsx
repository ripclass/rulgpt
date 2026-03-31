import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { RuxMark } from '@/components/shared/RuxMascot'
import type { SessionTier } from '@/types'

interface PreviewLandingProps {
  suggestions: string[]
  isAuthenticated: boolean
  tier: SessionTier
  userEmail?: string | null
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

const faqs = [
  {
    q: 'Why not just ask ChatGPT?',
    a: 'ChatGPT will give you a confident answer. It may be right. It may be wrong. You can\u2019t tell. tfrules cites the rule so you can verify it yourself.',
  },
  {
    q: 'How current are the rules?',
    a: 'We cover UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data is updated regularly.',
  },
  {
    q: 'What if you don\u2019t have the rule I need?',
    a: 'We tell you clearly. We never make up a rule. If it\u2019s not in our database, we say so and suggest where to look.',
  },
  {
    q: 'Is this for experts only?',
    a: 'No. Built for daily operators \u2014 C&F agents, freight forwarders, importers, exporters, compliance teams. You don\u2019t need to be an ICC specialist.',
  },
  {
    q: 'Does this replace legal advice?',
    a: 'No. tfrules explains published rules and standards. It does not provide legal advice or approve a specific transaction.',
  },
]

const domains = [
  { title: 'ICC Standards', items: 'UCP600, ISBP745, ISP98, URDG758, Incoterms 2020', count: '1,200+' },
  { title: 'FTA Origin Rules', items: 'RCEP, CPTPP, USMCA, AFCFTA', count: '800+' },
  { title: 'Sanctions', items: 'OFAC, EU, UN, UK sanctions lists', count: '600+' },
  { title: 'Customs', items: '48 countries, HS classification', count: '500+' },
  { title: 'Bank Profiles', items: '50 global banks, LC requirements', count: '400+' },
  { title: 'SWIFT / ISO', items: 'Message standards, format rules', count: '500+' },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'Try it. No strings.',
    features: ['20 queries / month', 'Full citations', 'No credit card'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Starter',
    price: '$9',
    period: '/mo',
    desc: 'One discrepancy fee covers a year.',
    features: ['500 queries / month', 'Synced history', 'Saved answers', 'Export to PDF'],
    cta: 'Get started',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    desc: 'For teams and daily workflows.',
    features: ['2,000 queries / month', 'Priority routing', 'API access', 'Bulk export'],
    cta: 'Go Pro',
    featured: false,
  },
]

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

  const [draft] = useState(promptSuggestions[0] ?? fallbackSuggestions[0])

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handlePreviewSubmit = async () => {
    if (!draft.trim()) {
      toast.message('Add a sample question first.')
      return
    }
    await onSubmitPreview(draft)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ━━━ NAV ━━━ */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? 'border-b border-border/50 bg-background/80 backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <RuxMark />
            <span className="font-display text-lg font-bold tracking-tight text-foreground">tfrules</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#comparison" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">How it works</a>
            <a href="#coverage" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Coverage</a>
            <a href="#pricing" className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden text-[13px] text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Try free &rarr;
            </button>
          </div>
        </div>
      </header>

      {/* ━━━ HERO ━━━ */}
      <section className="hero-bg grid-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
        {/* Ambient glow orb */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: '800px',
            height: '600px',
            background: 'radial-gradient(ellipse, hsl(36 90% 44% / 0.07) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Eyebrow */}
          <div
            className="animate-fade-up badge-glow mx-auto mb-8 w-fit"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Citation-first trade finance answers
          </div>

          <h1
            className="animate-fade-up font-display text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05] tracking-tight"
            style={{ animationDelay: '0.08s' }}
          >
            Don&rsquo;t guess.
            <br />
            <span className="bg-gradient-to-r from-primary via-amber-hover to-primary bg-clip-text text-transparent">
              Cite the rule.
            </span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
            style={{ animationDelay: '0.16s' }}
          >
            Ask anything about UCP600, ISBP745, sanctions, FTAs, or customs.
            Get a cited answer in seconds.
          </p>

          <div
            className="animate-fade-up mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            style={{ animationDelay: '0.24s' }}
          >
            <button
              type="button"
              onClick={() => { void handlePreviewSubmit() }}
              className="glow-amber rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-xl hover:shadow-primary/25"
            >
              Ask a question free &rarr;
            </button>
            <a
              href="#comparison"
              className="rounded-lg border border-border/60 px-7 py-3.5 text-sm font-medium text-muted-foreground transition-all hover:border-border hover:text-foreground"
            >
              See the difference
            </a>
          </div>

          <p
            className="animate-fade-up mt-6 text-xs tracking-wide text-muted-foreground/60"
            style={{ animationDelay: '0.32s' }}
          >
            20 FREE QUERIES &middot; NO CREDIT CARD &middot; NO SIGNUP REQUIRED
          </p>
        </div>

        {/* Bottom fade into next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ━━━ PROBLEM ━━━ */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl">
          <p
            className="animate-fade-up text-xs font-medium uppercase tracking-[0.2em] text-primary"
          >
            The problem
          </p>
          <h2 className="animate-fade-up mt-4 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl" style={{ animationDelay: '0.06s' }}>
            The rules exist.
            <br />
            Finding them is the problem.
          </h2>
          <div className="animate-fade-up mt-8 space-y-5 text-[15px] leading-[1.75] text-muted-foreground" style={{ animationDelay: '0.12s' }}>
            <p>
              A C&amp;F agent in Chittagong spends hours checking if an LC is compliant.
              A freight forwarder in Mumbai guesses which Incoterm applies.
              A banker in Dhaka calls a consultant for $200 an hour to answer what should take 30 seconds.
            </p>
            <p>
              The rules are published. ICC has written them down. They just aren&rsquo;t accessible.
            </p>
            <p className="text-foreground font-medium">
              tfrules fixes that.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider mx-auto max-w-5xl" />

      {/* ━━━ SIDE-BY-SIDE COMPARISON ━━━ */}
      <section id="comparison" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">The difference</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Not AI opinion. <span className="text-primary">Cited rules.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {/* ── Generic AI (loser) ── */}
            <div className="card-loser rounded-xl border border-border/40 bg-card/40 p-6 md:p-8">
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Claude / ChatGPT
                </span>
              </div>
              <div className="mt-5 space-y-3 text-[13px] leading-[1.8] text-muted-foreground">
                <p>
                  Under UCP600, transport documents must comply with the specific requirements outlined
                  in articles 19-25. The document must appear on its face to be consistent with the terms
                  of the credit. Banks will examine transport documents to ensure they meet the required
                  standards for the type of transport involved.
                </p>
                <p>
                  It&rsquo;s important to ensure that the transport document covers the shipment as described
                  in the credit terms.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-[11px] text-muted-foreground/50">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/30" />
                No citations. No article numbers. Unverifiable.
              </div>
            </div>

            {/* ── tfrules (winner) ── */}
            <div className="card-winner rounded-xl bg-card p-6 md:p-8">
              <div className="flex items-center gap-2">
                <span className="badge-glow text-[11px]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  tfrules
                </span>
              </div>
              <div className="mt-5 space-y-3 text-[13px] leading-[1.8] text-foreground">
                <p>
                  UCP600 requires a transport document that names the carrier, is signed by the carrier
                  or agent, indicates shipment from the port stated in the credit, and is the sole
                  original if issued in sets.
                </p>
                <p>
                  For multimodal transport, the document must cover at least two different modes and
                  indicate the place of dispatch and final destination stated in the credit.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground/80">What still depends on your transaction:</span> the specific transport mode,
                  whether a charter party B/L is involved, and whether the credit allows transhipment.
                </p>
              </div>
              {/* Citation chips */}
              <div className="mt-5 flex flex-wrap gap-2">
                {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map((cite) => (
                  <span
                    key={cite}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono text-[11px] font-medium text-primary"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                    {cite}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground/70">
            Same question. One answer you can cite. One you can&rsquo;t.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider mx-auto max-w-5xl" />

      {/* ━━━ HOW IT WORKS ━━━ */}
      <section id="how-it-works" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-primary">How it works</p>
          <h2 className="mt-4 text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Three steps. Thirty seconds.
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {[
              { num: '01', title: 'Ask your question', desc: 'In plain language. No jargon needed. Like texting a colleague who knows every ICC publication.' },
              { num: '02', title: 'Rules are retrieved', desc: 'From 4,000+ curated standards \u2014 ICC, FTAs, sanctions, customs, and bank-specific requirements.' },
              { num: '03', title: 'Get a cited answer', desc: 'With exact article numbers. Show it to a bank, a customs officer, or a client.' },
            ].map((step) => (
              <div key={step.num} className="text-center md:text-left">
                <span className="step-number text-5xl">{step.num}</span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider mx-auto max-w-5xl" />

      {/* ━━━ COVERAGE ━━━ */}
      <section id="coverage" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Coverage</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
              4,000+ rules. Six domains.
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {domains.map((d) => (
              <div
                key={d.title}
                className="card-hover rounded-xl border border-border/60 bg-card p-5 md:p-6"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{d.title}</h3>
                  <span className="font-mono text-xs text-primary/60">{d.count}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{d.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider mx-auto max-w-5xl" />

      {/* ━━━ PRICING ━━━ */}
      <section id="pricing" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Pricing</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Start free. Pay when it saves you money.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-6 md:p-7 transition-all ${
                  plan.featured
                    ? 'card-winner bg-card'
                    : 'border-border/60 bg-card card-hover'
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-6 badge-glow text-[10px] uppercase tracking-wider">
                    Most popular
                  </span>
                )}
                <h3 className="text-sm font-semibold text-foreground">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{plan.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={plan.featured ? onOpenSignup : onOpenChat}
                  className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    plan.featured
                      ? 'glow-amber bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20'
                      : 'border border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  {plan.cta} &rarr;
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-divider mx-auto max-w-5xl" />

      {/* ━━━ FAQ ━━━ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-4 text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            Questions
          </h2>

          <div className="mt-12 space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`rounded-xl border transition-colors ${
                  openFaq === i ? 'border-border bg-card' : 'border-border/40 bg-transparent hover:border-border/70'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-[13px] font-medium text-foreground">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="animate-expand px-5 pb-5 text-[13px] leading-[1.8] text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━ */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 60%, hsl(36 90% 44% / 0.06) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ready to cite the rule?
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Free for 20 queries. No credit card. No signup required.
          </p>
          <button
            type="button"
            onClick={onOpenChat}
            className="glow-amber-strong mt-8 rounded-lg bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:shadow-xl hover:shadow-primary/25"
          >
            Ask your first question &rarr;
          </button>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <RuxMark />
            <span className="font-display font-bold text-foreground">tfrules</span>
            <span className="text-xs text-muted-foreground/60">by Enso Intelligence</span>
          </div>
          <nav className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
            <Link to="/pricing" className="transition-colors hover:text-foreground">Pricing</Link>
            <Link to="/faq" className="transition-colors hover:text-foreground">FAQ</Link>
            <Link to="/contact" className="transition-colors hover:text-foreground">Contact</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          </nav>
          <p className="text-[11px] italic text-muted-foreground/40">Built in Bangladesh. For the world.</p>
        </div>
      </footer>
    </div>
  )
}
