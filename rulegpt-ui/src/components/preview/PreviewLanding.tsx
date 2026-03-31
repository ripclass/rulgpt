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
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleCta = async () => {
    if (!draft.trim()) { toast.message('Add a question first.'); return }
    await onSubmitPreview(draft)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/90 backdrop-blur-lg' : ''}`}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <RuxMark />
            <span className="font-display text-lg text-foreground">tfrules</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 text-[14px] text-muted-foreground md:flex">
              <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <button onClick={onOpenChat} className="rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background hover:opacity-90 transition-opacity">
              Try tfrules
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
            <div className="animate-fade-up max-w-lg">
              <h1 className="font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.1] text-foreground">
                The <em>citation-first</em><br />trade rules engine.
              </h1>
              <p className="mt-4 text-muted-foreground">For the rest of us.</p>
              <button
                onClick={() => { void handleCta() }}
                className="mt-8 rounded-full bg-foreground px-6 py-2.5 text-[14px] font-medium text-background hover:opacity-90 transition-opacity"
              >
                Ask a question free &rarr;
              </button>
              <p className="mt-3 text-xs text-muted-foreground">
                No signup. No credit card. 20 free queries/month.
              </p>
            </div>
            <div className="animate-fade-up flex-shrink-0" style={{ animationDelay: '0.15s' }}>
              <RuxMascot pose="reading" size={220} className="opacity-90" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Meet tfrules ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl">
            Meet <em>tfrules</em>
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Ask trade finance questions in plain English. Get cited answers in seconds.
          </p>
        </div>

        {/* Product preview card */}
        <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-amber-muted/40 to-background p-1">
          <div className="rounded-xl bg-card p-6 md:p-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RuxMark />
              <span className="font-display">tfrules</span>
            </div>
            <p className="mt-6 font-display text-xl leading-snug md:text-2xl">
              The <em>citation-first</em> trade rules engine<br />for the rest of us.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {['UCP600', 'ISBP745', 'OFAC', 'RCEP'].map(r => (
                <div key={r} className="rounded-lg bg-surface-raised px-3 py-2 text-center">
                  <span className="font-mono text-xs text-muted-foreground">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Side by side ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl">
            Not AI opinion. <em>Cited rules.</em>
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            Same question. One answer you can use in a dispute. One you can&rsquo;t.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {/* Generic AI */}
          <div className="rounded-xl border border-border/60 p-6 opacity-60">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">ChatGPT / Claude</p>
            <p className="mt-4 text-[14px] leading-[1.8] text-muted-foreground">
              Under UCP600, transport documents must comply with specific requirements in articles 19-25.
              The document must appear consistent with the credit terms. Banks examine documents to ensure
              they meet required standards.
            </p>
            <p className="mt-4 text-[11px] text-muted-foreground/50">No citations. Unverifiable.</p>
          </div>

          {/* tfrules */}
          <div className="rounded-xl border-2 border-primary/30 bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">tfrules</p>
            <p className="mt-4 text-[14px] leading-[1.8] text-foreground">
              UCP600 requires a transport document naming the carrier, signed by the carrier or agent,
              indicating shipment from the port in the credit, sole original if issued in sets.
            </p>
            <p className="mt-3 text-[13px] leading-[1.8] text-muted-foreground">
              What still depends on your transaction: transport mode, charter party B/L, transhipment allowance.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map(c => (
                <span key={c} className="rounded-md border border-primary/20 bg-amber-muted px-2 py-0.5 font-mono text-[11px] text-primary">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-display text-2xl md:text-3xl">How it works</h2>
          </div>

          {/* Step 1 — text left, image right */}
          <div className="mt-16 flex flex-col items-center gap-8 md:flex-row md:gap-16">
            <div className="max-w-sm">
              <span className="text-xs font-medium text-primary">01</span>
              <h3 className="mt-2 font-display text-xl">Ask your question</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                In plain language. Like texting a colleague who knows every ICC publication by heart.
              </p>
            </div>
            <div className="flex-shrink-0">
              <RuxMascot pose="searching" size={140} className="opacity-80" />
            </div>
          </div>

          {/* Step 2 — image left, text right */}
          <div className="mt-16 flex flex-col-reverse items-center gap-8 md:flex-row md:gap-16">
            <div className="flex-shrink-0">
              <RuxMascot pose="loading" size={140} className="opacity-80" />
            </div>
            <div className="max-w-sm">
              <span className="text-xs font-medium text-primary">02</span>
              <h3 className="mt-2 font-display text-xl">Rules are retrieved</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                From 4,000+ curated ICC standards, FTAs, sanctions lists, and bank profiles. Not general knowledge. Real rules.
              </p>
            </div>
          </div>

          {/* Step 3 — text left, image right */}
          <div className="mt-16 flex flex-col items-center gap-8 md:flex-row md:gap-16">
            <div className="max-w-sm">
              <span className="text-xs font-medium text-primary">03</span>
              <h3 className="mt-2 font-display text-xl">Get a cited answer</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                With exact article numbers. Show it to a bank, a customs officer, or a client. Cite the rule, not a chatbot.
              </p>
            </div>
            <div className="flex-shrink-0">
              <RuxMascot pose="found" size={140} className="opacity-80" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl">
            4,000+ rules. <em>Six domains.</em>
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
          {[
            { t: 'ICC Standards', d: 'UCP600, ISBP745, ISP98, URDG758, Incoterms 2020' },
            { t: 'FTA Origin Rules', d: 'RCEP, CPTPP, USMCA, AFCFTA' },
            { t: 'Sanctions', d: 'OFAC, EU, UN, UK lists' },
            { t: 'Customs', d: '48 countries, HS classification' },
            { t: 'Bank Profiles', d: '50 global banks, LC requirements' },
            { t: 'SWIFT / ISO', d: 'Message standards, format rules' },
          ].map(d => (
            <div key={d.t} className="rounded-xl border border-border p-4 md:p-5">
              <p className="text-sm font-medium text-foreground">{d.t}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-3xl">
            Start free. <em>Pay when it saves you money.</em>
          </h2>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-3">
          {[
            { name: 'Free', price: '$0', per: '', desc: '20 queries/month', features: ['Citation-backed answers', 'No signup needed'], cta: 'Start free', featured: false },
            { name: 'Starter', price: '$9', per: '/mo', desc: '500 queries/month', features: ['Synced history', 'Saved answers', 'PDF export'], cta: 'Get started', featured: true },
            { name: 'Pro', price: '$19', per: '/mo', desc: '2,000 queries/month', features: ['Priority routing', 'API access', 'Bulk export'], cta: 'Go Pro', featured: false },
          ].map(p => (
            <div key={p.name} className={`rounded-xl border p-5 ${p.featured ? 'border-primary/40 bg-card shadow-sm' : 'border-border'}`}>
              <p className="text-xs font-medium text-muted-foreground">{p.name}</p>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className="text-3xl font-bold text-foreground">{p.price}</span>
                {p.per && <span className="text-sm text-muted-foreground">{p.per}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
              <ul className="mt-4 space-y-2">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={p.featured ? onOpenSignup : onOpenChat}
                className={`mt-5 flex h-9 w-full items-center justify-center rounded-full text-[13px] font-medium transition-opacity ${
                  p.featured
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {p.cta} &rarr;
              </button>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          One avoided discrepancy fee covers a year of Starter.
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-display text-2xl md:text-3xl">Questions</h2>
          <div className="mt-10 divide-y divide-border">
            {[
              { q: 'Why not just ask ChatGPT?', a: 'ChatGPT gives confident answers that may be wrong. You can\u2019t tell. tfrules cites the exact rule so you can verify it yourself.' },
              { q: 'How current are the rules?', a: 'UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets.' },
              { q: 'What if you don\u2019t have the rule?', a: 'We say so clearly. We never make up a rule. If it\u2019s not in our database, we tell you.' },
              { q: 'Is this for experts only?', a: 'No. Built for daily operators \u2014 C&F agents, freight forwarders, importers, exporters, compliance teams.' },
              { q: 'Does this replace legal advice?', a: 'No. tfrules explains published rules. It does not provide legal advice or approve specific transactions.' },
            ].map((f, i) => (
              <div key={i}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between py-4 text-left">
                  <span className="text-[14px] font-medium text-foreground">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="animate-expand pb-4 text-[14px] leading-relaxed text-muted-foreground">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-foreground px-6 py-20 text-background md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <RuxMascot pose="found" size={80} className="mx-auto opacity-80" />
          <h2 className="mt-6 font-display text-2xl md:text-3xl">
            Ready to cite the rule?
          </h2>
          <p className="mt-3 text-sm text-background/60">
            20 free queries. No credit card. No signup.
          </p>
          <button
            onClick={onOpenChat}
            className="mt-6 rounded-full bg-background px-6 py-2.5 text-[14px] font-medium text-foreground hover:opacity-90 transition-opacity"
          >
            Get started &rarr;
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RuxMark />
              <span className="font-display text-lg">tfrules</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Citation-first trade finance answers.</p>
          </div>
          <div className="flex gap-12 text-[13px]">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Product</p>
              <Link to="/pricing" className="block text-foreground hover:text-primary transition-colors">Pricing</Link>
              <Link to="/faq" className="block text-foreground hover:text-primary transition-colors">FAQ</Link>
              <Link to="/contact" className="block text-foreground hover:text-primary transition-colors">Contact</Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Legal</p>
              <Link to="/privacy" className="block text-foreground hover:text-primary transition-colors">Privacy</Link>
              <Link to="/terms" className="block text-foreground hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/50 md:text-right">Built in Bangladesh.<br />For the world.</p>
        </div>
      </footer>
    </div>
  )
}
