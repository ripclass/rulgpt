import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string, password: string) => Promise<void>
  onOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<void>
}

export function LoginModal({ open, isLoading, oauth, onOpenChange, onSubmit, onOAuth }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to RuleGPT</DialogTitle>
          <DialogDescription>Use email login. Google/LinkedIn are handled by Supabase config.</DialogDescription>
        </DialogHeader>
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
          <Button
            variant="outline"
            className="w-full"
            disabled={isLoading || !oauth.linkedinEnabled}
            onClick={() => {
              void onOAuth('linkedin_oidc')
            }}
          >
            Continue with LinkedIn
          </Button>
          {!oauth.supabaseEnabled ? (
            <p className="text-xs text-muted-foreground">OAuth unavailable until Supabase env is configured.</p>
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
