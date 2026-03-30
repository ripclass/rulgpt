import { useNavigate } from 'react-router-dom'
import { PreviewLanding } from '@/components/preview/PreviewLanding'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/analytics'

export function Landing() {
  const navigate = useNavigate()
  const auth = useAuth()

  return (
    <PreviewLanding
      suggestions={[]}
      isAuthenticated={auth.isAuthenticated}
      tier={auth.tier}
      userEmail={auth.user?.email ?? null}
      onOpenLogin={() => {
        track('landing_open_login_clicked')
        navigate('/chat', { state: { authMode: 'login' } })
      }}
      onOpenSignup={() => {
        track('landing_open_signup_clicked')
        navigate('/chat', { state: { authMode: 'signup' } })
      }}
      onOpenChat={() => {
        track('landing_open_chat_clicked')
        navigate('/chat')
      }}
      onSubmitPreview={async (query) => {
        track('landing_seeded_question_clicked', { query })
        navigate('/chat', { state: { initialQuery: query } })
      }}
    />
  )
}
