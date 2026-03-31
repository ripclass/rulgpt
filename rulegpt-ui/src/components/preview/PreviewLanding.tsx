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

/* ─── FAQ data (inline on landing) ─── */
const faqs = [
  {
    q: 'Why not just ask ChatGPT?',
    a: 'ChatGPT will give you a confident answer. It may be right. It may be wrong. You can\'t tell. tfrules cites the rule so you can verify it yourself.',
  },
  {
    q: 'How current are the rules?',
    a: 'We cover UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data is updated regularly.',
  },
  {
    q: 'What if you don\'t have the rule I need?',
    a: 'We tell you clearly. We never make up a rule. If it\'s not in our database, we say so and suggest where to look.',
  },
]

/* ─── Database coverage ─── */
const domains = [
  { title: 'ICC Standards', items: 'UCP600, ISBP745, ISP98, URDG758, Incoterms 2020' },
  { title: 'FTA Rules of Origin', items: 'RCEP, CPTPP, USMCA, AFCFTA' },
  { title: 'Sanctions', items: 'OFAC, EU, UN, UK sanctions lists' },
  { title: 'Customs', items: '48 countries, HS classification' },
  { title: 'Bank Profiles', items: '50 global banks, LC requirements' },
  { title: 'SWIFT / ISO', items: 'Message standards, format rules' },
]

/* ─── Pricing plans ─── */
const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['20 queries per month', 'Citation-backed answers', 'No credit card required'],
    cta: 'Start free \u2192',
    featured: false,
  },
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    features: ['500 queries per month', 'Synced history', 'Saved answers', 'One avoided discrepancy fee covers a year'],
    cta: 'Get started \u2192',
    featured: true,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['2,000 queries per month', 'Priority routing', 'API access', 'Exports and reports'],
    cta: 'Go Pro \u2192',
    featured: false,
  },
]

