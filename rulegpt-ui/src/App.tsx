import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
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

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    track('page_view', {
      path: location.pathname,
    })
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <>
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
    </>
  )
}
