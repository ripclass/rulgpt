import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Check, ArrowRight } from 'lucide-react'
import { RuxMascot, RuxMark } from '@/components/shared/RuxMascot'
import type { SessionTier } from '@/types'

interface PreviewLandingProps {
  isAuthenticated: boolean
  tier: SessionTier
  userEmail?: string | null
  onOpenLogin: () => void
  onOpenSignup: () => void
  onOpenChat: () => void
}

export function PreviewLanding({
  isAuthenticated,
  tier,
  userEmail,
  onOpenLogin,
  onOpenSignup,
  onOpenChat,
}: PreviewLandingProps) {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ═══════════════════════════════════════════════════════════
          NAV — obsidian
          ═══════════════════════════════════════════════════════════ */}
      <nav
        className={`hero-nav fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0A0A0A]/95 backdrop-blur-sm shadow-lg shadow-black/20' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <RuxMark />
            <span className="wordmark wordmark--on-dark text-xl">tfrules</span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden gap-6 text-[15px] md:flex" style={{ color: 'var(--color-text-secondary)' }}>
              <a href="#how" className="transition-colors hover:text-[#FAF7F2]">How it works</a>
              <Link to="/pricing" className="transition-colors hover:text-[#FAF7F2]">Pricing</Link>
            </div>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border px-3 py-1.5 text-[12px] md:block" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <span style={{ color: 'var(--color-parchment)' }}>{userEmail ?? 'Signed in'}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}> · {tier.toUpperCase()}</span>
                </div>
                <button onClick={onOpenChat} className="btn-primary rounded-md px-5 py-2 text-[14px]">
                  Open chat <ArrowRight className="ml-1.5 inline h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <button onClick={onOpenLogin} className="btn-secondary rounded-md px-5 py-2 text-[14px]">
                  Sign in
                </button>
                <button onClick={onOpenChat} className="btn-primary rounded-md px-5 py-2 text-[14px]">
                  Try tfrules <ArrowRight className="ml-1.5 inline h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          HERO — obsidian + grain + amber glow
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-obsidian section-dark hero-glow relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 pb-24 pt-32 md:pb-36 md:pt-44">
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h1 className="hero-headline display-xl">
                Don&rsquo;t guess.<br />
                <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>Cite the rule.</em>
              </h1>
              <p className="hero-sub mt-6 text-lg leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                The citation-first trade finance engine for C&amp;F agents, bank clerks,
                and freight forwarders who need answers they can show to a bank.
              </p>
              <div className="hero-cta mt-10 flex items-center gap-4">
                <button onClick={onOpenChat} className="btn-primary rounded-md px-7 py-3 text-[15px]">
                  {isAuthenticated ? 'Open chat' : 'Ask a question free'}
                </button>
                {isAuthenticated ? (
                  <div className="rounded-md border px-5 py-3 text-[14px]" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    Signed in as <span style={{ color: 'var(--color-parchment)' }}>{userEmail ?? 'your account'}</span> · {tier.toUpperCase()}
                  </div>
                ) : (
                  <button onClick={onOpenLogin} className="btn-secondary rounded-md px-5 py-3 text-[15px]">
                    Sign in
                  </button>
                )}
              </div>
              <p className="mt-5 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                No signup needed &middot; No credit card &middot; 20 free queries/month
              </p>
            </div>
            <div className="hero-illustration flex-shrink-0">
              <RuxMascot pose="reading" size={260} className="drop-shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PROBLEM / COMPARISON — parchment
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-parchment section-padding">
        <div className="section-container">
          <h2 className="display-md text-center" style={{ color: 'var(--color-ink)' }}>
            Not AI opinion. <em style={{ fontStyle: 'italic' }}>Cited rules.</em>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-center text-[15px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            Same question. One answer you can cite in a dispute. One you can&rsquo;t.
          </p>

          <div className="mx-auto mt-14 grid max-w-[900px] gap-5 md:grid-cols-2">
            {/* ChatGPT card — faded */}
            <div className="rounded-xl border p-7 md:p-9" style={{ borderColor: '#E8E4DC', opacity: 0.6 }}>
              <p className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
                ChatGPT / Claude
              </p>
              <p className="mt-5 text-[15px] leading-[1.85]" style={{ color: 'var(--color-text-muted)' }}>
                Under UCP600, transport documents must comply with specific requirements in articles 19&#8209;25.
                The document must appear consistent with the credit terms. Banks examine documents to ensure
                they meet required standards for the type of transport involved.
              </p>
              <p className="mt-5 text-[11px] italic" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                No article numbers. No citations. Unverifiable.
              </p>
            </div>

            {/* tfrules card — confident, amber-bordered */}
            <div className="card-amber rounded-xl p-7 md:p-9" style={{ background: 'var(--color-parchment)', borderColor: 'var(--color-amber)' }}>
              <p className="text-[12px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--color-amber)' }}>
                tfrules
              </p>
              <p className="mt-5 text-[15px] leading-[1.85]" style={{ color: 'var(--color-ink)' }}>
                UCP600 requires a transport document naming the carrier, signed by the carrier or agent,
                indicating shipment from the port in the credit, and the sole original if issued in sets.
              </p>
              <p className="mt-4 text-[14px] leading-[1.85]" style={{ color: 'var(--color-text-muted)' }}>
                What still depends on your transaction: transport mode, charter party B/L, transhipment allowance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['UCP600 Art. 19', 'UCP600 Art. 20', 'UCP600 Art. 19(a)'].map(c => (
                  <span key={c} className="citation-chip">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS — AMBER FULL BLEED (the bold Mailchimp moment)
          ═══════════════════════════════════════════════════════════ */}
      <section id="how" className="section-amber section-padding">
        <div className="section-container">
          <h2 className="display-md text-center" style={{ color: 'var(--color-obsidian)' }}>
            How it <em style={{ fontStyle: 'italic' }}>works</em>
          </h2>

          <div className="mx-auto mt-20 max-w-[900px] space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-10 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold" style={{ background: 'var(--color-obsidian)', color: 'var(--color-amber)' }}>
                  1
                </div>
                <h3 className="heading-lg" style={{ color: 'var(--color-obsidian)' }}>Ask your question.</h3>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--color-amber-muted)' }}>
                  In plain language. No jargon needed.
                  Like texting a colleague who knows every ICC publication by heart.
                </p>
              </div>
              <RuxMascot pose="searching" size={160} className="flex-shrink-0" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-col-reverse items-center gap-10 md:flex-row md:justify-between">
              <RuxMascot pose="loading" size={160} className="flex-shrink-0" />
              <div className="max-w-sm md:text-right">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold" style={{ background: 'var(--color-obsidian)', color: 'var(--color-amber)' }}>
                  2
                </div>
                <h3 className="heading-lg" style={{ color: 'var(--color-obsidian)' }}>Rules are retrieved.</h3>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--color-amber-muted)' }}>
                  From 4,000+ curated ICC standards, FTAs, sanctions lists, and bank profiles.
                  Not general knowledge. Real rules.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-10 md:flex-row md:justify-between">
              <div className="max-w-sm">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold" style={{ background: 'var(--color-obsidian)', color: 'var(--color-amber)' }}>
                  3
                </div>
                <h3 className="heading-lg" style={{ color: 'var(--color-obsidian)' }}>Get a cited answer.</h3>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--color-amber-muted)' }}>
                  With exact article numbers. Show it to a bank, a customs officer, or a client.
                  Cite the rule, not a chatbot.
                </p>
              </div>
              <RuxMascot pose="found" size={160} className="flex-shrink-0" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          COVERAGE — obsidian + grain
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-obsidian section-dark section-padding relative">
        <div className="section-container relative z-10">
          <h2 className="display-md text-center">
            4,000+ rules. <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>Six domains.</em>
          </h2>
          <div className="mx-auto mt-14 grid max-w-[960px] grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { t: 'ICC Standards', d: 'UCP600, ISBP745, ISP98, URDG758, Incoterms\u00a02020', chips: ['UCP600', 'ISBP745'] },
              { t: 'FTA Origin Rules', d: 'RCEP, CPTPP, USMCA, AFCFTA', chips: ['RCEP', 'CPTPP'] },
              { t: 'Sanctions', d: 'OFAC, EU, UN, UK sanctions lists', chips: ['OFAC', 'EU'] },
              { t: 'Customs', d: '48 countries, HS classification', chips: ['HS Code'] },
              { t: 'Bank Profiles', d: '50 global banks, LC requirements', chips: ['LC Req.'] },
              { t: 'SWIFT / ISO', d: 'Message standards, format rules', chips: ['MT700'] },
            ].map(d => (
              <div key={d.t} className="card-dark rounded-xl p-5 md:p-6">
                <p className="font-display text-lg font-semibold" style={{ color: 'var(--color-parchment)' }}>{d.t}</p>
                <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{d.d}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {d.chips.map(c => (
                    <span key={c} className="citation-chip">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PRICING — parchment
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-parchment section-padding">
        <div className="section-container">
          <h2 className="display-md text-center" style={{ color: 'var(--color-ink)' }}>
            Start free. <em style={{ fontStyle: 'italic' }}>Pay when it saves you money.</em>
          </h2>

          <div className="mx-auto mt-14 grid max-w-[900px] gap-5 md:grid-cols-3">
            {[
              { n: 'Free', p: '$0', per: '', d: '20 queries/month', f: ['Full citations', 'No signup needed'], cta: 'Start free', ft: false },
              { n: 'Starter', p: '$9', per: '/mo', d: '500 queries/month', f: ['Synced history', 'Saved answers', 'PDF export'], cta: 'Get started', ft: true },
              { n: 'Pro', p: '$19', per: '/mo', d: '2,000 queries/month', f: ['Priority routing', 'API access', 'Bulk export'], cta: 'Go Pro', ft: false },
            ].map(plan => (
              <div
                key={plan.n}
                className="rounded-xl border p-6 md:p-7"
                style={{
                  borderColor: plan.ft ? 'var(--color-amber)' : '#E8E4DC',
                  background: plan.ft ? '#FFFDF8' : 'transparent',
                }}
              >
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{plan.n}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'var(--color-ink)' }}>{plan.p}</span>
                  {plan.per && <span className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>{plan.per}</span>}
                </div>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>{plan.d}</p>
                <ul className="mt-6 space-y-2.5">
                  {plan.f.map(feat => (
                    <li key={feat} className="flex items-center gap-2.5 text-[14px]" style={{ color: 'var(--color-text-muted)' }}>
                      <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--color-amber)' }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={plan.ft ? onOpenSignup : onOpenChat}
                  className="mt-7 flex h-10 w-full items-center justify-center rounded-md text-[14px] font-medium transition"
                  style={
                    plan.ft
                      ? { background: 'var(--color-amber)', color: 'var(--color-obsidian)' }
                      : { border: '1px solid var(--color-ink)', color: 'var(--color-ink)' }
                  }
                >
                  {plan.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            One avoided discrepancy fee covers a year of Starter.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ — obsidian
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-obsidian section-dark section-padding relative">
        <div className="section-container relative z-10">
          <h2 className="display-md text-center">
            <em style={{ fontStyle: 'italic', color: 'var(--color-amber)' }}>Questions</em>
          </h2>
          <div className="mx-auto mt-14 max-w-2xl divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {[
              { q: 'Why not just ask ChatGPT?', a: 'ChatGPT gives confident answers that may be wrong. You can\u2019t tell. tfrules cites the exact rule so you can verify it yourself.' },
              { q: 'How current are the rules?', a: 'UCP600 (2007), ISBP745 (2013), current OFAC/EU/UN sanctions lists, RCEP, CPTPP, USMCA, and 4,000+ other rulesets. Sanctions data updated regularly.' },
              { q: 'What if you don\u2019t have the rule?', a: 'We say so clearly. We never make up a rule. If it\u2019s not in our database, we tell you and suggest where to look.' },
              { q: 'Is this for experts only?', a: 'No. Built for daily operators\u00a0\u2014 C&F agents, freight forwarders, importers, exporters, compliance teams.' },
              { q: 'Does this replace legal advice?', a: 'No. tfrules explains published rules. It does not provide legal advice or approve specific transactions.' },
            ].map((f, i) => (
              <div key={i} style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between py-5 text-left"
                >
                  <span className="text-[15px] font-medium" style={{ color: 'var(--color-parchment)' }}>{f.q}</span>
                  <ChevronDown
                    className={`ml-4 h-5 w-5 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                </button>
                {openFaq === i && (
                  <div className="animate-expand pb-5 text-[15px] leading-[1.8]" style={{ color: 'var(--color-text-secondary)' }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          BOTTOM CTA — obsidian
          ═══════════════════════════════════════════════════════════ */}
      <section className="section-obsidian relative" style={{ padding: 'var(--space-5xl) 0' }}>
        <div className="section-container relative z-10 text-center">
          <RuxMascot pose="found" size={96} className="mx-auto" />
          <h2 className="heading-xl mt-8">
            Ready to cite the rule?
          </h2>
          <p className="mt-4 text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            Free for 20 queries. No credit card. No signup.
          </p>
          <button onClick={onOpenChat} className="btn-primary mt-8 rounded-md px-7 py-3 text-[15px]">
            Get started <ArrowRight className="ml-1.5 inline h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FOOTER — obsidian
          ═══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-obsidian)' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <RuxMark />
              <span className="wordmark wordmark--on-dark text-xl">tfrules</span>
            </div>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Citation-first trade finance answers.
            </p>
          </div>
          <div className="flex gap-16 text-[14px]">
            <div className="space-y-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>Product</p>
              <Link to="/pricing" className="block transition-colors hover:text-[#D97706]" style={{ color: 'var(--color-text-secondary)' }}>Pricing</Link>
              <Link to="/faq" className="block transition-colors hover:text-[#D97706]" style={{ color: 'var(--color-text-secondary)' }}>FAQ</Link>
              <Link to="/contact" className="block transition-colors hover:text-[#D97706]" style={{ color: 'var(--color-text-secondary)' }}>Contact</Link>
            </div>
            <div className="space-y-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>Legal</p>
              <Link to="/privacy" className="block transition-colors hover:text-[#D97706]" style={{ color: 'var(--color-text-secondary)' }}>Privacy</Link>
              <Link to="/terms" className="block transition-colors hover:text-[#D97706]" style={{ color: 'var(--color-text-secondary)' }}>Terms</Link>
            </div>
          </div>
          <p className="text-[12px] leading-relaxed md:text-right" style={{ color: 'var(--color-text-muted)' }}>
            Built in Bangladesh.<br />For the world.
          </p>
        </div>
      </footer>

    </div>
  )
}
