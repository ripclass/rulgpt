import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ApiError, api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { BillingInterval } from '@/types'

export function Upgrade() {
  const auth = useAuth()
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')

  const hasBearerToken = Boolean(auth.accessToken)
  const canCheckout = auth.isAuthenticated && hasBearerToken
  const showLocalPreviewFallback = !auth.oauth.supabaseEnabled || !hasBearerToken
  const checkoutPaths = useMemo(() => {
    const origin = window.location.origin
    return {
      success_url: `${origin}/upgrade?checkout=success`,
      cancel_url: `${origin}/upgrade?checkout=cancel`,
    }
  }, [])

  const startCheckout = async () => {
    if (!canCheckout) {
      setCheckoutMessage('Sign in with Supabase to use the hosted checkout flow.')
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

  const enableLocalPreview = () => {
    auth.setTier('pro')
    setCheckoutMessage('Local Pro preview enabled in this browser.')
    setCheckoutUrl(null)
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
      <div className="glass-panel rounded-2xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-wide text-primary">RuleGPT Pro</p>
        <h1 className="mt-2 text-3xl font-semibold">Upgrade for teams and daily workflows</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {canCheckout
            ? 'Your account is ready for the hosted Stripe checkout.'
            : 'Hosted checkout needs a Supabase access token. You can still use the local preview in demo mode.'}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>Formatted compliance reports</li>
          <li>Bulk export (session PDF/JSON)</li>
          <li>API access up to 10,000 queries/month</li>
          <li>Priority routing for model generation</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={billingInterval === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly - $15
          </Button>
          <Button
            type="button"
            variant={billingInterval === 'annual' ? 'default' : 'outline'}
            onClick={() => setBillingInterval('annual')}
          >
            Annual - $120
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              void startCheckout()
            }}
            disabled={!canCheckout || isCheckingOut}
          >
            {isCheckingOut ? 'Starting checkout...' : canCheckout ? 'Start Stripe checkout' : 'Sign in from chat first'}
          </Button>
          {checkoutUrl ? (
            <Button asChild variant="outline">
              <a href={checkoutUrl} rel="noreferrer">
                Open Stripe checkout
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/">Back to chat</Link>
          </Button>
        </div>
        {checkoutMessage ? (
          <p className="mt-3 text-sm text-muted-foreground">{checkoutMessage}</p>
        ) : null}
        {showLocalPreviewFallback ? (
          <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-sm font-medium">Need a browser-only demo?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This keeps the existing local preview path for environments without Supabase config or live billing.
            </p>
            <Button className="mt-3" variant="outline" onClick={enableLocalPreview}>
              Enable local Pro preview
            </Button>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          The checkout call targets backend billing handlers with hosted Stripe success and cancel URLs. If that endpoint is not available yet, use the local preview fallback above.
        </p>
      </div>
    </main>
  )
}
