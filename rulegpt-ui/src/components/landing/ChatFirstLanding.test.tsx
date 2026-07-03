import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatFirstLanding } from '@/components/landing/ChatFirstLanding'

const { getStats } = vi.hoisted(() => ({
  getStats: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { getStats },
}))

describe('ChatFirstLanding', () => {
  const renderLanding = (overrides: Partial<React.ComponentProps<typeof ChatFirstLanding>> = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const onSubmitQuery = vi.fn()
    const onStartCheckout = vi.fn()
    const props = {
      isAuthenticated: false,
      tier: 'anonymous' as const,
      userEmail: null,
      onOpenLogin: vi.fn(),
      onOpenSignup: vi.fn(),
      onOpenChat: vi.fn(),
      onSubmitQuery,
      onStartCheckout,
      isCheckingOut: false,
      ...overrides,
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatFirstLanding {...props} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    return { onSubmitQuery, onStartCheckout }
  }

  beforeEach(() => {
    getStats.mockReset()
    getStats.mockResolvedValue({ total_rules: 15000 })
  })

  it('renders the H1 tagline', async () => {
    renderLanding()
    expect(await screen.findByRole('heading', { level: 1, name: /Before the bank rejects it, ask RulGPT\./ })).toBeInTheDocument()
  })

  it('submits the hero query via onSubmitQuery when typed and sent', async () => {
    const { onSubmitQuery } = renderLanding()
    const textarea = await screen.findByPlaceholderText(/Ask about any trade finance rule/i)
    fireEvent.change(textarea, { target: { value: 'Is a stale bill of lading a discrepancy?' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(onSubmitQuery).toHaveBeenCalledWith('Is a stale bill of lading a discrepancy?')
    })
  })

  it('falls back to "10,000+" when the stats fetch fails', async () => {
    getStats.mockReset()
    getStats.mockRejectedValue(new Error('network error'))
    renderLanding()
    expect(await screen.findByText(/backed by a 10,000\+-rule grounded corpus/)).toBeInTheDocument()
  })

  it('shows the $29 Pro price in the pricing section', async () => {
    renderLanding()
    expect(await screen.findByText('$29')).toBeInTheDocument()
  })
})
