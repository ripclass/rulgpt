import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ApiError, api } from '@/lib/api'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import type { BillingInterval } from '@/types'

export function Upgrade() {
  const auth = useAuth()
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
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

  const startCheckout = async () => {
    track('upgrade_checkout_attempted', {
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
        setCheckoutMessage('Checkout session created. Open Stripe to complete the upgrade.')
        return
      }
      if (response.tier === 'pro' || response.subscription_status === 'active') {
        auth.setTier('pro')
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-wide text-primary">tfrules Pro</p>
        <h1 className="mt-2 text-3xl font-semibold">Upgrade for teams and daily workflows</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {billingStatus.isLoading
            ? 'Checking billing configuration...'
            : canCheckout
              ? 'Your account is ready for the hosted Stripe checkout.'
              : 'Hosted checkout is waiting on the current billing configuration.'}
        </p>
        {billingStatus.data?.blockers?.length ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-sm font-medium">Billing blockers</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {billingStatus.data.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>Formatted compliance reports</li>
          <li>Bulk export (session PDF/JSON)</li>
          <li>API access with fair-use limits</li>
          <li>Priority routing for model generation</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={billingInterval === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly - $19
          </Button>
          <Button
            type="button"
            variant={billingInterval === 'annual' ? 'default' : 'outline'}
            onClick={() => setBillingInterval('annual')}
          >
            Annual - $190
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void startCheckout()
            }}
            disabled={!canCheckout || isCheckingOut}
          >
            {isCheckingOut
              ? 'Starting checkout...'
              : canCheckout
                ? 'Start Stripe checkout'
                : billingStatus.data?.checkout_ready
                  ? 'Sign in from chat first'
                  : 'Checkout not configured yet'}
          </Button>
          {checkoutUrl ? (
            <Button asChild variant="outline">
              <a href={checkoutUrl} rel="noreferrer">
                Open Stripe checkout
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/chat">Back to chat</Link>
          </Button>
        </div>
        {checkoutMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{checkoutMessage}</p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          Hosted checkout depends on the backend billing handlers and the Stripe configuration listed above. If the blockers are empty, this page should be ready for live checkout.
        </p>
      </div>
    </main>
  )
}
