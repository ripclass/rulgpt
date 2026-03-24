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

interface SignupModalProps {
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

export function SignupModal({ open, isLoading, oauth, onOpenChange, onSubmit, onOAuth }: SignupModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>Free account unlocks unlimited queries and saved answers.</DialogDescription>
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
            Sign up with Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={isLoading || !oauth.linkedinEnabled}
            onClick={() => {
              void onOAuth('linkedin_oidc')
            }}
          >
            Sign up with LinkedIn
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
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
