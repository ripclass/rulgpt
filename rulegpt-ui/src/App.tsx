import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Home } from '@/pages/Home'
import { Landing } from '@/pages/Landing'
import { Upgrade } from '@/pages/Upgrade'
import { ApiAccess } from '@/pages/ApiAccess'
import { Pricing } from '@/pages/Pricing'
import { Faq } from '@/pages/Faq'
import { Contact } from '@/pages/Contact'
import { Privacy } from '@/pages/Privacy'
import { Terms } from '@/pages/Terms'
import { track } from '@/lib/analytics'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthModalProvider, useAuthModal } from '@/contexts/AuthModalContext'
import { LoginModal } from '@/components/auth/LoginModal'
import { SignupModal } from '@/components/auth/SignupModal'
import { useAuth } from '@/hooks/useAuth'

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    track('page_view', {
      path: location.pathname,
    })
  }, [location.pathname])

  return null
}

function AppAuthModals() {
  const { mode, close, openLogin, openSignup } = useAuthModal()
  const auth = useAuth()

  return (
    <>
      <LoginModal
        open={mode === 'login'}
        isLoading={auth.isLoading}
        oauth={auth.oauth}
        authStatus={auth.authStatus}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        onSwitchMode={() => {
          openSignup()
        }}
        onSubmit={async (email, password) => {
          try {
            await auth.login(email, password)
            toast.success('Signed in.')
            close()
          } catch (error) {
            toast.error(`Login failed: ${String(error)}`)
          }
        }}
        onOAuth={async (provider) => {
          try {
            await auth.loginWithOAuth(provider)
          } catch (error) {
            toast.error(`OAuth unavailable: ${String(error)}`)
          }
        }}
      />

      <SignupModal
        open={mode === 'signup'}
        isLoading={auth.isLoading}
        oauth={auth.oauth}
        authStatus={auth.authStatus}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        onSwitchMode={() => {
          openLogin()
        }}
        onSubmit={async (email, password) => {
          try {
            const result = await auth.signup(email, password)
            if (result.status === 'signed_in') {
              toast.success('Account created.')
              close()
              return
            }
            if (result.status === 'existing_account') {
              toast.message('That email already looks registered. Sign in instead.')
              openLogin()
              return
            }
            toast.success('Check your email to confirm your account.')
            close()
          } catch (error) {
            toast.error(`Signup failed: ${String(error)}`)
          }
        }}
        onOAuth={async (provider) => {
          try {
            await auth.loginWithOAuth(provider)
          } catch (error) {
            toast.error(`OAuth unavailable: ${String(error)}`)
          }
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tfrules-theme">
      <AuthModalProvider>
        <RouteTracker />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Home />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/api-access" element={<ApiAccess />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AppAuthModals />
      </AuthModalProvider>
    </ThemeProvider>
  )
}
