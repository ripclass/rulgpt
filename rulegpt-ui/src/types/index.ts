export type SessionTier = 'anonymous' | 'free' | 'professional' | 'enterprise'
export type ConfidenceBand = 'high' | 'medium' | 'low'
export type LanguageCode = 'en' | 'bn' | 'hi'
export type MessageRole = 'user' | 'assistant'
export type DomainType = 'icc' | 'sanctions' | 'fta' | 'customs' | 'bank_specific' | 'other'
export type BillingInterval = 'monthly' | 'annual'
export type BillingPlan = 'professional' | 'enterprise'
// "pro" is the $29/mo checkout SKU — a marketing label that always maps to
// the internal "professional" tier. Only valid on checkout requests/responses.
export type CheckoutPlan = BillingPlan | 'pro'

export interface QueryRequest {
  query: string
  session_token: string | null
  language: LanguageCode
}

export interface Citation {
  rule_id: string
  rulebook: string
  reference: string
  excerpt: string
  confidence: ConfidenceBand
}

export interface QueryResponse {
  query_id: string
  answer: string
  citations: Citation[]
  confidence_band: ConfidenceBand
  suggested_followups: string[]
  show_trdr_cta: boolean
  trdr_cta_text: string | null
  trdr_cta_url: string | null
  disclaimer: string
  queries_remaining: number
  tier: SessionTier
}

export interface BillingCheckoutResponse {
  checkout_url?: string | null
  redirect_url?: string | null
  url?: string | null
  message?: string | null
  plan?: CheckoutPlan | null
  tier?: SessionTier
  subscription_status?: string | null
}

export interface BillingCheckoutRequest {
  plan: CheckoutPlan
  interval: BillingInterval
  success_url: string
  cancel_url: string
  customer_email?: string | null
}

export interface BillingSubscriptionResponse {
  status: string
  tier?: SessionTier | string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
}

export interface QuerySuggestion {
  text: string
}

// --- MT700 interpreter (Task 4.6) ---

export interface MT700Field {
  tag: string
  name: string
  content: string
}

export interface MT700Flag {
  tag: string
  name: string
  note: string
}

export interface InterpretResponse {
  fields: MT700Field[]
  flags: MT700Flag[]
  answer: string
  citations: Citation[]
  disclaimer: string
  cta_text: string
  cta_url: string
}

// --- Case note / draft artifacts (Task 4.6) ---

export type DraftType =
  | 'bank_response'
  | 'buyer_email'
  | 'waiver_request'
  | 'amendment_request'
  | 'discrepancy_explanation'

export type ArtifactKind = 'case_note' | 'draft'

export interface ArtifactResponse {
  title: string
  body_markdown: string
  citations: Citation[]
  disclaimer: string
  generated_at: string
  draft_type?: DraftType
}

export interface PaymentRequiredDetail {
  error: 'payment_required'
  kind: ArtifactKind
  price_usd: number | null
  pro_price_usd: number
}

export interface CheckoutOneoffResponse {
  session_id: string
  checkout_url?: string | null
  kind: ArtifactKind
  price_id: string
}

export interface RuleDetails {
  rule_id: string
  rulebook: string | null
  reference: string | null
  title: string | null
  text: string | null
  domain: string | null
  jurisdiction: string | null
  document_type: string | null
  metadata: Record<string, unknown> | null
}

export interface HistoryItem {
  query_id: string
  query_text: string
  answer_text: string
  confidence_band: ConfidenceBand
  created_at: string
}

export interface SessionSummary {
  session_id: string
  first_query: string
  query_count: number
  last_active: string
  queries: HistoryItem[]
}

export interface SavedAnswer {
  id: string
  query_id: string
  user_id: string
  note: string | null
  saved_at: string
}

export interface Message {
  id: string
  role: MessageRole
  text: string
  createdAt: string
  confidence?: ConfidenceBand
  citations?: Citation[]
  domainTags?: DomainType[]
  showTRDRCTA?: boolean
  trdrCtaText?: string | null
  trdrCtaUrl?: string | null
  queryId?: string
  disclaimer?: string
  suggestedFollowups?: string[]
  /** True while an answer is still streaming in token-by-token. */
  isStreaming?: boolean
}

export interface AuthUser {
  id: string
  email: string
  name?: string | null
  tier: SessionTier
}
