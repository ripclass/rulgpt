import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MainArea } from '@/components/layout/MainArea'

describe('MainArea', () => {
  it('renders the preview shell and keeps example prompts inert', () => {
    const onPickSuggestion = vi.fn()

    render(
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
      />,
    )

    expect(screen.getByText('Preview mode')).toBeInTheDocument()
    expect(
      screen.getByText('RuleGPT is ready for preview, and live answers will unlock when the RulHub API is connected.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'What documents are required for a CIF shipment under UCP600?' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Preview only' })).toBeInTheDocument()
  })
})
