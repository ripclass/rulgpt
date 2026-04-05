import { useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { DomainType, Message, QueryResponse, SessionTier } from '@/types'

interface UseQueryOptions {
  sessionToken: string
  tier: SessionTier
  userId?: string
  accessToken?: string | null
}

function userMessage(query: string): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    text: query,
    createdAt: new Date().toISOString(),
  }
}

function inferDomainTags(response: QueryResponse): DomainType[] {
  const tags = new Set<DomainType>()
  for (const citation of response.citations) {
    const token = `${citation.rulebook} ${citation.reference}`.toLowerCase()
    if (token.includes('ucp') || token.includes('isbp') || token.includes('icc') || token.includes('incoterm')) {
      tags.add('icc')
    } else if (token.includes('ofac') || token.includes('sanction') || token.includes('embargo')) {
      tags.add('sanctions')
    } else if (token.includes('rcep') || token.includes('cptpp') || token.includes('usmca') || token.includes('fta')) {
      tags.add('fta')
    } else if (token.includes('custom') || token.includes('hs code') || token.includes('tariff')) {
      tags.add('customs')
    } else if (token.includes('bank') || token.includes('swift')) {
      tags.add('bank_specific')
    }
  }
  if (tags.size === 0 && response.citations.length > 0) {
    tags.add('other')
  }
  return [...tags]
}

function assistantMessage(response: QueryResponse): Message {
  return {
    id: response.query_id,
    queryId: response.query_id,
    role: 'assistant',
    text: response.answer,
    createdAt: new Date().toISOString(),
    confidence: response.confidence_band,
    citations: response.citations,
    showTRDRCTA: response.show_trdr_cta,
    trdrCtaText: response.trdr_cta_text,
    trdrCtaUrl: response.trdr_cta_url,
    disclaimer: response.disclaimer,
    suggestedFollowups: response.suggested_followups,
    domainTags: inferDomainTags(response),
  }
}

export function useQuery({ sessionToken, tier, userId, accessToken }: UseQueryOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tierLimits: Record<string, number> = { anonymous: 20, free: 20, starter: 500, pro: 2000 }
  const [queriesRemaining, setQueriesRemaining] = useState<number>(tierLimits[tier] ?? 20)

  const submitQuery = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return null
    setError(null)
    setIsLoading(true)
    setMessages((prev) => [...prev, userMessage(trimmed)])
    try {
      const response = await api.submitQuery(
      {
        query: trimmed,
        session_token: sessionToken,
        language: 'en',
      },
        { userId, tier, accessToken },
      )
      setMessages((prev) => [...prev, assistantMessage(response)])
      setQueriesRemaining(response.queries_remaining)
      return response
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Request failed. Please try again.')
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setMessages([])
    setError(null)
  }

  return {
    messages,
    isLoading,
    error,
    queriesRemaining,
    submitQuery,
    clearMessages,
    setMessages,
  }
}
