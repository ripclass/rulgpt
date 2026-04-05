import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, api } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
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
  starter: {
    title: 'Starter',
    monthlyLabel: '$9 / month',
    annualLabel: '$90 / year',
    blurb: 'For daily operators who need cited answers, history, and saved work without the heavier API tier.',
    features: [
      '500 queries / month',
      'Query history',
      'Saved answers',
      'PDF export',
    ],
  },
  pro: {
    title: 'Pro',
    monthlyLabel: '$19 / month',
    annualLabel: '$190 / year',
    blurb: 'For teams that need higher volume, exports, and API access on top of the core RuleGPT workflow.',
    features: [
      '2,000 queries / month',
      'Everything in Starter',
      'API access',
      'Priority routing',
    ],
  },
}

export function Upgrade() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>(auth.currentTier === 'starter' ? 'pro' : 'starter')
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
          if (status?.tier === 'starter' || status?.tier === 'pro') {
            setCheckoutMessage(`Checkout completed. Your account is now ${status.tier}.`)
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
      setCheckoutMessage('Sign in with Supabase to use the hosted checkout flow.')
      return
    }
    if (!billingStatus.data?.checkout_ready) {
      setCheckoutMessage('Stripe checkout is not configured yet. See the blockers below.')
      return
    }

    setIsCheckingOut(true)
    setCheckoutMessage(null)
    setCheckoutUrl(null)
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
        setCheckoutUrl(nextUrl)
        setCheckoutMessage(`Checkout session created for ${PLAN_COPY[selectedPlan].title}. Open Stripe to complete the upgrade.`)
        return
      }
      if (response.tier === 'starter' || response.tier === 'pro') {
        auth.setTier(response.tier)
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
    <main className="mx-auto flex min-h-screen w-full flex-col justify-center px-4 py-10 bg-[#FAFAFA] dark:bg-[#050505] transition-colors">
      <div className="mx-auto w-full max-w-3xl rounded-sm border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-8 md:p-12 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF4F00]">Billing</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Choose the plan that fits your workflow</h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {billingStatus.isLoading
            ? 'Checking billing configuration...'
            : canCheckout
              ? 'Your account is ready for the hosted Stripe checkout.'
              : 'Hosted checkout is waiting on the current billing configuration.'}
        </p>
        {billingStatus.data?.blockers?.length ? (
          <div className="mt-6 rounded-sm border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#121212] p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Billing blockers</p>
            <ul className="mt-3 space-y-2 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
              {billingStatus.data.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(['starter', 'pro'] as const).map((plan) => {
            const planCopy = PLAN_COPY[plan]
            const selected = selectedPlan === plan
            return (
              <button
                key={plan}
                type="button"
                className={`rounded-sm p-5 text-left transition border ${
                  selected 
                    ? 'border-[#FF4F00] bg-neutral-50 dark:bg-white/5 shadow-md shadow-[#FF4F00]/5' 
                    : 'border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121212]'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">{planCopy.title}</p>
                    <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {billingInterval === 'monthly' ? planCopy.monthlyLabel : planCopy.annualLabel}
                    </p>
                  </div>
                  {selected ? (
                    <span className="rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-[#FF4F00]/10 text-[#FF4F00]">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-[13px] leading-relaxed font-medium text-neutral-600 dark:text-neutral-400">{planCopy.blurb}</p>
              </button>
            )
          })}
        </div>
        <ul className="mt-6 space-y-3 text-[13px] font-medium text-neutral-600 dark:text-neutral-400">
          {selectedPlanCopy.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
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
            Monthly - {selectedPlanCopy.monthlyLabel.replace(' / month', '')}
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
            Annual - {selectedPlanCopy.annualLabel.replace(' / year', '')}
          </button>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 pt-6 border-t border-neutral-200 dark:border-white/10">
          <button
            className="inline-flex h-11 items-center justify-center rounded-sm bg-[#FF4F00] px-8 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600] disabled:opacity-50 shadow-md shadow-[#FF4F00]/20"
            onClick={() => {
              void startCheckout()
            }}
            disabled={!canCheckout || isCheckingOut}
          >
            {isCheckingOut
              ? 'Starting checkout...'
              : canCheckout
                ? `Start ${selectedPlanCopy.title} checkout`
                : billingStatus.data?.checkout_ready
                  ? 'Sign in from chat first'
                  : 'Checkout not configured yet'}
          </button>
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-sm bg-neutral-100 dark:bg-white/5 px-6 text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white transition hover:bg-neutral-200 dark:hover:bg-white/10"
            >
              Open Stripe checkout
            </a>
          ) : null}
          <Link to="/chat" className="inline-flex h-11 items-center justify-center rounded-sm bg-neutral-100 dark:bg-white/5 px-6 text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white transition hover:bg-neutral-200 dark:hover:bg-white/10">
            Back to chat
          </Link>
        </div>
        {checkoutMessage ? (
          <p className="mt-4 text-sm font-medium text-[#FF4F00]">{checkoutMessage}</p>
        ) : null}
        <p className="mt-6 text-[10px] uppercase tracking-widest !leading-loose text-neutral-400 dark:text-neutral-500">
          Free stays free. Starter and Pro use hosted Stripe checkout. If the blockers are empty, this page should be ready for live checkout for both paid plans.
        </p>
      </div>
    </main>
  )
}
