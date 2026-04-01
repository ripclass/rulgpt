import { AtSign, Bookmark, History, Linkedin, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'
import { RuxMark } from '@/components/shared/RuxMascot'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { AuthStatusResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AuthDialogShellProps {
  open: boolean
  mode: 'login' | 'signup'
  email: string
  password: string
  isLoading?: boolean
  oauth: {
    supabaseEnabled: boolean
    googleEnabled: boolean
    linkedinEnabled: boolean
  }
  authStatus: AuthStatusResponse | null
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: () => void
  onOAuth: (provider: 'google' | 'linkedin_oidc') => void
  onSwitchMode?: () => void
}

const modeCopy = {
  login: {
    eyebrow: 'Secure account access',
    panelTitle: 'Back to the rules.',
    panelBody:
      'Pick up your saved answers, synced history, and account state without losing the thread.',
    title: 'Sign in to tfrules',
    description: 'Use Google or your email and password. Keep the chat simple. Keep the account state sharp.',
    emailHint: 'Use the email address tied to your account.',
    submitIdle: 'Sign in',
    submitBusy: 'Signing in...',
    switchLead: 'New to tfrules?',
    switchAction: 'Create account',
  },
  signup: {
    eyebrow: 'Free account setup',
    panelTitle: 'Create a free account.',
    panelBody:
      'Save the answers you want to keep, sync history across devices, and make future upgrades frictionless.',
    title: 'Start your tfrules account',
    description: 'Create a free account in a minute. You can still stay citation-first and keep the workflow clean.',
    emailHint: 'Use your everyday work email if you plan to keep using the product.',
    submitIdle: 'Create account',
    submitBusy: 'Creating account...',
    switchLead: 'Already have an account?',
    switchAction: 'Sign in',
  },
} as const

const capabilityPoints = [
  {
    icon: History,
    title: 'Synced history',
    body: 'Keep prior questions and answers attached to your account, not a single browser session.',
  },
  {
    icon: Bookmark,
    title: 'Saved answers',
    body: 'Pin high-signal answers and revisit the cited rule without rerunning the same query.',
  },
  {
    icon: ShieldCheck,
    title: 'Cleaner upgrades',
    body: 'Account identity makes billing and future access controls much less brittle.',
  },
]

function GoogleIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.48 14.265v-3.279h11.048c.109.571.164 1.247.164 1.979 0 2.46-.671 5.502-2.84 7.669C18.744 22.829 16.05 24 12.483 24 5.869 24 .308 18.613.308 12S5.87 0 12.483 0c3.66 0 6.266 1.436 8.224 3.307L18.392 5.62c-1.403-1.317-3.307-2.341-5.912-2.341-4.83 0-8.607 3.892-8.607 8.721s3.777 8.721 8.606 8.721c3.133 0 4.917-1.258 6.06-2.401.927-.927 1.537-2.251 1.777-4.059l-7.836.004Z" />
    </svg>
  )
}

function AuthBackdropLines({ className }: { className?: string }) {
  const lines = Array.from({ length: 10 }, (_, index) => {
    const offset = index * 16
    return `M-${220 - offset} ${40 + index * 8}C${40 + offset} ${120 - index * 4}, ${180 + offset} ${250 + index * 10}, ${420 + offset} ${420 + index * 4}`
  })

  return (
    <svg
      aria-hidden="true"
      className={cn('absolute inset-0 h-full w-full text-white/15', className)}
      viewBox="0 0 480 480"
      fill="none"
      preserveAspectRatio="none"
    >
      {lines.map((path, index) => (
        <path
          key={path}
          d={path}
          stroke="currentColor"
          strokeWidth={0.8 + index * 0.15}
          strokeOpacity={0.16 + index * 0.045}
        />
      ))}
    </svg>
  )
}

