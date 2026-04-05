import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PreviewLanding } from '@/components/preview/PreviewLanding'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { api, ApiError } from '@/lib/api'
import { track } from '@/lib/analytics'
import type { BillingPlan } from '@/types'

export function Landing() {
  const navigate = useNavigate()
  const auth = useAuth()
  const authModal = useAuthModal()
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const startCheckout = async (plan: BillingPlan) => {
    track('landing_checkout_attempted', { plan, authenticated: auth.isAuthenticated })

    if (!auth.isAuthenticated || !auth.accessToken) {
      authModal.openLogin()
      return
    }

    setIsCheckingOut(true)
    try {
      const origin = window.location.origin
      const response = await api.createBillingCheckout(
        {
          plan,
          interval: 'monthly',
          success_url: `${origin}/chat?checkout=success`,
          cancel_url: `${origin}/#pricing`,
          customer_email: auth.user?.email ?? null,
        },
        {
          userId: auth.user?.id,
          tier: auth.currentTier,
          accessToken: auth.accessToken,
        },
      )
      const nextUrl = response.checkout_url ?? response.redirect_url ?? response.url ?? null
      if (nextUrl) {
        window.location.href = nextUrl
        return
      }
      toast.success(response.message ?? 'Checkout session created.')
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message)
      } else {
        toast.error('Checkout failed. Try again later.')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

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
      onStartCheckout={startCheckout}
      isCheckingOut={isCheckingOut}
    />
  )
}
