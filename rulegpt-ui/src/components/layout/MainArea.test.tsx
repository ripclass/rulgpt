import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { MainArea } from '@/components/layout/MainArea'

describe('MainArea', () => {
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
          onNewQuery={() => undefined}
          onPickSuggestion={onPickSuggestion}
          onCitationClick={() => undefined}
          onSaveMessage={() => undefined}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.getByText('Ask the rule.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What documents are required for a CIF shipment under UCP600?' })).toBeEnabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })
})
