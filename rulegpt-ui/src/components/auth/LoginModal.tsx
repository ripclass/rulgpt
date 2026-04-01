import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AuthStatusResponse } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LoginModalProps {
  open: boolean
  isLoading?: boolean
  oauth: {
    supabaseEnabled: boolean
    googleEnabled: boolean
    linkedinEnabled: boolean
  }
  authStatus: AuthStatusResponse | null
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string, password: string) => Promise<void>
  onOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<void>
}

export function LoginModal({
  open,
  isLoading,
  oauth,
  authStatus,
  onOpenChange,
  onSubmit,
  onOAuth,
}: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const blockers = authStatus?.blockers ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to tfrules</DialogTitle>
          <DialogDescription>Use email login or OAuth to sync history, saved answers, and billing.</DialogDescription>
        </DialogHeader>
        {blockers.length > 0 ? (
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Auth blockers</p>
            <ul className="mt-2 space-y-1">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="space-y-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            placeholder="Password"
            value={password}
            type="password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            disabled={isLoading || !oauth.googleEnabled}
            onClick={() => {
              void onOAuth('google')
            }}
          >
            Continue with Google
          </Button>
          {oauth.linkedinEnabled ? (
            <Button
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => {
                void onOAuth('linkedin_oidc')
              }}
            >
              Continue with LinkedIn
            </Button>
          ) : null}
          {!oauth.supabaseEnabled ? (
            <p className="text-xs text-muted-foreground">OAuth unavailable until Supabase env is configured.</p>
          ) : !authStatus?.jwt_verification_ready ? (
            <p className="text-xs text-muted-foreground">
              Sign-in can start now, but protected account actions still depend on backend JWT verification being fully configured.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              void onSubmit(email, password)
            }}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
