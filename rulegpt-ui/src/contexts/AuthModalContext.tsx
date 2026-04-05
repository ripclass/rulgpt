import { createContext, useContext, useState, type ReactNode } from 'react'

type AuthModalMode = 'login' | 'signup' | null

interface AuthModalContextType {
  mode: AuthModalMode
  openLogin: () => void
  openSignup: () => void
  close: () => void
}

const AuthModalContext = createContext<AuthModalContextType>({
  mode: null,
  openLogin: () => {},
  openSignup: () => {},
  close: () => {},
})

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthModalMode>(null)
  return (
    <AuthModalContext.Provider value={{
      mode,
      openLogin: () => setMode('login'),
      openSignup: () => setMode('signup'),
      close: () => setMode(null),
    }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export const useAuthModal = () => useContext(AuthModalContext)
