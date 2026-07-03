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

  it('shows the $29/mo Pro plan and the Enterprise contact-us card', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: true,
      checkout_ready: true,
      blockers: [],
    })
    mockUseAuth.mockReturnValue({
      accessToken: 'token-123',
      currentTier: 'free',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@example.com', tier: 'free' },
      setTier,
    })

    renderPage()

    expect(await screen.findByText('$29')).toBeInTheDocument()
    const enterpriseLink = screen.getByRole('link', { name: 'Contact us' })
    expect(enterpriseLink).toHaveAttribute('href', 'mailto:hello@rulgpt.com')
  })

  it('uses the hosted checkout flow for the Pro plan when a bearer token is available', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: true,
      checkout_ready: true,
      blockers: [],
    })
    createBillingCheckout.mockResolvedValue({
      message: 'Checkout session created.',
    })
    mockUseAuth.mockReturnValue({
      accessToken: 'token-123',
      currentTier: 'free',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@example.com', tier: 'free' },
      setTier,
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Upgrade to Pro' }))

    await waitFor(() => {
      expect(createBillingCheckout).toHaveBeenCalledTimes(1)
    })
    expect(createBillingCheckout.mock.calls[0][0]).toMatchObject({
      plan: 'pro',
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
      checkout_ready: false,
      blockers: ['Stripe is not configured.'],
    })
    mockUseAuth.mockReturnValue({
      accessToken: 'token-123',
      currentTier: 'free',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@example.com', tier: 'free' },
      setTier,
    })

    renderPage()

    expect(await screen.findByRole('button', { name: 'Checkout not configured yet' })).toBeDisabled()
    expect(await screen.findByText(/Stripe is not configured\./)).toBeInTheDocument()
    expect(setTier).not.toHaveBeenCalled()
  })

  it('sets the tier when checkout returns a normalized professional tier', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: true,
      checkout_ready: true,
      blockers: [],
    })
    createBillingCheckout.mockResolvedValue({
      message: 'Checkout session created.',
      tier: 'professional',
    })
    mockUseAuth.mockReturnValue({
      accessToken: 'token-123',
      currentTier: 'free',
      isAuthenticated: true,
      user: { id: 'user-1', email: 'user@example.com', tier: 'free' },
      setTier,
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Upgrade to Pro' }))

    await waitFor(() => {
      expect(setTier).toHaveBeenCalledWith('professional')
    })
  })

  it('prompts sign in when unauthenticated', async () => {
    getBillingStatus.mockResolvedValue({
      stripe_configured: true,
      checkout_ready: true,
      blockers: [],
    })
    mockUseAuth.mockReturnValue({
      accessToken: null,
      currentTier: 'anonymous',
      isAuthenticated: false,
      user: null,
      setTier,
    })

    renderPage()

    expect(await screen.findByRole('button', { name: 'Sign in to upgrade' })).toBeInTheDocument()
    expect(createBillingCheckout).not.toHaveBeenCalled()
  })
})
