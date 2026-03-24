import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import type { AuthUser, SessionTier } from '@/types'

const AUTH_KEY = 'rulegpt_auth_user'

function parseSavedAuth(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function envFlag(name: string): string | undefined {
  const value = import.meta.env[name] as string | undefined
  return value?.toLowerCase()
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(parseSavedAuth())
  const [isLoading, setIsLoading] = useState(false)
  const googleEnabled = supabaseEnabled && envFlag('VITE_SUPABASE_GOOGLE_OAUTH_ENABLED') !== 'false'
  const linkedinEnabled = supabaseEnabled && envFlag('VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED') !== 'false'

  useEffect(() => {
    if (!supabaseEnabled) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.email) {
        return
      }
      const nextUser: AuthUser = {
        id: session.user.id,
        email: session.user.email,
        tier: user?.tier ?? 'free',
      }
      setUser(nextUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
    })
    return () => data.subscription.unsubscribe()
  }, [user?.tier])

  const setTier = (tier: SessionTier) => {
    if (!user) return
    const nextUser = { ...user, tier }
    setUser(nextUser)
    localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const nextUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
          tier: user?.tier ?? 'free',
        }
        setUser(nextUser)
        localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
        return
      }
      const nextUser: AuthUser = {
        id: `local_${Date.now()}`,
        email,
        tier: 'free',
      }
      setUser(nextUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (supabaseEnabled) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const nextUser: AuthUser = {
          id: data.user?.id ?? `local_${Date.now()}`,
          email,
          tier: 'free',
        }
        setUser(nextUser)
        localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
        return
      }
      const nextUser: AuthUser = {
        id: `local_${Date.now()}`,
        email,
        tier: 'free',
      }
      setUser(nextUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(nextUser))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (supabaseEnabled) {
      await supabase.auth.signOut()
    }
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
  }

  const loginWithOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    if (!supabaseEnabled) {
      throw new Error('Supabase environment is not configured for OAuth.')
    }
    if (provider === 'google' && !googleEnabled) {
      throw new Error('Google OAuth is disabled by environment config.')
    }
    if (provider === 'linkedin_oidc' && !linkedinEnabled) {
      throw new Error('LinkedIn OAuth is disabled by environment config.')
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    tier: user?.tier ?? 'anonymous',
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    signup,
    loginWithOAuth,
    oauth: {
      googleEnabled,
      linkedinEnabled,
      supabaseEnabled,
    },
    logout,
    setTier,
  }
}
