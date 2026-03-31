import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { RuxMascot, RuxMark } from '@/components/shared/RuxMascot'
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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const go = async () => {
    if (!draft.trim()) { toast.message('Add a question first.'); return }
    await onSubmitPreview(draft)
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">

      {/* ▸ Nav */}
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/85 backdrop-blur-xl' : ''}`}>
        <div className="mx-auto flex h-16 max-w-[1080px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <RuxMark />
            <span className="font-display text-xl text-foreground">tfrules</span>
          </Link>
          <div className="flex items-center gap-5">
            <div className="hidden gap-5 text-[15px] text-muted-foreground md:flex">
              <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <button onClick={onOpenChat} className="rounded-full bg-foreground px-5 py-2 text-[14px] font-medium text-background transition hover:opacity-90">
              Try tfrules
            </button>
          </div>
        </div>
      </nav>

      {/* ▸ Hero — text left, Rux right */}
      <section className="px-6 pb-24 pt-32 md:pb-36 md:pt-44">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-12 md:flex-row md:items-center md:justify-between">
          <div className="animate-fade-up max-w-xl">
            <h1 className="font-display text-[clamp(2.8rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.02em]">
              The <em>citation&#8209;first</em>
              {'\n'}trade rules engine.
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-muted-foreground">
              For the rest of us.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <button onClick={() => { void go() }} className="rounded-full bg-foreground px-7 py-3 text-[15px] font-medium text-background transition hover:opacity-90">
                Ask a question free
              </button>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground/70">
              No signup &middot; No credit card &middot; 20 free queries/month
            </p>
          </div>
          <div className="animate-fade-up flex-shrink-0" style={{ animationDelay: '0.15s' }}>
            <RuxMascot pose="reading" size={280} className="drop-shadow-sm" />
          </div>
        </div>
      </section>

      {/* ▸ Product card with warm gradient wash */}
      <section className="px-6 py-20 md:py-32">
        <h2 className="mx-auto max-w-[1080px] text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          Meet <em>tfrules</em>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-center text-[15px] text-muted-foreground">
          Ask trade finance questions in plain English.
          Get cited answers you can show to a bank.
        </p>

        <div className="mx-auto mt-14 max-w-3xl gradient-wash overflow-hidden rounded-3xl p-1.5">
          <div className="rounded-[20px] bg-card px-8 py-10 md:px-12 md:py-14">
            <div className="flex items-center gap-3 text-muted-foreground">
              <RuxMark />
              <span className="font-display text-lg">tfrules</span>
            </div>
            <p className="mt-8 font-display text-2xl leading-snug md:text-3xl">
              The <em>citation-first</em> trade rules engine
              <br />for the rest of us.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['UCP600', 'ISBP745', 'Incoterms', 'OFAC', 'RCEP', 'CPTPP'].map(r => (
                <span key={r} className="rounded-full bg-surface-raised px-3.5 py-1.5 font-mono text-[12px] text-muted-foreground">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ▸ Comparison — "Not AI opinion" */}
      <section className="px-6 py-20 md:py-32">
        <h2 className="mx-auto max-w-[1080px] text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          Not AI opinion. <em>Cited rules.</em>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-[15px] text-muted-foreground">
          Same question. One answer you can cite in a dispute. One you can&rsquo;t.
        </p>

        <div className="mx-auto mt-14 grid max-w-[900px] gap-5 md:grid-cols-2">
          {/* ChatGPT card — faded */}
          <div className="rounded-2xl border border-border p-7 opacity-55 md:p-9">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground">ChatGPT / Claude</p>
            <p className="mt-5 text-[15px] leading-[1.85] text-muted-foreground">
              Under UCP600, transport documents must comply with specific requirements in articles 19&#8209;25.
              The document must appear consistent with the credit terms. Banks examine documents to ensure
              they meet required standards for the type of transport involved.
            </p>
            <p className="mt-5 text-[11px] italic text-muted-foreground/40">No article numbers. No citations. Unverifiable.</p>
          </div>

          {/* tfrules card — confident */}
          <div className="rounded-2xl border-2 border-primary/25 bg-card p-7 shadow-sm md:p-9">
            <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-primary">tfrules</p>
            <p className="mt-5 text-[15px] leading-[1.85] text-foreground">
              UCP600 requires a transport document naming the carrier, signed by the carrier or agent,
              indicating shipment from the port in the credit, and the sole original if issued in sets.
            </p>
            <p className="mt-4 text-[14px] leading-[1.85] text-muted-foreground">
              What still depends on your transaction: transport mode, charter party B/L, transhipment allowance.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map(c => (
                <span key={c} className="rounded-full border border-primary/15 bg-amber-muted px-3 py-1 font-mono text-[11px] font-medium text-primary">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ▸ How it works — alternating like happycapy */}
      <section id="how" className="px-6 py-20 md:py-32">
        <h2 className="mx-auto max-w-[1080px] text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          How it <em>works</em>
        </h2>

        {/* Step 1 — text left, Rux right */}
        <div className="mx-auto mt-24 flex max-w-[900px] flex-col items-center gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <h3 className="font-display text-2xl">Ask your question.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              In plain language. No jargon needed.
              Like texting a colleague who knows every ICC publication by heart.
            </p>
          </div>
          <RuxMascot pose="searching" size={180} className="flex-shrink-0 opacity-85" />
        </div>

        {/* Step 2 — Rux left, text right */}
        <div className="mx-auto mt-24 flex max-w-[900px] flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
          <RuxMascot pose="loading" size={180} className="flex-shrink-0 opacity-85" />
          <div className="max-w-sm md:text-right">
            <h3 className="font-display text-2xl">Rules are retrieved.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              From 4,000+ curated ICC standards, FTAs, sanctions lists, and bank profiles.
              Not general knowledge. Real rules.
            </p>
          </div>
        </div>

        {/* Step 3 — text left, Rux right */}
        <div className="mx-auto mt-24 flex max-w-[900px] flex-col items-center gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <h3 className="font-display text-2xl">Get a cited answer.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              With exact article numbers. Show it to a bank, a customs officer, or a client.
              Cite the rule, not a chatbot.
            </p>
          </div>
          <RuxMascot pose="found" size={180} className="flex-shrink-0 opacity-85" />
        </div>
      </section>

      {/* ▸ Coverage */}
      <section className="px-6 py-20 md:py-32">
        <h2 className="mx-auto max-w-[1080px] text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          4,000+ rules. <em>Six domains.</em>
        </h2>
        <div className="mx-auto mt-14 grid max-w-[900px] grid-cols-2 gap-4 md:grid-cols-3">
          {[
            { t: 'ICC Standards', d: 'UCP600, ISBP745, ISP98, URDG758, Incoterms\u00a02020' },
            { t: 'FTA Origin Rules', d: 'RCEP, CPTPP, USMCA, AFCFTA' },
            { t: 'Sanctions', d: 'OFAC, EU, UN, UK sanctions lists' },
            { t: 'Customs', d: '48 countries, HS classification' },
            { t: 'Bank Profiles', d: '50 global banks, LC requirements' },
            { t: 'SWIFT / ISO', d: 'Message standards, format rules' },
          ].map(d => (
            <div key={d.t} className="rounded-2xl border border-border p-5 md:p-6">
              <p className="font-medium text-foreground">{d.t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ▸ Pricing */}
      <section className="px-6 py-20 md:py-32">
        <h2 className="mx-auto max-w-[1080px] text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          Start free. <em>Pay when it saves you money.</em>
        </h2>

        <div className="mx-auto mt-14 grid max-w-[880px] gap-5 md:grid-cols-3">
          {[
            { n: 'Free', p: '$0', per: '', d: '20 queries/month', f: ['Full citations', 'No signup needed'], cta: 'Start free', ft: false },
            { n: 'Starter', p: '$9', per: '/mo', d: '500 queries/month', f: ['Synced history', 'Saved answers', 'PDF export'], cta: 'Get started', ft: true },
            { n: 'Pro', p: '$19', per: '/mo', d: '2,000 queries/month', f: ['Priority routing', 'API access', 'Bulk export'], cta: 'Go Pro', ft: false },
          ].map(plan => (
            <div key={plan.n} className={`rounded-2xl border p-6 md:p-7 ${plan.ft ? 'border-primary/30 bg-card shadow-sm' : 'border-border'}`}>
              <p className="text-[13px] font-medium text-muted-foreground">{plan.n}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-foreground">{plan.p}</span>
                {plan.per && <span className="text-[14px] text-muted-foreground">{plan.per}</span>}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{plan.d}</p>
              <ul className="mt-6 space-y-2.5">
                {plan.f.map(feat => (
                  <li key={feat} className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.ft ? onOpenSignup : onOpenChat}
                className={`mt-7 flex h-10 w-full items-center justify-center rounded-full text-[14px] font-medium transition ${
                  plan.ft ? 'bg-foreground text-background hover:opacity-90' : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {plan.cta} &rarr;
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-muted-foreground/60">
          One avoided discrepancy fee covers a year of Starter.
        </p>
      </section>

      {/* ▸ FAQ */}
      <section className="px-6 py-20 md:py-32">
        <h2 className="mx-auto text-center font-display text-[clamp(1.8rem,4vw,2.8rem)]">
          <em>Questions</em>
        </h2>
        <div className="mx-auto mt-14 max-w-2xl divide-y divide-border">
          {[
            { q: 'Why not just ask ChatGPT?', a: 'ChatGPT gives confident answers that may be wrong. You can\u2019t tell. tfrules cites the exact rule so you can verify it yourself.' },
            { q: 'How current are the rules?', a: 'UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data updated regularly.' },
            { q: 'What if you don\u2019t have the rule?', a: 'We say so clearly. We never make up a rule. If it\u2019s not in our database, we tell you and suggest where to look.' },
            { q: 'Is this for experts only?', a: 'No. Built for daily operators\u00a0\u2014 C&F agents, freight forwarders, importers, exporters, compliance teams.' },
            { q: 'Does this replace legal advice?', a: 'No. tfrules explains published rules. It does not provide legal advice or approve specific transactions.' },
          ].map((f, i) => (
            <div key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left">
                <span className="text-[15px] font-medium text-foreground">{f.q}</span>
                <ChevronDown className={`ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="animate-expand pb-5 text-[15px] leading-[1.8] text-muted-foreground">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ▸ Bottom CTA — inverted dark section */}
      <section className="bg-foreground px-6 py-28 text-background md:py-36">
        <div className="mx-auto max-w-xl text-center">
          <RuxMascot pose="found" size={96} className="mx-auto" />
          <h2 className="mt-8 font-display text-[clamp(1.8rem,4vw,2.8rem)]">
            Ready to cite the rule?
          </h2>
          <p className="mt-4 text-[15px] text-background/50">
            Free for 20 queries. No credit card. No signup.
          </p>
          <button onClick={onOpenChat} className="mt-8 rounded-full bg-background px-7 py-3 text-[15px] font-medium text-foreground transition hover:opacity-90">
            Get started &rarr;
          </button>
        </div>
      </section>

      {/* ▸ Footer */}
      <footer className="px-6 py-12">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <RuxMark />
              <span className="font-display text-xl">tfrules</span>
            </div>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Citation-first trade finance answers.
            </p>
          </div>
          <div className="flex gap-16 text-[14px]">
            <div className="space-y-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">Product</p>
              <Link to="/pricing" className="block text-foreground/80 hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/faq" className="block text-foreground/80 hover:text-foreground transition-colors">FAQ</Link>
              <Link to="/contact" className="block text-foreground/80 hover:text-foreground transition-colors">Contact</Link>
            </div>
            <div className="space-y-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">Legal</p>
              <Link to="/privacy" className="block text-foreground/80 hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="block text-foreground/80 hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground/40 md:text-right">Built in Bangladesh.<br />For the world.</p>
        </div>
      </footer>

    </div>
  )
}
