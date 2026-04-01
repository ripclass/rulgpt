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
    <main
      className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10"
      style={{ background: 'var(--color-obsidian)', fontFamily: 'var(--font-body)' }}
    >
      <div
        className="card-dark rounded-2xl p-6 md:p-8"
      >
        <p className="text-sm uppercase tracking-wide" style={{ color: 'var(--color-amber)' }}>Billing</p>
        <h1 className="heading-xl mt-2" style={{ color: 'var(--color-parchment)' }}>Choose the plan that fits your workflow</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {billingStatus.isLoading
            ? 'Checking billing configuration...'
            : canCheckout
              ? 'Your account is ready for the hosted Stripe checkout.'
              : 'Hosted checkout is waiting on the current billing configuration.'}
        </p>
        {billingStatus.data?.blockers?.length ? (
          <div
            className="mt-4 rounded-lg p-3"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--color-parchment)' }}>Billing blockers</p>
            <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
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
                className="rounded-xl p-4 text-left transition"
                style={{
                  background: selected ? 'var(--color-surface-raised)' : 'var(--color-surface)',
                  border: selected ? '1px solid var(--color-amber)' : '1px solid var(--color-border)',
                }}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold" style={{ color: 'var(--color-parchment)' }}>{planCopy.title}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {billingInterval === 'monthly' ? planCopy.monthlyLabel : planCopy.annualLabel}
                    </p>
                  </div>
                  {selected ? (
                    <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ background: 'var(--color-amber-muted)', color: 'var(--color-amber)' }}>
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{planCopy.blurb}</p>
              </button>
            )
          })}
        </div>
        <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {selectedPlanCopy.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className={billingInterval === 'monthly' ? 'btn-primary rounded-md px-5 py-2 text-sm' : 'btn-secondary rounded-md px-5 py-2 text-sm'}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly - {selectedPlanCopy.monthlyLabel.replace(' / month', '')}
          </button>
          <button
            type="button"
            className={billingInterval === 'annual' ? 'btn-primary rounded-md px-5 py-2 text-sm' : 'btn-secondary rounded-md px-5 py-2 text-sm'}
            onClick={() => setBillingInterval('annual')}
          >
            Annual - {selectedPlanCopy.annualLabel.replace(' / year', '')}
          </button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="btn-primary rounded-md px-5 py-2 text-sm disabled:opacity-50"
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
              className="btn-secondary rounded-md px-5 py-2 text-sm"
            >
              Open Stripe checkout
            </a>
          ) : null}
          <Link to="/chat" className="btn-secondary rounded-md px-5 py-2 text-sm">
            Back to chat
          </Link>
        </div>
        {checkoutMessage ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{checkoutMessage}</p>
        ) : null}
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Free stays free. Starter and Pro use hosted Stripe checkout. If the blockers are empty, this page should be ready for live checkout for both paid plans.
        </p>
      </div>
    </main>
  )
}
