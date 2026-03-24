import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Upgrade } from '@/pages/Upgrade'

const { mockUseAuth, createBillingCheckout, setTier } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  createBillingCheckout: vi.fn(),
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
    createBillingCheckout,
  },
}))

describe('Upgrade', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    createBillingCheckout.mockReset()
    setTier.mockReset()
  })

  it('uses the hosted checkout flow when a bearer token is available', async () => {
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

    render(
      <MemoryRouter>
        <Upgrade />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start Stripe checkout' }))

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

  it('keeps the local preview path when hosted billing is unavailable', async () => {
    mockUseAuth.mockReturnValue({
      accessToken: null,
      currentTier: 'free',
      isAuthenticated: false,
      oauth: { supabaseEnabled: false },
      user: null,
      setTier,
    })

    render(
      <MemoryRouter>
        <Upgrade />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Enable local Pro preview' }))

    expect(setTier).toHaveBeenCalledWith('pro')
    expect(await screen.findByText('Local Pro preview enabled in this browser.')).toBeInTheDocument()
  })
})
