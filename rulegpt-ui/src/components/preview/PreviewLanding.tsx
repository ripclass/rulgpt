import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Menu, X, Globe, Shield, BookOpen, Clock, FileText, Database, Scale, Box, SendHorizonal } from 'lucide-react'
import { RuxMark } from '@/components/shared/RuxMascot'
import { PublicFooter } from '@/components/shared/PublicFooter'
import type { SessionTier } from '@/types'

interface PreviewLandingProps {
  isAuthenticated: boolean
  tier: SessionTier
  userEmail?: string | null
  onOpenLogin: () => void
  onOpenSignup: () => void
  onOpenChat: () => void
  onSubmitQuery: (query: string) => void
  onStartCheckout: (plan: 'professional' | 'enterprise', interval: 'monthly' | 'annual') => void
  isCheckingOut?: boolean
}

function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true)
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.2, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current) // eslint-disable-line
      }
    }
  }, [options])

  return [ref, isIntersecting] as const
}

// Fade in component for scroll
function FadeInView({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [ref, isVisible] = useIntersectionObserver()
  return (
    <div
      ref={ref}
      className={`motion-safe:transition-all motion-safe:duration-1000 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] ${isVisible ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function PreviewLanding({
  isAuthenticated,
  tier,
  userEmail,
  onOpenLogin,
  onOpenSignup,
  onOpenChat,
  onSubmitQuery,
  onStartCheckout,
  isCheckingOut,
}: PreviewLandingProps) {
  const [scrolled, setScrolled] = useState(false)
  const [heroPassed, setHeroPassed] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [heroQuery, setHeroQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)


  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      // Hero is 100vh, comparison section below is ~700px — both dark.
      // Keep nav dark until user reaches the white "How it works" section.
      const darkZoneHeight = window.innerHeight + 600
      setHeroPassed(window.scrollY > darkZoneHeight)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [mobileMenuOpen])

  // Top Nav styling logic:
  // If we haven't scrolled past hero, it's transparent on dark BG (white text).
  // If we scrolled past, it's white glass (dark text).
  const isNavDarkTheme = !heroPassed

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#FF4F00] selection:text-white pb-0">
      
      {/* ──────────────────────────────────────────────────────────
          NAV (Dynamic Theme based on scroll)
          ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-[110] transition-all duration-500 border-b ${
          scrolled && isNavDarkTheme 
            ? 'bg-black/30 backdrop-blur-md border-white/10 shadow-sm'
            : scrolled && !isNavDarkTheme
              ? 'bg-white/80 backdrop-blur-md border-neutral-200/50 shadow-sm' 
              : 'bg-transparent border-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-12">
          {/* Logo */}
          <Link to="/" className={`flex items-center gap-2.5 z-50 transition-colors duration-300 ${isNavDarkTheme ? 'text-white' : 'text-neutral-900'}`}>
            <div className={isNavDarkTheme ? 'text-white' : 'text-black'}><RuxMark /></div>
            <span className="text-xl font-medium tracking-tight">tfrules</span>
          </Link>

          {/* Desktop Nav */}
          <div className={`hidden items-center gap-10 md:flex text-[15px] font-medium transition-colors duration-300 ${isNavDarkTheme ? 'text-neutral-300' : 'text-neutral-600'}`}>
            <a href="#how" className={`transition duration-200 ${isNavDarkTheme ? 'hover:text-white' : 'hover:text-neutral-900'}`}>How it works</a>
            <a href="#pricing" className={`transition duration-200 ${isNavDarkTheme ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Pricing</a>
            
            <div className={`h-4 w-px ${isNavDarkTheme ? 'bg-white/20' : 'bg-neutral-200'}`} />

            {isAuthenticated ? (
              <div className="flex items-center gap-5">
                <span className={`text-xs ${isNavDarkTheme ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {userEmail} <span className="uppercase mx-2 opacity-50">·</span> {tier}
                </span>
                <button onClick={onOpenChat} className="flex h-11 items-center rounded-sm bg-[#FF4F00] px-6 text-[15px] font-semibold text-white transition hover:bg-[#E64600] uppercase tracking-wide">
                  Open Chat <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button onClick={onOpenLogin} className={`transition duration-200 ${isNavDarkTheme ? 'hover:text-white' : 'hover:text-neutral-900'}`}>Sign in</button>
                <button onClick={onOpenChat} className="flex h-11 items-center rounded-sm bg-[#FF4F00] px-6 text-[15px] font-semibold text-white transition hover:bg-[#E64600] uppercase tracking-wide shadow-lg shadow-[#FF4F00]/20">
                  Try tfrules free
                </button>
              </div>
            )}
          </div>

          {/* Mobile Nav Toggle */}
          <button 
            className={`z-[120] p-2 md:hidden focus:outline-none transition-colors duration-300 ${isNavDarkTheme && !mobileMenuOpen ? 'text-white' : 'text-neutral-900'}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <div className={`fixed inset-0 z-[115] h-dvh w-screen bg-white pt-28 px-8 pb-8 md:hidden transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col overflow-y-auto ${mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
          <nav className="flex flex-col gap-10 text-4xl sm:text-5xl font-bold uppercase tracking-widest text-neutral-900 mt-4">
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="border-b border-neutral-100 pb-6 transition hover:text-[#FF4F00]">How it works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="border-b border-neutral-100 pb-6 transition hover:text-[#FF4F00]">Pricing</a>
            <Link to="/faq" onClick={() => setMobileMenuOpen(false)} className="border-b border-neutral-100 pb-6 transition hover:text-[#FF4F00]">FAQ</Link>
            <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="border-b border-neutral-100 pb-6 transition hover:text-[#FF4F00]">Contact</Link>
          </nav>

          <div className="mt-12 flex flex-col gap-4">
            {isAuthenticated ? (
              <button onClick={() => { setMobileMenuOpen(false); onOpenChat(); }} className="w-full rounded-sm bg-[#FF4F00] py-5 text-center text-xl font-semibold text-white tracking-wide uppercase transition active:scale-95">
                Open chat
              </button>
            ) : (
              <>
                <button onClick={() => { setMobileMenuOpen(false); onOpenChat(); }} className="w-full rounded-sm bg-[#FF4F00] py-5 text-center text-xl font-semibold text-white tracking-wide uppercase transition active:scale-95 shadow-lg shadow-[#FF4F00]/20">
                  Try free
                </button>
                <button onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }} className="w-full rounded-sm border-2 border-neutral-200 bg-transparent py-5 text-center text-xl font-semibold text-neutral-900 transition active:scale-95">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          HERO (Cinematic, Immersive, Full Screen)
          ────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-screen md:h-screen md:min-h-[700px] flex items-center bg-[#050B14] overflow-hidden py-24 md:py-0">
        {/* Background Image Setup (Fixed Parallax style) */}
        <div className="absolute inset-0 z-0 opacity-60">
          <img 
            src="/hero-bg.png" 
            alt="Abstract Global Trade" 
            className="w-full h-full object-cover object-center"
          />
          {/* Gradients to blend the image into the edges */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-black/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        <div className="relative z-10 w-full mx-auto max-w-7xl px-6 lg:px-12 pt-20">
          <div className="max-w-4xl mx-auto text-center relative">
            <div className="animate-fade-up blur-0" style={{ animationDuration: '1000ms' }}>
              <h1 className="text-[10vw] sm:text-[8vw] md:text-7xl lg:text-[90px] font-bold tracking-tighter text-white leading-[0.9] uppercase">
                Cited Rules.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-200 to-neutral-500">Not Opinion.</span>
              </h1>
            </div>
            
            <p className="mt-8 max-w-xl text-lg md:text-2xl text-neutral-300 leading-relaxed font-light animate-fade-up mx-auto" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              Trade finance rules have been locked behind paywalls and closed bank manuals for decades. Ask any question — get a cited, verifiable answer. Free.
            </p>

            {/* Hero query input — real chat input, centered */}
            <div className="mt-10 w-full max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (heroQuery.trim()) onSubmitQuery(heroQuery.trim())
                }}
              >
                <div className="relative flex flex-col rounded-2xl bg-white/10 backdrop-blur-sm hover:bg-white/[0.12] focus-within:bg-white/[0.14] focus-within:ring-1 focus-within:ring-white/20 transition-all duration-300">
                  <textarea
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Ask about any trade finance rule..."
                    rows={3}
                    className="w-full min-h-[100px] resize-none border-0 bg-transparent px-5 pt-5 pb-14 text-[15px] font-medium text-white placeholder-neutral-400 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (heroQuery.trim()) onSubmitQuery(heroQuery.trim())
                      }
                    }}
                  />
                  <div className="absolute bottom-3 right-4 flex items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                      {heroQuery.length} / 500
                    </span>
                    <button
                      type="submit"
                      disabled={!heroQuery.trim()}
                      className="flex items-center justify-center p-2 rounded-full bg-[#FF4F00] text-white transition hover:bg-[#E64600] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <SendHorizonal className="h-4 w-4 relative left-[1px]" />
                    </button>
                  </div>
                </div>
              </form>

              {/* Suggested queries */}
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => onSubmitQuery('My LC says "Cotton Woven Shirts" but my invoice says "Cotton Woven Dress Shirts". Is "Dress" a discrepancy under UCP 600?')} className="h-auto whitespace-normal rounded-xl px-4 py-3 sm:py-4 text-left text-sm border border-white/10 text-neutral-300 transition hover:bg-white/5 hover:border-white/20 hover:text-white">
                  Is "Dress Shirts" vs "Shirts" a discrepancy under UCP 600?
                </button>
                <button type="button" onClick={() => onSubmitQuery('I shipped on June 10 but the BL on-board date says June 11. The LC last shipment date is June 10. Is this late shipment?')} className="h-auto whitespace-normal rounded-xl px-4 py-3 sm:py-4 text-left text-sm border border-white/10 text-neutral-300 transition hover:bg-white/5 hover:border-white/20 hover:text-white">
                  BL date is one day after LC shipment deadline. Late shipment?
                </button>
                <button type="button" onClick={() => onSubmitQuery('Does RCEP allow cumulation of Malaysian inputs for Vietnamese exports to Australia?')} className="hidden sm:block h-auto whitespace-normal rounded-xl px-4 py-4 text-left text-sm border border-white/10 text-neutral-300 transition hover:bg-white/5 hover:border-white/20 hover:text-white">
                  Does RCEP allow cumulation of Malaysian inputs for Vietnamese exports?
                </button>
                <button type="button" onClick={() => onSubmitQuery('We received an LC for crude oil from UAE to China at 40% below market. What TBML red flags should we check?')} className="hidden sm:block h-auto whitespace-normal rounded-xl px-4 py-4 text-left text-sm border border-white/10 text-neutral-300 transition hover:bg-white/5 hover:border-white/20 hover:text-white">
                  Crude oil LC at 40% below market — what TBML red flags?
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-pulse-dot opacity-50 hidden md:flex flex-col items-center">
          <div className="w-[1px] h-16 bg-gradient-to-b from-white to-transparent" />
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          COMPARISON (The Pivot) - Dark minimal section seamlessly continuing
          ────────────────────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] pt-24 pb-32 text-white relative z-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInView className="text-center mb-20 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
              A generative AI is confident.<br/><span className="text-neutral-500">Only an engine is correct.</span>
            </h2>
          </FadeInView>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-gradient-to-b from-transparent via-neutral-800 to-transparent hidden md:block"></div>
            
            {/* Generic AI Card */}
            <FadeInView delay={100} className="rounded-xl bg-neutral-900/30 p-10 backdrop-blur border border-white/5 opacity-60">
              <div className="mb-8">
                <span className="text-sm font-mono tracking-widest text-neutral-600 uppercase border border-neutral-700/50 px-3 py-1 rounded">Generic AI</span>
              </div>
              <p className="text-xl leading-relaxed text-neutral-400">
                "Under UCP600, transport documents must comply with specific requirements. 
                Banks examine documents to ensure they meet required standards..."
              </p>
              <div className="mt-12 flex items-center gap-3">
                <div className="h-px bg-red-900/50 flex-grow" />
                <span className="text-sm font-mono text-red-500 tracking-wide">NO ARTICLE // UNVERIFIABLE</span>
              </div>
            </FadeInView>

            {/* TFRules Card */}
            <FadeInView delay={200} className="rounded-xl bg-gradient-to-br from-neutral-900 to-[#0A0A0A] p-10 border border-white/10 shadow-[0_0_50px_rgba(255,79,0,0.03)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#FF4F00] opacity-0 group-hover:opacity-[0.02] transition-opacity duration-1000" />
              
              <div className="mb-8 flex items-center justify-between">
                <span className="text-sm font-mono tracking-widest text-white uppercase border border-white/20 bg-white/5 px-3 py-1 rounded flex items-center gap-2">
                  TFRules Engine
                </span>
                <Check className="h-6 w-6 text-[#FF4F00]" />
              </div>
              <p className="text-xl leading-relaxed text-white font-light">
                "UCP600 requires a transport document naming the carrier, signed by the carrier or agent, 
                indicating shipment from the port in the credit, and the sole original if issued in sets."
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded bg-[#FF4F00]/10 px-3 py-1.5 font-mono text-xs text-[#FF4F00] border border-[#FF4F00]/20 tracking-wider">UCP600 Art. 19</span>
                <span className="inline-flex items-center rounded bg-[#FF4F00]/10 px-3 py-1.5 font-mono text-xs text-[#FF4F00] border border-[#FF4F00]/20 tracking-wider">UCP600 Art. 20</span>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="h-px bg-[#FF4F00]/30 flex-grow" />
                <span className="text-sm font-mono text-[#FF4F00] tracking-wide">EXACT CITATION // DISPUTE READY</span>
              </div>
            </FadeInView>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          HOW IT WORKS (Narrative Scroll Flow)
          ────────────────────────────────────────────────────────── */}
      <section id="how" className="py-32 bg-white relative">
        <div className="mx-auto max-w-6xl px-6 relative">
          
          <FadeInView className="mb-24">
            <h2 className="text-5xl font-semibold tracking-tight text-neutral-900 border-l-4 border-[#FF4F00] pl-6 py-2">How it <br/>works.</h2>
          </FadeInView>

          <div className="space-y-32">
            <FadeInView delay={0} className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-[#FF4F00] font-mono tracking-widest text-lg md:text-xl block mb-4">PHASE 01</span>
                <h3 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6 leading-tight">Ask in plain language.</h3>
                <p className="text-lg text-neutral-500 leading-relaxed font-light">
                  Describe your complex scenario in plain language. You do not need to construct boolean searches or memorize precise jargon. Just ask the question.
                </p>
              </div>
              <div className="bg-neutral-100 rounded-lg aspect-video flex flex-col justify-center p-12 border border-neutral-200">
                <div className="bg-white p-4 font-mono text-sm border-l-2 border-neutral-300 shadow-sm text-neutral-600">
                  <span className="text-[#FF4F00]">]</span> What documents are required for a CIF shipment under UCP600?
                </div>
              </div>
            </FadeInView>
            
            <FadeInView delay={100} className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
              <div className="md:order-2">
                <span className="text-[#FF4F00] font-mono tracking-widest text-lg md:text-xl block mb-4">PHASE 02</span>
                <h3 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6 leading-tight">Deep indexing.</h3>
                <p className="text-lg text-neutral-500 leading-relaxed font-light">
                  Every answer is grounded in curated, versioned rules — not model general knowledge. The engine searches across ICC standards, FTAs, sanctions lists, and regulations from 48+ jurisdictions to find exactly what applies.
                </p>
              </div>
              <div className="bg-neutral-900 rounded-lg aspect-video flex flex-col justify-center p-8 md:order-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
                <div className="flex flex-col gap-3 relative z-10 font-mono text-xs text-neutral-500">
                  <div className="flex gap-4"><span className="text-emerald-500">✔</span> MATCH_FOUND [UCP600] Art. 19</div>
                  <div className="flex gap-4 opacity-50"><span className="text-neutral-600">⚠</span> SCANNING [ISBP745] Block 4</div>
                  <div className="flex gap-4"><span className="text-emerald-500">✔</span> MATCH_FOUND [INCOTERMS_2020] CIF</div>
                </div>
              </div>
            </FadeInView>

            <FadeInView delay={100} className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-[#FF4F00] font-mono tracking-widest text-lg md:text-xl block mb-4">PHASE 03</span>
                <h3 className="text-3xl md:text-4xl font-semibold text-neutral-900 mb-6 leading-tight">Absolute verification.</h3>
                <p className="text-lg text-neutral-500 leading-relaxed font-light">
                  Output is constructed with strict adherence to the retrieved rules. Every factual claim is bound directly to the source text. Show it to banks or clients with absolute confidence.
                </p>
              </div>
              <div className="bg-[#FF4F00]/5 rounded-lg aspect-video flex flex-col justify-center p-12 border border-[#FF4F00]/20">
                <div className="bg-white p-6 shadow-xl border border-neutral-100 flex flex-col gap-4">
                  <div className="h-2 bg-neutral-200 rounded w-3/4" />
                  <div className="h-2 bg-neutral-200 rounded w-full" />
                  <div className="h-2 bg-neutral-200 rounded w-5/6" />
                  <div className="flex gap-2 mt-2">
                    <span className="h-4 w-16 bg-[#FF4F00] rounded-sm" />
                    <span className="h-4 w-20 bg-[#FF4F00] rounded-sm opacity-50" />
                  </div>
                </div>
              </div>
            </FadeInView>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          COVERAGE (Clean Icon List - Monochrome style)
          ────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-neutral-50 border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInView className="flex flex-col md:flex-row gap-16 md:gap-24">
            <div className="md:w-1/3">
              <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 mb-6 leading-tight">Global scope.<br/> Singular graph.</h2>
              <p className="text-lg text-neutral-500 leading-relaxed font-light">
                The fragmented landscape of global trade finance regulations, unified into an instantly searchable format.
              </p>
            </div>
            
            <div className="md:w-2/3 grid sm:grid-cols-2 gap-x-12 gap-y-16">
              {[
                { i: BookOpen, t: 'ICC Standards', d: 'UCP600, ISBP745, ISP98, URDG758, Incoterms 2020' },
                { i: Globe, t: 'FTA Origin', d: 'RCEP, CPTPP, USMCA, AFCFTA' },
                { i: FileText, t: 'Jurisdictional Rules', d: '48 country central bank & customs frameworks' },
                { i: Shield, t: 'Sanctions Data', d: 'OFAC, EU, UN, vessel screening' },
                { i: Database, t: 'Bank Profiles', d: 'Global bank LC execution standards' },
                { i: Clock, t: 'SWIFT / ISO', d: 'Message standards and MT/MX formats' },
                { i: Box, t: 'Commodities', d: 'Compliance for Timber, Pharma, Petro, Agri' },
                { i: Scale, t: 'DOCDEX Findings', d: 'Pre-analyzed official ICC legal opinions' },
              ].map((item, idx) => {
                const Icon = item.i
                return (
                  <div key={idx} className="flex gap-5 group">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-neutral-200 text-neutral-600 transition group-hover:bg-[#FF4F00] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-neutral-900">{item.t}</h4>
                      <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{item.d}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </FadeInView>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          PRICING
          ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-32 bg-white scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6">
          <FadeInView className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900">Simple pricing.</h2>
            <p className="mt-6 text-lg text-neutral-500 font-light max-w-2xl mx-auto">Start free. Upgrade when it saves you money. No hidden fees.</p>

            {/* Billing interval toggle */}
            <div className="mt-10 inline-flex items-center rounded-full border border-neutral-200 p-1">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                  billingInterval === 'monthly'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`rounded-full px-6 py-2 text-sm font-semibold transition ${
                  billingInterval === 'annual'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Annual <span className="text-[10px] opacity-60 ml-1">save 2 months</span>
              </button>
            </div>
          </FadeInView>

          <FadeInView delay={200} className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white p-10 border border-neutral-200 shadow-sm flex flex-col justify-between group hover:border-neutral-300 transition-colors">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#FF4F00]">Free</h3>
                <div className="mt-6 mb-2">
                  <span className="text-5xl font-semibold tracking-tight text-neutral-900">$0</span>
                </div>
                <p className="text-sm text-neutral-500 border-b border-neutral-100 pb-8 uppercase font-mono tracking-wide">5 queries / mo</p>
                <ul className="mt-8 space-y-5 text-[15px] text-neutral-600">
                  <li className="flex gap-4"><Check className="h-5 w-5 text-neutral-300 shrink-0" /> Cited answers from 5,400+ rules</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-neutral-300 shrink-0" /> No account required</li>
                </ul>
              </div>
              <button onClick={onOpenChat} className="mt-12 w-full border border-neutral-200 py-4 font-semibold text-neutral-900 uppercase tracking-wider text-sm transition hover:bg-neutral-50">
                Start free
              </button>
            </div>

            {/* Professional */}
            <div className="bg-neutral-900 p-10 border border-neutral-800 shadow-2xl relative md:-mt-4 md:mb-4 flex flex-col justify-between transform transition-transform hover:-translate-y-2">
              <div>
                <div className="absolute top-0 right-10 -translate-y-1/2 bg-[#FF4F00] text-white px-3 py-1 text-xs font-bold uppercase tracking-widest shadow-lg">Most Popular</div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Professional</h3>
                <div className="mt-6 mb-2">
                  <span className="text-5xl font-semibold tracking-tight text-white">
                    {billingInterval === 'monthly' ? '$79' : '$790'}
                  </span>
                  <span className="text-neutral-500 font-medium">
                    {billingInterval === 'monthly' ? '/mo' : '/yr'}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 border-b border-neutral-800 pb-8 uppercase font-mono tracking-wide">500 queries / mo</p>
                <ul className="mt-8 space-y-5 text-[15px] text-neutral-300">
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Deep analysis on complex queries</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Sanctions &amp; TBML expert-grade answers</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Session history &amp; saved answers</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Priority support</li>
                </ul>
              </div>
              <button
                onClick={() => isAuthenticated ? onStartCheckout('professional', billingInterval) : onOpenLogin()}
                disabled={isCheckingOut}
                className="mt-12 w-full bg-[#FF4F00] py-4 font-bold text-white uppercase tracking-wider text-sm transition hover:bg-[#E64600] shadow-lg shadow-[#FF4F00]/20 disabled:opacity-50"
              >
                {isCheckingOut ? 'Redirecting...' : isAuthenticated ? 'Get Professional' : 'Sign in to upgrade'}
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white p-10 border border-neutral-200 shadow-sm flex flex-col justify-between group hover:border-neutral-300 transition-colors">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400">Enterprise</h3>
                <div className="mt-6 mb-2">
                  <span className="text-5xl font-semibold tracking-tight text-neutral-900">
                    {billingInterval === 'monthly' ? '$199' : '$1,990'}
                  </span>
                  <span className="text-neutral-400 font-medium">
                    {billingInterval === 'monthly' ? '/mo' : '/yr'}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 border-b border-neutral-100 pb-8 uppercase font-mono tracking-wide">2,000 queries / mo</p>
                <ul className="mt-8 space-y-5 text-[15px] text-neutral-600">
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Everything in Professional</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Maximum depth on every query</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Full session export</li>
                  <li className="flex gap-4"><Check className="h-5 w-5 text-[#FF4F00] shrink-0" /> Dedicated account support</li>
                </ul>
              </div>
              <button
                onClick={() => isAuthenticated ? onStartCheckout('enterprise', billingInterval) : onOpenLogin()}
                disabled={isCheckingOut}
                className="mt-12 w-full border border-neutral-200 py-4 font-semibold text-neutral-900 uppercase tracking-wider text-sm transition hover:bg-neutral-50 disabled:opacity-50"
              >
                {isCheckingOut ? 'Redirecting...' : isAuthenticated ? 'Get Enterprise' : 'Sign in to upgrade'}
              </button>
            </div>
          </FadeInView>
          <FadeInView delay={400}>
            <p className="mt-16 text-center text-sm font-medium tracking-wide text-neutral-400 uppercase">One avoided discrepancy fee covers a year of Professional.</p>
          </FadeInView>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          TRDRHUB BRIDGE — The funnel
          ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-neutral-50 border-t border-neutral-200">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeInView>
            <p className="text-sm font-mono tracking-widest text-[#FF4F00] uppercase mb-6">Beyond questions</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 leading-tight">
              Know the rules. Then validate the documents.
            </h2>
            <p className="mt-6 text-lg text-neutral-500 font-light max-w-2xl mx-auto leading-relaxed">
              TFRules answers your compliance questions. When you need to validate
              actual LCs, invoices, and transport documents against those same rules,
              TRDR Hub runs the full check — with discrepancy reports your bank will accept.
            </p>
            <a
              href="https://trdrhub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center justify-center border-2 border-neutral-900 px-8 py-4 text-sm font-bold text-neutral-900 uppercase tracking-widest transition hover:bg-neutral-900 hover:text-white"
            >
              Explore TRDR Hub <ArrowRight className="ml-3 h-4 w-4" />
            </a>
          </FadeInView>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          BOTTOM CTA
          ────────────────────────────────────────────────────────── */}
      <section className="py-32 bg-[#FF4F00] text-center px-6">
        <FadeInView>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">Know the rule before it costs you.</h2>
          <button onClick={onOpenChat} className="inline-flex items-center justify-center bg-white px-10 py-5 text-xl font-bold text-[#FF4F00] uppercase tracking-widest transition hover:bg-neutral-100 hover:scale-105 active:scale-95 shadow-2xl">
            Try it free <ArrowRight className="ml-3 h-5 w-5" />
          </button>
        </FadeInView>
      </section>

      {/* ──────────────────────────────────────────────────────────
          FOOTER
          ────────────────────────────────────────────────────────── */}
      <PublicFooter />
    </div>
  )
}
