import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { ApiError, api } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/contexts/AuthModalContext'
import { PublicPageShell } from '@/components/layout/PublicPageShell'
import type { BillingInterval, BillingPlan } from '@/types'

const PLAN_COPY: Record<
  BillingPlan,
  {
    title: string
    monthlyLabel: string
    annualLabel: string
    blurb: string
    features: string[]
  }
> = {
  professional: {
    title: 'Professional',
    monthlyLabel: '$79 / month',
    annualLabel: '$790 / year',
    blurb: 'For trade finance professionals who need cited answers, full model access, and saved work.',
    features: [
      '500 queries / month',
      'Haiku + Sonnet + Opus models',
      'Sanctions queries routed to Opus',
      'Session history & saved answers',
      'Priority support',
    ],
  },
  enterprise: {
    title: 'Enterprise',
    monthlyLabel: '$199 / month',
    annualLabel: '$1,990 / year',
    blurb: 'For banks and trading houses that need higher volume and expanded Opus access.',
    features: [
      '2,000 queries / month',
      'Everything in Professional',
      'Lower Opus routing threshold',
      'Full session export',
      'Dedicated account support',
    ],
  },
}

export function Upgrade() {
  const auth = useAuth()
  const authModal = useAuthModal()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(
    auth.currentTier === 'professional' ? 'enterprise' : 'professional',
  )
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')

  const hasBearerToken = Boolean(auth.accessToken)
  const billingStatus = useQuery({
    queryKey: ['billing-status'],
    queryFn: api.getBillingStatus,
    staleTime: 5 * 60 * 1000,
  })
  const canCheckout = auth.isAuthenticated && hasBearerToken && (billingStatus.data?.checkout_ready ?? false)
  const checkoutPaths = useMemo(() => {
    const origin = window.location.origin
    return {
      success_url: `${origin}/upgrade?checkout=success`,
      cancel_url: `${origin}/upgrade?checkout=cancel`,
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const checkoutState = params.get('checkout')
    if (!checkoutState) return

    if (checkoutState === 'success') {
      void auth
        .refreshSession()
        .then((status) => {
          const tier = status?.tier
          if (tier === 'professional' || tier === 'enterprise') {
            setCheckoutMessage(`Checkout completed. Your account is now ${tier}.`)
          } else {
            setCheckoutMessage('Checkout completed. Sign out and back in if your tier still looks stale.')
          }
        })
        .catch(() => {
          setCheckoutMessage('Checkout completed. Sign out and back in if your tier still looks stale.')
        })
        .finally(() => {
          navigate(location.pathname, { replace: true })
        })
      return
    }

    if (checkoutState === 'cancel') {
      setCheckoutMessage('Checkout was cancelled.')
      navigate(location.pathname, { replace: true })
    }
  }, [auth, location.pathname, location.search, navigate])

  const startCheckout = async () => {
    track('upgrade_checkout_attempted', {
      plan: selectedPlan,
      interval: billingInterval,
      authenticated: auth.isAuthenticated,
      checkout_ready: billingStatus.data?.checkout_ready ?? false,
    })

    if (!auth.isAuthenticated || !hasBearerToken) {
      setCheckoutMessage('Sign in to use the hosted checkout flow.')
      return
    }
    if (!billingStatus.data?.checkout_ready) {
      setCheckoutMessage('Stripe checkout is not configured yet.')
      return
    }

    setIsCheckingOut(true)
    setCheckoutMessage(null)
    try {
      const response = await api.createBillingCheckout(
        {
          plan: selectedPlan,
          interval: billingInterval,
          success_url: checkoutPaths.success_url,
          cancel_url: checkoutPaths.cancel_url,
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
      const tier = response.tier
      if (tier === 'professional' || tier === 'enterprise') {
        auth.setTier(tier)
      }
      setCheckoutMessage(response.message ?? 'Checkout session created.')
    } catch (error) {
      if (error instanceof ApiError) {
        setCheckoutMessage(error.message)
      } else {
        setCheckoutMessage('Checkout failed. Try again later.')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  const selectedPlanCopy = PLAN_COPY[selectedPlan]

  return (
    <PublicPageShell
      eyebrow="Upgrade"
      title="Choose your plan."
      description="One avoided discrepancy fee covers a year of Professional. Simple, transparent pricing."
    >
      {checkoutMessage ? (
        <div className="mb-8 rounded-sm border border-[#B2F273]/20 bg-[#00261C]/5 px-5 py-4">
          <p className="text-sm font-medium text-[#B2F273]">{checkoutMessage}</p>
        </div>
      ) : null}

      {billingStatus.data?.blockers?.length ? (
        <div className="mb-8 rounded-sm border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#121212] p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Configuration blockers</p>
          <ul className="mt-3 space-y-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
            {billingStatus.data.blockers.map((blocker: string) => (
              <li key={blocker}>&ndash; {blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Plan Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        {(['professional', 'enterprise'] as const).map((plan) => {
          const planCopy = PLAN_COPY[plan]
          const selected = selectedPlan === plan
          return (
            <button
              key={plan}
              type="button"
              className={`rounded-sm p-6 text-left transition border ${
                selected
                  ? 'border-[#B2F273] bg-[#00261C]/5 dark:bg-[#00261C]/10 shadow-md shadow-[#B2F273]/5'
                  : 'border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121212] hover:border-neutral-300 dark:hover:border-white/20'
              }`}
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">{planCopy.title}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    {billingInterval === 'monthly' ? planCopy.monthlyLabel.replace(' / month', '') : planCopy.annualLabel.replace(' / year', '')}
                    <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">
                      {billingInterval === 'monthly' ? ' /mo' : ' /yr'}
                    </span>
                  </p>
                </div>
                {selected ? (
                  <span className="rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#00261C]/10 text-[#B2F273]">
                    Selected
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-[13px] leading-relaxed font-medium text-neutral-500 dark:text-neutral-400">{planCopy.blurb}</p>
              <ul className="mt-5 space-y-2.5">
                {planCopy.features.map((feature: string) => (
                  <li key={feature} className="flex items-center gap-3 text-[13px] font-medium text-neutral-600 dark:text-neutral-300">
                    <Check className="h-4 w-4 text-[#B2F273] shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Billing Interval */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className={`inline-flex h-11 items-center justify-center rounded-sm px-6 text-[11px] font-bold uppercase tracking-widest transition ${
            billingInterval === 'monthly'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md'
              : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
          }`}
          onClick={() => setBillingInterval('monthly')}
        >
          Monthly
        </button>
        <button
          type="button"
          className={`inline-flex h-11 items-center justify-center rounded-sm px-6 text-[11px] font-bold uppercase tracking-widest transition ${
            billingInterval === 'annual'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md'
              : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
          }`}
          onClick={() => setBillingInterval('annual')}
        >
          Annual <span className="ml-2 text-[10px] opacity-60">save 2 months</span>
        </button>
      </div>

      {/* Checkout Action */}
      <div className="mt-10 flex flex-wrap items-center gap-4 pt-8 border-t border-neutral-200 dark:border-white/10">
        <button
          className="inline-flex h-12 items-center justify-center rounded-sm bg-[#00261C] px-10 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#B2F273] hover:text-neutral-900 disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 disabled:cursor-not-allowed shadow-lg shadow-[#B2F273]/20"
          onClick={() => {
            if (!auth.isAuthenticated) {
              authModal.openLogin()
              return
            }
            void startCheckout()
          }}
          disabled={isCheckingOut || (auth.isAuthenticated && !canCheckout)}
        >
          {isCheckingOut
            ? 'Redirecting to Stripe...'
            : !auth.isAuthenticated
              ? 'Sign in to upgrade'
              : canCheckout
                ? `Upgrade to ${selectedPlanCopy.title}`
                : 'Checkout not configured yet'}
        </button>
        <Link
          to="/chat"
          className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition uppercase tracking-widest"
        >
          Back to console
        </Link>
      </div>
    </PublicPageShell>
  )
}
