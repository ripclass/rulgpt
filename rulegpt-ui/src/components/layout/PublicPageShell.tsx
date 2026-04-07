import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PublicFooter } from '@/components/shared/PublicFooter'
import { RuxMark } from '@/components/shared/RuxMascot'
import { useAuthModal } from '@/contexts/AuthModalContext'

interface PublicPageShellProps {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}

export function PublicPageShell({ eyebrow, title, description, children }: PublicPageShellProps) {
  const authModal = useAuthModal()

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#050505] text-neutral-900 dark:text-white font-sans transition-colors flex flex-col">
      {/* 
        HERO BLOCK: Unconditionally Dark Industrial Design.
        Provides the massive structural contrast regardless of system theme.
      */}
      <div className="relative w-full bg-[#050B14] overflow-hidden pt-6 pb-48">
        {/* Abstract geometric grid for the deep tech feel */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        {/* Subtle orange ambient glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#FF4F00]/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />

        <header className="relative z-30 mx-auto max-w-7xl px-6 lg:px-12 flex items-center justify-between pb-12">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="text-white">
              <RuxMark className="w-6 h-6 border-none" />
            </div>
            <span className="text-xl font-medium tracking-tight text-white mt-0.5">tfrules</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              to="/pricing"
              className="text-[13px] font-medium transition-colors text-neutral-400 hover:text-white uppercase tracking-widest"
            >
              Pricing
            </Link>
            {['FAQ', 'Contact'].map(label => (
              <Link
                key={label}
                to={`/${label.toLowerCase()}`}
                className="text-[13px] font-medium transition-colors text-neutral-400 hover:text-white uppercase tracking-widest"
              >
                {label}
              </Link>
            ))}
            <button
              onClick={() => authModal.openLogin()}
              className="text-[13px] font-medium transition-colors text-neutral-400 hover:text-white uppercase tracking-widest"
            >
              Sign in
            </button>
            <Link
              to="/chat"
              className="h-10 px-5 flex items-center justify-center rounded-sm bg-[#FF4F00] text-[12px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] shadow-xl shadow-[#FF4F00]/20"
            >
              Console &rarr;
            </Link>
          </nav>
        </header>

        <section className="relative z-20 mx-auto max-w-7xl px-6 lg:px-12 pt-16">
          <div className="max-w-4xl">
            {eyebrow ? (
              <p className="inline-block mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[#FF4F00] border border-[#FF4F00]/20 bg-[#FF4F00]/10 px-4 py-1.5 rounded-sm">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-5xl sm:text-6xl md:text-[80px] lg:text-[100px] font-bold tracking-tighter uppercase text-white leading-[0.9] mix-blend-screen">
              {title}
            </h1>
            {description ? (
              <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-neutral-400 font-light border-l border-[#FF4F00]/50 pl-5">
                {description}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      {/* 
        CONTENT BLOCK: Pulls up into the dark hero to create depth.
      */}
      <main className="relative z-30 mx-auto w-full max-w-4xl px-6 -mt-24 mb-24 flex-grow">
        <div className="bg-white dark:bg-[#0A0A0A] border border-neutral-200 dark:border-white/10 rounded-sm shadow-2xl p-6 md:p-10 min-h-[400px]">
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
