import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { api, getApiAccessToken, setApiAccessToken } from '@/lib/api'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import type { AuthUser, SessionTier } from '@/types'
import type { AuthStatusResponse } from '@/lib/api'

const AUTH_KEY = 'rulegpt_auth_user'

function parseSavedAuth(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function persistAuth(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_KEY)
    }
  } catch {
    // Ignore storage failures in tests/private browsing.
  }
}

function clearAuthCallbackHash() {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return
  const params = new URLSearchParams(hash)
  const authKeys = ['access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type', 'type']
  if (!authKeys.some((key) => params.has(key))) return
  const nextUrl = `${window.location.pathname}${window.location.search}`
  window.history.replaceState({}, document.title, nextUrl)
}

function envFlag(name: string): string | undefined {
  const value = import.meta.env[name] as string | undefined
  return value?.toLowerCase()
}

function deriveSessionUser(session: Session, fallbackUser: AuthUser | null, preserveTier: boolean): AuthUser | null {
  const email = session.user.email ?? fallbackUser?.email
  if (!email) return null
  const meta = session.user.user_metadata ?? {}
  const name = meta.full_name ?? meta.name ?? meta.display_name ?? fallbackUser?.name ?? null
  return {
    id: session.user.id,
    email,
    name,
    tier: preserveTier ? fallbackUser?.tier ?? 'free' : 'free',
  }
}

export interface SignupResult {
  status: 'signed_in' | 'confirmation_sent' | 'existing_account'
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(parseSavedAuth())
  const [accessToken, setAccessTokenState] = useState<string | null>(getApiAccessToken())
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null)
  const googleEnabled = supabaseEnabled && envFlag('VITE_SUPABASE_GOOGLE_OAUTH_ENABLED') !== 'false'
  const linkedinEnabled = supabaseEnabled && envFlag('VITE_SUPABASE_LINKEDIN_OAUTH_ENABLED') === 'true'

  const applyAuthStatus = (status: AuthStatusResponse | null) => {
    setAuthStatus(status)
    if (!status?.authenticated) {
      return status
    }
    const normalizedTier = status.tier === 'professional' || status.tier === 'enterprise' || status.tier === 'free' // legacy: was 'starter' || 'pro'
      ? status.tier
      : 'free'
    setUser((current) => {
      if (!current) return current
      const nextUser = {
        ...current,
        tier: normalizedTier,
      }
      persistAuth(nextUser)
      return nextUser
    })
    return status
  }

  useEffect(() => {
    setApiAccessToken(accessToken)
  }, [accessToken])

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return
    let mounted = true

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        const session = data.session
        if (!session?.user) return
        const preserveTier = Boolean(getApiAccessToken())
        const nextUser = deriveSessionUser(session, parseSavedAuth(), preserveTier)
        if (nextUser) {
          setUser(nextUser)
          persistAuth(nextUser)
          setAccessTokenState(session.access_token ?? null)
          setApiAccessToken(session.access_token ?? null)
          clearAuthCallbackHash()
        }
      })
      .catch(() => undefined)

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setAccessTokenState(null)
        persistAuth(null)
        return
      }
      if (!session?.user) return
      const preserveTier = Boolean(getApiAccessToken())
      const nextUser = deriveSessionUser(session, parseSavedAuth(), preserveTier)
      if (!nextUser) return
      setUser(nextUser)
      persistAuth(nextUser)
      setAccessTokenState(session.access_token ?? null)
      setApiAccessToken(session.access_token ?? null)
      clearAuthCallbackHash()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true
    void api
      .getAuthStatus()
      .then((status) => {
        if (mounted) {
          applyAuthStatus(status)
        }
      })
      .catch(() => {
        if (mounted) {
          setAuthStatus(null)
        }
      })
    return () => {
      mounted = false
    }
  }, [accessToken])

  const setTier = (tier: SessionTier) => {
    if (!user) return
    const nextUser = { ...user, tier }
    setUser(nextUser)
    persistAuth(nextUser)
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (supabaseEnabled && supabase) {
        const hadBearerToken = Boolean(getApiAccessToken())
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const nextUser: AuthUser | null = data.user
          ? {
              id: data.user.id,
              email: data.user.email ?? email,
              name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
              tier: hadBearerToken ? user?.tier ?? 'free' : 'free',
            }
          : null
        if (!nextUser) return
        setUser(nextUser)
        persistAuth(nextUser)
        const nextAccessToken = data.session?.access_token ?? null
        setAccessTokenState(nextAccessToken)
        setApiAccessToken(nextAccessToken)
        return
      }
      const nextUser: AuthUser = {
        id: `local_${Date.now()}`,
        email,
        tier: 'free',
      }
      setUser(nextUser)
      persistAuth(nextUser)
      setAccessTokenState(null)
      setApiAccessToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string): Promise<SignupResult> => {
    setIsLoading(true)
    try {
      if (supabaseEnabled && supabase) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const nextAccessToken = data.session?.access_token ?? null
        const identities = Array.isArray((data.user as { identities?: unknown[] } | null)?.identities)
          ? ((data.user as { identities?: unknown[] }).identities ?? [])
          : null
        const looksLikeExistingAccount = !nextAccessToken && Array.isArray(identities) && identities.length === 0

        if (nextAccessToken && data.user?.email) {
          const nextUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
            tier: user?.tier ?? 'free',
          }
          setUser(nextUser)
          persistAuth(nextUser)
          setAccessTokenState(nextAccessToken)
          setApiAccessToken(nextAccessToken)
          clearAuthCallbackHash()
          return { status: 'signed_in' }
        }

        setUser(null)
        persistAuth(null)
        setAccessTokenState(null)
        setApiAccessToken(null)
        return { status: looksLikeExistingAccount ? 'existing_account' : 'confirmation_sent' }
      }
      const nextUser: AuthUser = {
        id: `local_${Date.now()}`,
        email,
        tier: 'free',
      }
      setUser(nextUser)
      persistAuth(nextUser)
      setAccessTokenState(null)
      setApiAccessToken(null)
      return { status: 'signed_in' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    if (supabaseEnabled && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setAccessTokenState(null)
    setApiAccessToken(null)
    persistAuth(null)
  }

  const refreshSession = async () => {
    if (supabaseEnabled && supabase) {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      const session = data.session
      if (session?.user?.email) {
        const nextUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? user?.name ?? null,
          tier: user?.tier ?? 'free',
        }
        setUser(nextUser)
        persistAuth(nextUser)
      }
      const nextAccessToken = session?.access_token ?? null
      setAccessTokenState(nextAccessToken)
      setApiAccessToken(nextAccessToken)
    }
    return api
      .getAuthStatus()
      .then((status) => applyAuthStatus(status))
      .catch(() => {
        setAuthStatus(null)
        return null
      })
  }

  const loginWithOAuth = async (provider: 'google' | 'linkedin_oidc') => {
    if (!supabaseEnabled || !supabase) {
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
        options: { redirectTo: `${window.location.origin}/chat` },
      })
      if (error) throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    user,
    tier: user?.tier ?? 'anonymous',
    currentTier: user?.tier ?? 'anonymous',
    accessToken,
    hasBearerToken: Boolean(accessToken),
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
    authStatus,
    logout,
    refreshSession,
    setTier,
  }
}
