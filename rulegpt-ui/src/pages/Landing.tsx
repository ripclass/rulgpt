import { useNavigate } from 'react-router-dom'
import { PreviewLanding } from '@/components/preview/PreviewLanding'
import { useAuth } from '@/hooks/useAuth'

export function Landing() {
  const navigate = useNavigate()
  const auth = useAuth()

  return (
    <PreviewLanding
      suggestions={[]}
      isAuthenticated={auth.isAuthenticated}
      tier={auth.tier}
      onOpenLogin={() => navigate('/chat', { state: { authMode: 'login' } })}
      onOpenSignup={() => navigate('/chat', { state: { authMode: 'signup' } })}
      onOpenChat={() => navigate('/chat')}
      onSubmitPreview={async (query) => {
        navigate('/chat', { state: { initialQuery: query } })
      }}
    />
  )
}
