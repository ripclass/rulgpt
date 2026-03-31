import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Check } from 'lucide-react'
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
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/50' : ''}`}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <RuxMark />
            <span className="text-sm font-semibold text-foreground">tfrules</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 md:flex">
              <a href="#how" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <a href="#pricing" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onOpenLogin} className="hidden text-[13px] text-muted-foreground hover:text-foreground transition-colors md:block">Log in</button>
              <button onClick={onOpenChat} className="h-8 rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground hover:bg-amber-hover transition-colors">Get started</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="px-6 pb-20 pt-32 md:pb-28 md:pt-44">
        <div className="mx-auto max-w-3xl">
          <div className="animate-fade-up">
            <p className="text-[13px] font-medium text-primary">Trade finance rules, cited</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl">
              Don&rsquo;t guess.<br />Cite the rule.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Ask about UCP600, ISBP745, sanctions, FTAs, or customs. Get a cited answer you can show to a bank.
            </p>
          </div>
          <div className="animate-fade-up mt-8 flex items-center gap-3" style={{ animationDelay: '0.1s' }}>
            <button onClick={() => { void handleCta() }} className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-amber-hover transition-colors">
              Try free &rarr;
            </button>
            <a href="#how" className="h-10 rounded-lg border border-border px-5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors inline-flex items-center">
              How it works
            </a>
          </div>
          <p className="animate-fade-up mt-4 text-xs text-muted-foreground/60" style={{ animationDelay: '0.15s' }}>
            20 free queries/month &middot; No signup required
          </p>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-xl">
            <p className="text-[13px] font-medium text-primary">The difference</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Not AI opinion. Cited rules.</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Loser */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 md:p-8">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/50">Claude / ChatGPT</p>
              <div className="mt-5 text-[14px] leading-[1.75] text-muted-foreground/70">
                <p>Under UCP600, transport documents must comply with the specific requirements outlined in articles 19-25. The document must appear on its face to be consistent with the terms of the credit.</p>
                <p className="mt-3">Banks will examine transport documents to ensure they meet the required standards for the type of transport involved.</p>
              </div>
              <p className="mt-6 text-[11px] text-muted-foreground/30">No article numbers. No citations. Unverifiable.</p>
            </div>

            {/* Winner */}
            <div className="rounded-xl border border-primary/20 bg-card p-6 md:p-8">
              <p className="text-xs font-medium uppercase tracking-wider text-primary">tfrules</p>
              <div className="mt-5 text-[14px] leading-[1.75] text-foreground/90">
                <p>UCP600 requires a transport document that names the carrier, is signed by the carrier or agent, indicates shipment from the port stated in the credit, and is the sole original if issued in sets.</p>
                <p className="mt-3">For multimodal transport, the document must cover at least two different modes and indicate the place of dispatch and final destination.</p>
                <p className="mt-3 text-muted-foreground text-[13px]">What still depends on your transaction: the specific transport mode, whether a charter party B/L is involved, and whether the credit allows transhipment.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map(c => (
                  <span key={c} className="rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[11px] text-primary">{c}</span>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-[13px] text-muted-foreground/50">Same question. One answer you can cite.</p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-t border-border/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[13px] font-medium text-primary">How it works</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Three steps</h2>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: '1', t: 'Ask your question', d: 'In plain language. Like texting a colleague who knows every ICC publication.' },
              { n: '2', t: 'Rules are retrieved', d: 'From 4,000+ curated ICC standards, FTAs, sanctions lists, and bank profiles.' },
              { n: '3', t: 'Get a cited answer', d: 'With exact article numbers you can show to a bank, customs officer, or client.' },
            ].map(s => (
              <div key={s.n}>
                <span className="text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 text-base font-semibold text-foreground">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="border-t border-border/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-[13px] font-medium text-primary">Coverage</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">4,000+ rules across six domains</h2>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              { t: 'ICC Standards', d: 'UCP600, ISBP745, ISP98, URDG758, Incoterms\u00a02020' },
              { t: 'FTA Origin Rules', d: 'RCEP, CPTPP, USMCA, AFCFTA' },
              { t: 'Sanctions', d: 'OFAC, EU, UN, UK sanctions lists' },
              { t: 'Customs', d: '48 countries, HS classification' },
              { t: 'Bank Profiles', d: '50 global banks, LC requirements' },
              { t: 'SWIFT / ISO', d: 'Message standards, format rules' },
            ].map(d => (
              <div key={d.t} className="rounded-lg border border-border/50 p-4 md:p-5">
                <p className="text-sm font-medium text-foreground">{d.t}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{d.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-t border-border/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-4xl">
          <p className="text-[13px] font-medium text-primary">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Start free. Pay when it saves you money.</h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { name: 'Free', price: '$0', per: '', desc: '20 queries/month', features: ['Citation-backed answers', 'No signup required'], cta: 'Start free', featured: false },
              { name: 'Starter', price: '$9', per: '/mo', desc: '500 queries/month', features: ['Synced history', 'Saved answers', 'Export to PDF'], cta: 'Get started', featured: true },
              { name: 'Pro', price: '$19', per: '/mo', desc: '2,000 queries/month', features: ['Priority routing', 'API access', 'Bulk export'], cta: 'Go Pro', featured: false },
            ].map(p => (
              <div key={p.name} className={`rounded-xl border p-6 ${p.featured ? 'border-primary/30 bg-card' : 'border-border/50 bg-card/50'}`}>
                <p className="text-xs font-medium text-muted-foreground">{p.name}</p>
                <div className="mt-2 flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold text-foreground">{p.price}</span>
                  {p.per && <span className="text-sm text-muted-foreground">{p.per}</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                <ul className="mt-5 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={p.featured ? onOpenSignup : onOpenChat}
                  className={`mt-6 flex h-9 w-full items-center justify-center rounded-lg text-[13px] font-medium transition-colors ${
                    p.featured
                      ? 'bg-primary text-primary-foreground hover:bg-amber-hover'
                      : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }`}
                >
                  {p.cta} &rarr;
                </button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground/50">
            One avoided discrepancy fee covers a year of Starter.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-t border-border/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="text-[13px] font-medium text-primary">FAQ</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Questions</h2>

          <div className="mt-10 divide-y divide-border/50">
            {[
              { q: 'Why not just ask ChatGPT?', a: 'ChatGPT gives confident answers that may be wrong. You can\u2019t tell. tfrules cites the exact rule so you can verify it yourself.' },
              { q: 'How current are the rules?', a: 'UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data updated regularly.' },
              { q: 'What if you don\u2019t have the rule?', a: 'We say so clearly. We never make up a rule. If it\u2019s not in our database, we tell you and suggest where to look.' },
              { q: 'Is this for experts only?', a: 'No. Built for daily operators \u2014 C&F agents, freight forwarders, importers, exporters, compliance teams.' },
              { q: 'Does this replace legal advice?', a: 'No. tfrules explains published rules. It does not provide legal advice or approve specific transactions.' },
            ].map((f, i) => (
              <div key={i}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between py-4 text-left">
                  <span className="text-sm font-medium text-foreground">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="animate-expand pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-border/50 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Ready to cite the rule?</h2>
          <p className="mt-3 text-sm text-muted-foreground">20 free queries. No credit card. No signup.</p>
          <button onClick={onOpenChat} className="mt-6 h-10 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-amber-hover transition-colors">
            Get started &rarr;
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/50 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <RuxMark />
            <span className="text-sm font-semibold">tfrules</span>
            <span className="text-xs text-muted-foreground/50">by Enso Intelligence</span>
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="text-[11px] text-muted-foreground/30">Built in Bangladesh. For the world.</p>
        </div>
      </footer>
    </div>
  )
}
