import { useNavigate } from 'react-router-dom'
import { PreviewLanding } from '@/components/preview/PreviewLanding'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { track } from '@/lib/analytics'

export function Landing() {
  const navigate = useNavigate()
  const auth = useAuth()
  const authModal = useAuthModal()

  return (
    <PreviewLanding
      isAuthenticated={auth.isAuthenticated}
      tier={auth.tier}
      userEmail={auth.user?.email ?? null}
      onOpenLogin={() => {
        track('landing_open_login_clicked')
        authModal.openLogin()
      }}
      onOpenSignup={() => {
        track('landing_open_signup_clicked')
        authModal.openSignup()
      }}
      onOpenChat={() => {
        track('landing_open_chat_clicked')
        navigate('/chat')
      }}
    />
  )
}
