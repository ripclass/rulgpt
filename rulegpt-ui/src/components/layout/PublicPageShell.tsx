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
    <div className="min-h-screen" style={{ background: 'var(--color-obsidian)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
      <header className="sticky top-0 z-30" style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <RuxMark />
            <span className="wordmark wordmark--on-dark text-xl">tfrules</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {['Pricing', 'FAQ', 'Contact'].map(label => (
              <Link
                key={label}
                to={`/${label.toLowerCase()}`}
                className="text-sm transition-colors hover:text-[#FAF7F2]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {label}
              </Link>
            ))}
            <Link
              to="/chat"
              state={{ authMode: 'login' }}
              className="text-sm transition-colors hover:text-[#FAF7F2]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Sign in
            </Link>
            <Link
              to="/chat"
              className="btn-primary rounded-md px-5 py-2 text-sm"
            >
              Try free &rarr;
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10 md:py-14">
        <section className="mb-10">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{eyebrow}</p>
          ) : null}
          <h1 className="heading-xl mt-2" style={{ color: 'var(--color-parchment)' }}>
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
          ) : null}
        </section>

        <div>{children}</div>
      </main>

      <footer style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="wordmark wordmark--on-dark text-lg">tfrules</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>by Enso Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="transition-colors hover:text-[#D97706]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Built in Bangladesh. For the world.</p>
        </div>
      </footer>
    </div>
  )
}
