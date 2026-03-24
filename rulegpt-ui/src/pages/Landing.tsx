import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
      onOpenLogin={() => {
        toast.message('Conversation auth is available in the chat workspace.')
        navigate('/')
      }}
      onOpenSignup={() => {
        toast.message('Account creation is available in the chat workspace.')
        navigate('/')
      }}
      onOpenChat={() => navigate('/')}
      onSubmitPreview={async (query) => {
        navigate('/', { state: { initialQuery: query } })
      }}
    />
  )
}