export function PreviewLanding({
  suggestions,
  isAuthenticated,
  tier,
  userEmail,
  onOpenLogin,
  onOpenSignup,
  onOpenChat,
  onSubmitPreview,
}: PreviewLandingProps) {
  const promptSuggestions = useMemo(
    () => (suggestions.length > 0 ? suggestions.slice(0, 4) : fallbackSuggestions),
    [suggestions],
  )

  /* keep draft synced for seeded query flow */
  const [draft] = useState(promptSuggestions[0] ?? fallbackSuggestions[0])

  /* sticky nav scroll state */
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* FAQ accordion */
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
      {/* ─── NAV ─── */}
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'border-b border-border bg-card/90 backdrop-blur-lg' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground">tfrules</span>
            <RuxMark />
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden text-sm text-muted-foreground transition hover:text-foreground md:inline"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onOpenChat}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Try free <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-5 py-24 md:py-32">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(36 90% 44% / 0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="animate-fade-up font-display text-5xl font-bold leading-[1.08] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Don&rsquo;t guess.{' '}
            <span className="text-primary">Cite the rule.</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
            style={{ animationDelay: '0.1s' }}
          >
            Ask anything about UCP600, ISBP745, sanctions, FTAs, or customs. Get a cited answer in seconds. Free for 20 queries a month.
          </p>
          <div
            className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: '0.2s' }}
          >
            <button
              type="button"
              onClick={() => { void handlePreviewSubmit() }}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Ask a question free <span aria-hidden="true">&rarr;</span>
            </button>
            <a
              href="#how-it-works"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:border-primary/50"
            >
              See how it works
            </a>
          </div>
          <p
            className="animate-fade-up mt-5 text-sm text-muted-foreground"
            style={{ animationDelay: '0.3s' }}
          >
            20 free queries &middot; No credit card
          </p>
        </div>
      </section>

      {/* ─── PROBLEM ─── */}
      <section className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
          The rules exist. Finding them is the problem.
        </h2>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          <p>
            A C&amp;F agent in Chittagong spends hours checking if an LC is compliant. A freight forwarder in Mumbai guesses which Incoterm applies. A banker in Dhaka calls a consultant for $200 an hour to answer what should take 30 seconds.
          </p>
          <p>The rules are published. ICC has written them down. They just aren&rsquo;t accessible.</p>
          <p className="font-semibold text-foreground">tfrules fixes that.</p>
        </div>
      </section>

      {/* ─── SIDE-BY-SIDE COMPARISON ─── */}
      <section className="mx-auto max-w-5xl px-5 py-16 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Generic AI card */}
          <div className="rounded-lg border border-border/50 bg-card/50 p-6">
            <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Claude / ChatGPT
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Under UCP600, transport documents must comply with the specific requirements outlined in articles 19-25. The document must appear on its face to be consistent with the terms of the credit. Banks will examine transport documents to ensure they meet the required standards for the type of transport involved. It&rsquo;s important to ensure that the transport document covers the shipment as described in the credit terms.
            </p>
          </div>

          {/* tfrules card */}
          <div className="rounded-lg border border-primary/30 bg-card p-6">
            <span className="inline-flex rounded-full border border-primary/30 bg-amber-muted/30 px-3 py-1 text-xs font-medium text-primary">
              tfrules
            </span>
            <p className="mt-4 text-sm leading-relaxed text-foreground">
              UCP600 requires a transport document that names the carrier, is signed by the carrier or agent, indicates shipment from the port stated in the credit, and is the sole original if issued in sets.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              For multimodal transport, the document must cover at least two different modes and indicate the place of dispatch and final destination stated in the credit.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              What still depends on your transaction: the specific transport mode, whether a charter party B/L is involved, and whether the credit allows transhipment.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map((cite) => (
                <span
                  key={cite}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-amber-muted/30 px-3 py-1 font-mono text-xs text-primary"
                >
                  {cite}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Same question. One answer you can cite. One you can&rsquo;t.
        </p>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <h2 className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-foreground md:text-left">
          How it works
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            { num: '1', title: 'Ask your question', desc: 'In plain language. No jargon needed.' },
            { num: '2', title: 'Rules are retrieved', desc: 'From 4,000+ curated ICC standards, FTAs, sanctions lists, and bank profiles.' },
            { num: '3', title: 'Get a cited answer', desc: 'Show it to a bank, a customs officer, or a client.' },
          ].map((step, i) => (
            <div key={step.num} className="relative">
              {i < 2 && (
                <hr className="absolute right-0 top-8 hidden w-full translate-x-1/2 border-t border-border md:block" />
              )}
              <div className="relative">
                <span className="font-display text-4xl font-bold text-primary">{step.num}</span>
                <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DATABASE / COVERAGE ─── */}
      <section className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
          4,000+ rules. Six domains.
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {domains.map((d) => (
            <div key={d.title} className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">{d.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d.items}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="mx-auto max-w-5xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Start free. Pay when it saves you money.
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-6 ${
                plan.featured
                  ? 'border-primary bg-card'
                  : 'border-border bg-card'
              }`}
            >
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-5 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-muted-foreground">&ndash; {f}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={plan.featured ? onOpenSignup : onOpenChat}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  plan.featured
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'border border-border text-foreground hover:border-primary/50'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mx-auto max-w-3xl px-5 py-20 md:px-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">Questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-medium text-foreground">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <span className="font-display text-lg font-bold text-foreground">tfrules</span>
            <span className="ml-2 text-xs text-muted-foreground">by Enso Intelligence</span>
          </div>
          <nav className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            <Link to="/pricing" className="transition hover:text-foreground">Pricing</Link>
            <Link to="/faq" className="transition hover:text-foreground">FAQ</Link>
            <Link to="/contact" className="transition hover:text-foreground">Contact</Link>
            <Link to="/privacy" className="transition hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="transition hover:text-foreground">Terms</Link>
          </nav>
          <p className="text-xs italic text-muted-foreground">Built in Bangladesh. For the world.</p>
        </div>
      </footer>
    </div>
  )
}
