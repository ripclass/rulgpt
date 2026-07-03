import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, vi } from 'vitest'
import { MainArea } from '@/components/layout/MainArea'

describe('MainArea', () => {
  beforeEach(() => {
    // Greeting/subtext copy is time-of-day dependent — pin the clock to evening
    // (18:00 local) so this test doesn't flake depending on when it runs.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 18, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a centered empty-state composer in preview mode', () => {
    const onPickSuggestion = vi.fn()

    render(
      <MemoryRouter>
        <MainArea
          messages={[]}
          suggestions={['What documents are required for a CIF shipment under UCP600?']}
          isLoading={false}
          error={null}
          canSave={false}
          previewMode
          onSubmitQuery={async () => undefined}
          onPickSuggestion={onPickSuggestion}
          onCitationClick={() => undefined}
          onSaveMessage={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Preview Node')).toBeInTheDocument()
    // Subtext on the empty-state hero (unauthenticated copy).
    expect(screen.getByText(/The rule you need, cited and explained/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What documents are required for a CIF shipment under UCP600?' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })
})
