import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Upgrade } from '@/pages/Upgrade'

const { mockUseAuth, createBillingCheckout, getBillingStatus, setTier } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  createBillingCheckout: vi.fn(),
  getBillingStatus: vi.fn(),
  setTier: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number

    constructor(message: string, status = 500) {
      super(message)
      this.status = status
    }
  },
  api: {
    getBillingStatus,
    createBillingCheckout,
  },
}))

describe('Upgrade', () => {
  const renderPage = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Upgrade />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  beforeEach(() => {
    mockUseAuth.mockReset()
    createBillingCheckout.mockReset()
    setTier.mockReset()
  })

  it('uses the hosted checkout flow when a bearer token is available', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: true,
      secret_key_configured: true,
      webhook_secret_configured: true,
      monthly_price_configured: true,
      annual_price_configured: true,
      checkout_ready: true,
      webhook_ready: true,
      supported_intervals: ['monthly', 'annual'],
      blockers: [],
    })
    createBillingCheckout.mockResolvedValue({
      message: 'Checkout session created.',
    })
    mockUseAuth.mockReturnValue({
      accessToken: 'token-123',
      currentTier: 'free',
      isAuthenticated: true,
      oauth: { supabaseEnabled: true },
      user: { id: 'user-1', email: 'user@example.com', tier: 'free' },
      setTier,
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Start Stripe checkout' }))

    await waitFor(() => {
      expect(createBillingCheckout).toHaveBeenCalledTimes(1)
    })
    expect(createBillingCheckout.mock.calls[0][0]).toMatchObject({
      interval: 'monthly',
      customer_email: 'user@example.com',
    })
    expect(createBillingCheckout.mock.calls[0][0].success_url).toMatch(/\/upgrade\?checkout=success$/)
    expect(createBillingCheckout.mock.calls[0][0].cancel_url).toMatch(/\/upgrade\?checkout=cancel$/)
    expect(createBillingCheckout.mock.calls[0][1]).toEqual({
      userId: 'user-1',
      tier: 'free',
      accessToken: 'token-123',
    })
    expect(await screen.findByText('Checkout session created.')).toBeInTheDocument()
    expect(setTier).not.toHaveBeenCalled()
  })

  it('shows the configured billing fallback when checkout is unavailable', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: false,
      secret_key_configured: false,
      webhook_secret_configured: false,
      monthly_price_configured: false,
      annual_price_configured: false,
      checkout_ready: false,
      webhook_ready: false,
      supported_intervals: ['monthly', 'annual'],
      blockers: ['Stripe is not configured.'],
    })
    mockUseAuth.mockReturnValue({
      accessToken: null,
      currentTier: 'free',
      isAuthenticated: false,
      oauth: { supabaseEnabled: false },
      user: null,
      setTier,
    })

    renderPage()

    expect(await screen.findByRole('button', { name: 'Checkout not configured yet' })).toBeDisabled()
    expect(await screen.findByText('Stripe is not configured.')).toBeInTheDocument()
    expect(setTier).not.toHaveBeenCalled()
  })
})
