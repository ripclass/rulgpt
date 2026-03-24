import { useEffect, useState } from 'react'

const SESSION_TOKEN_KEY = 'rulegpt_session_token'

function generateSessionToken() {
  const random = Math.random().toString(36).slice(2)
  return `rgpt_${Date.now()}_${random}`
}

export function useSession() {
  const [sessionToken, setSessionToken] = useState<string>(() => {
    const existing = localStorage.getItem(SESSION_TOKEN_KEY)
    return existing ?? generateSessionToken()
  })

  useEffect(() => {
    localStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
  }, [sessionToken])

  function resetSession() {
    const fresh = generateSessionToken()
    setSessionToken(fresh)
    localStorage.setItem(SESSION_TOKEN_KEY, fresh)
  }

  return { sessionToken, resetSession }
}
