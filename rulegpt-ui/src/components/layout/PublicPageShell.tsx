import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface PublicPageShellProps {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}

const footerLinks = [
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export function PublicPageShell({ eyebrow, title, description, children }: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-4 py-4 md:px-10">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] font-mono text-sm font-bold tracking-[0.3em] text-white"
            >
              RG
            </Link>
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.22em]">RuleGPT</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                tfrules.com
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/pricing" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#243042] hover:text-primary">
              Pricing
            </Link>
            <Link to="/faq" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#243042] hover:text-primary">
              FAQ
            </Link>
            <Link to="/contact" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#243042] hover:text-primary">
              Contact
            </Link>
            <Button asChild variant="outline" className="border-black/10 bg-white hover:bg-[#faf7f2]">
              <Link to="/chat" state={{ authMode: 'login' }}>
                Sign in
              </Link>
            </Button>
            <Button asChild className="bg-[#111827] text-white hover:bg-primary">
              <Link to="/chat">Open chat</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-10 md:py-12">
        <section className="border border-black/10 bg-white px-6 py-8 shadow-[0_20px_50px_rgba(17,24,39,0.06)] md:px-10 md:py-10">
          {eyebrow ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#0c111d] md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-[15px]">{description}</p>
          ) : null}
        </section>

        <div className="mt-8">{children}</div>
      </main>

      <footer className="border-t border-black/10 bg-white/70">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              RuleGPT by Enso Intelligence
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Citation-first trade finance answers for daily operators.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#243042] hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
