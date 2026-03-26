import { Navigate, Route, Routes } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Landing } from '@/pages/Landing'
import { Upgrade } from '@/pages/Upgrade'
import { ApiAccess } from '@/pages/ApiAccess'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<Home />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route path="/upgrade" element={<Upgrade />} />
      <Route path="/api-access" element={<ApiAccess />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
