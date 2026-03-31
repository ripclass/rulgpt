import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RuxMark } from '@/components/shared/RuxMascot'

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
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-foreground">tfrules</span>
            <RuxMark />
          </Link>

          <nav className="hidden items-center gap-5 md:flex">
            <Link to="/pricing" className="text-sm text-muted-foreground transition hover:text-foreground">
              Pricing
            </Link>
            <Link to="/faq" className="text-sm text-muted-foreground transition hover:text-foreground">
              FAQ
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground transition hover:text-foreground">
              Contact
            </Link>
            <Link
              to="/chat"
              state={{ authMode: 'login' }}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/chat"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Try free &rarr;
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">
        <section className="mb-10">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </section>

        <div>{children}</div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <span className="font-display text-lg font-bold text-foreground">tfrules</span>
            <span className="ml-2 text-xs text-muted-foreground">by Enso Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="transition hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs italic text-muted-foreground">Built in Bangladesh. For the world.</p>
        </div>
      </footer>
    </div>
  )
}