export function AuthDialogShell({
  open,
  mode,
  email,
  password,
  isLoading,
  oauth,
  authStatus,
  onEmailChange,
  onPasswordChange,
  onOpenChange,
  onSubmit,
  onOAuth,
  onSwitchMode,
}: AuthDialogShellProps) {
  const copy = modeCopy[mode]
  const blockers = authStatus?.blockers ?? []

  const helperText = !oauth.supabaseEnabled
    ? 'Supabase auth is not configured for this environment yet.'
    : !authStatus?.jwt_verification_ready
      ? 'Sign-in can start now, but protected account actions still depend on backend JWT verification.'
      : 'Google is the fastest path. Email and password work too.'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password || isLoading) return
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 40px 100px -40px rgba(0,0,0,0.55)',
        }}
      >
        <div className="grid min-h-[640px] md:grid-cols-[0.95fr_1.05fr]">
          <aside
            className="relative hidden overflow-hidden px-8 py-8 md:flex md:flex-col"
            style={{ background: '#0C111D', borderRight: '1px solid var(--color-border)', color: '#F7F3EC' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,99,46,0.32),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(244,233,216,0.10),transparent_38%)]" />
            <AuthBackdropLines />
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <RuxMark className="scale-110" />
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'white' }}>tfrules</p>
                <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Citation-first trade finance answers</p>
              </div>
            </div>

            <div className="relative z-10 mt-10">
              <p
                className="text-[11px] uppercase tracking-[0.22em]"
                style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)' }}
              >
                {copy.eyebrow}
              </p>
              <h2
                className="mt-4 leading-[1.02] tracking-[-0.03em]"
                style={{ fontFamily: 'var(--font-display)', fontSize: '2.3rem', color: 'white' }}
              >
                {copy.panelTitle}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7" style={{ color: 'rgba(255,255,255,0.72)' }}>{copy.panelBody}</p>
            </div>

            <div className="relative z-10 mt-10 space-y-3">
              {capabilityPoints.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5632E]/18 text-[#F7F3EC]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'white' }}>{title}</p>
                      <p className="mt-1 text-xs leading-5" style={{ color: 'rgba(255,255,255,0.62)' }}>{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-auto rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6" style={{ color: 'rgba(255,255,255,0.72)' }}>
              One clean account is enough. Ask the rule, keep the citations, and come back where you left off.
            </div>
          </aside>

          <div
            className="relative overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-10"
            style={{ background: 'var(--color-surface)' }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(229,99,46,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(12,17,29,0.06),transparent_30%)]"
            />

            <div className="relative z-10 mx-auto max-w-md">
              <div className="md:hidden">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                  >
                    <RuxMark className="scale-110" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-parchment)' }}>tfrules</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Citation-first trade finance answers</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-0">
                <p
                  className="text-[11px] uppercase tracking-[0.22em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', opacity: 0.7 }}
                >
                  {copy.eyebrow}
                </p>
                <DialogTitle
                  className="mt-3 leading-tight tracking-[-0.03em]"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '1.875rem', color: 'var(--color-parchment)' }}
                >
                  {copy.title}
                </DialogTitle>
                <DialogDescription className="mt-3 max-w-md text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
                  {copy.description}
                </DialogDescription>
              </div>

              {blockers.length > 0 ? (
                <div
                  className="mt-6 rounded-2xl px-4 py-4"
                  style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.2)' }}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>Auth blockers</p>
                  <ul className="mt-2 space-y-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {blockers.map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition disabled:opacity-50"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-parchment)',
                  }}
                  disabled={isLoading || !oauth.googleEnabled}
                  onClick={() => onOAuth('google')}
                >
                  <GoogleIcon className="mr-3 h-4 w-4" />
                  Continue with Google
                </button>
                {oauth.linkedinEnabled ? (
                  <button
                    type="button"
                    className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-medium transition disabled:opacity-50"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-parchment)',
                    }}
                    disabled={isLoading}
                    onClick={() => onOAuth('linkedin_oidc')}
                  >
                    <Linkedin className="mr-3 h-4 w-4" />
                    Continue with LinkedIn
                  </button>
                ) : null}
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
                <span
                  className="text-[11px] uppercase tracking-[0.18em]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}
                >
                  or use email
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--color-border)' }} />
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    htmlFor={`${mode}-email`}
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-parchment)' }}
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id={`${mode}-email`}
                      autoComplete="email"
                      className="h-12 rounded-xl pl-11"
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-parchment)',
                      }}
                      placeholder="your.email@example.com"
                      type="email"
                      value={email}
                      onChange={(event) => onEmailChange(event.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4" style={{ color: 'var(--color-text-secondary)' }}>
                      <AtSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{copy.emailHint}</p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={`${mode}-password`}
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-parchment)' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id={`${mode}-password`}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="h-12 rounded-xl pl-11"
                      style={{
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-parchment)',
                      }}
                      placeholder="Enter your password"
                      type="password"
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4" style={{ color: 'var(--color-text-secondary)' }}>
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary h-12 w-full rounded-xl text-sm disabled:opacity-50"
                  disabled={isLoading || !email || !password}
                >
                  {isLoading ? copy.submitBusy : copy.submitIdle}
                </button>
              </form>

              <div className="mt-5 space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{helperText}</p>
                {onSwitchMode ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {copy.switchLead}{' '}
                    <button
                      type="button"
                      className="font-medium underline-offset-4 hover:underline"
                      style={{ color: 'var(--color-parchment)' }}
                      onClick={onSwitchMode}
                    >
                      {copy.switchAction}
                    </button>
                  </p>
                ) : null}
                <p className="text-xs leading-6" style={{ color: 'var(--color-text-secondary)' }}>
                  By continuing, you agree to our{' '}
                  <Link className="underline underline-offset-4" style={{ color: 'var(--color-parchment)' }} to="/terms">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link className="underline underline-offset-4" style={{ color: 'var(--color-parchment)' }} to="/privacy">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
