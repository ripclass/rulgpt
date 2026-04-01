import { useState } from 'react'
import type { AuthStatusResponse } from '@/lib/api'
import { AuthDialogShell } from '@/components/auth/AuthDialogShell'

interface SignupModalProps {
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
  onSwitchMode?: () => void
}

export function SignupModal({
  open,
  isLoading,
  oauth,
  authStatus,
  onOpenChange,
  onSubmit,
  onOAuth,
  onSwitchMode,
}: SignupModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthDialogShell
      open={open}
      mode="signup"
      email={email}
      password={password}
      isLoading={isLoading}
      oauth={oauth}
      authStatus={authStatus}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onOpenChange={onOpenChange}
      onSubmit={() => {
        void onSubmit(email, password)
      }}
      onOAuth={(provider) => {
        void onOAuth(provider)
      }}
      onSwitchMode={onSwitchMode}
    />
  )
}
