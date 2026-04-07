import { AtSign, Linkedin, LockKeyhole, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'
import { RuxMark } from '@/components/shared/RuxMascot'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader } from '@/components/ui/dialog'
import type { AuthStatusResponse } from '@/lib/api'

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
    title: 'Access Console',
    description: 'Enter your credentials to connect to your session.',
    emailHint: 'Registered email',
    submitIdle: 'Sign In',
    submitBusy: 'Connecting...',
    switchLead: 'No account?',
    switchAction: 'Create one',
  },
  signup: {
    title: 'Initialize Account',
    description: 'Create a profile to sync history and save references.',
    emailHint: 'Work email recommended',
    submitIdle: 'Initialize',
    submitBusy: 'Processing...',
    switchLead: 'Already configured?',
    switchAction: 'Access Console',
  },
} as const

function GoogleIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.48 14.265v-3.279h11.048c.109.571.164 1.247.164 1.979 0 2.46-.671 5.502-2.84 7.669C18.744 22.829 16.05 24 12.483 24 5.869 24 .308 18.613.308 12S5.87 0 12.483 0c3.66 0 6.266 1.436 8.224 3.307L18.392 5.62c-1.403-1.317-3.307-2.341-5.912-2.341-4.83 0-8.607 3.892-8.607 8.721s3.777 8.721 8.606 8.721c3.133 0 4.917-1.258 6.06-2.401.927-.927 1.537-2.251 1.777-4.059l-7.836.004Z" />
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
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || !password || isLoading) return
    if (mode === 'signup' && password !== confirmPassword) {
      alert("Passwords do not match.")
      return
    }
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl border-neutral-200 dark:border-[#333] bg-white dark:bg-[#121212] rounded-sm gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-[600px] md:grid-cols-[1.05fr_0.95fr] relative">
          
          {/* Custom Close Button */}
          <button 
            type="button"
            onClick={() => onOpenChange(false)} 
            className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-sm bg-black/20 text-white hover:bg-black/40 transition md:bg-black/40 md:hover:bg-[#FF4F00]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left Column: Form Content */}
          <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12">
            <div className="mb-10 flex items-center gap-3">
              <RuxMark className="h-6 w-6" />
              <span className="font-bold tracking-tight text-neutral-900 dark:text-white">tfrules</span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{copy.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{copy.description}</p>

            {blockers.length > 0 ? (
              <div className="mt-6 rounded-sm border border-[#FF4F00]/20 bg-[#FF4F00]/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-[#FF4F00]">Auth Blockers</p>
                <ul className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 list-disc list-inside">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 space-y-3">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] text-[13px] font-bold uppercase tracking-wider text-neutral-900 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-white/5 disabled:opacity-50"
                disabled={isLoading || !oauth.googleEnabled}
                onClick={() => onOAuth('google')}
              >
                <GoogleIcon className="h-4 w-4" /> Google SSO
              </button>
              {oauth.linkedinEnabled ? (
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#1A1A1A] text-[13px] font-bold uppercase tracking-wider text-neutral-900 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-white/5 disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => onOAuth('linkedin_oidc')}
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </button>
              ) : null}
            </div>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Local Auth</span>
              <div className="h-px flex-1 bg-neutral-200 dark:bg-white/10" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor={`${mode}-email`} className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-400">
                  {copy.emailHint}
                </label>
                <div className="relative">
                  <Input
                    id={`${mode}-email`}
                    autoComplete="email"
                    className="h-11 rounded-sm border-neutral-300 dark:border-white/10 bg-white dark:bg-[#0A0A0A] pl-10 text-sm focus-visible:ring-1 focus-visible:ring-[#FF4F00] focus-visible:ring-offset-0 disabled:opacity-50 text-neutral-900 dark:text-white"
                    placeholder="email@company.com"
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    disabled={isLoading}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 dark:text-neutral-500">
                    <AtSign className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label htmlFor={`${mode}-password`} className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-400">
                    Security Key
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id={`${mode}-password`}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="h-11 rounded-sm border-neutral-300 dark:border-white/10 bg-white dark:bg-[#0A0A0A] pl-10 text-sm focus-visible:ring-1 focus-visible:ring-[#FF4F00] focus-visible:ring-offset-0 disabled:opacity-50 text-neutral-900 dark:text-white"
                    placeholder="••••••••••••"
                    type="password"
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    disabled={isLoading}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 dark:text-neutral-500">
                    <LockKeyhole className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {mode === 'signup' ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-400">
                      Confirm Security Key
                    </label>
                  </div>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      autoComplete="new-password"
                      className="h-11 rounded-sm border-neutral-300 dark:border-white/10 bg-white dark:bg-[#0A0A0A] pl-10 text-sm focus-visible:ring-1 focus-visible:ring-[#FF4F00] focus-visible:ring-offset-0 disabled:opacity-50 text-neutral-900 dark:text-white"
                      placeholder="••••••••••••"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      disabled={isLoading}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 dark:text-neutral-500">
                      <LockKeyhole className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                className="mt-2 flex h-11 w-full items-center justify-center rounded-sm bg-[#FF4F00] text-[13px] font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 disabled:cursor-not-allowed"
                disabled={isLoading || !email || !password}
              >
                {isLoading ? copy.submitBusy : copy.submitIdle}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-white/10 space-y-4">
              {onSwitchMode ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">{copy.switchLead}</span>
                  <button
                    type="button"
                    className="font-bold text-neutral-900 dark:text-white hover:underline"
                    onClick={onSwitchMode}
                  >
                    {copy.switchAction}
                  </button>
                </div>
              ) : null}
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
                Connection bound by global <Link className="underline hover:text-neutral-900 dark:hover:text-white" to="/terms">Terms</Link> and <Link className="underline hover:text-neutral-900 dark:hover:text-white" to="/privacy">Privacy Control</Link>.
              </p>
            </div>
          </div>

          {/* Right Column: Subtle Image Area */}
          <div className="relative hidden w-full h-full bg-[#050505] md:flex overflow-hidden">
            <img
              src="/auth-bg.png"
              alt="Trade finance documents on desk"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

            <div className="relative z-10 p-12 flex flex-col justify-end w-full h-full">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF4F00] animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Engine Connected</span>
              </div>
              <p className="text-white font-medium max-w-sm text-sm opacity-90 leading-relaxed drop-shadow-md">
                Connect directly into the trade finance consensus. The engine parses UCP600, ISBP745, and FTAs in real-time.
              </p>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
