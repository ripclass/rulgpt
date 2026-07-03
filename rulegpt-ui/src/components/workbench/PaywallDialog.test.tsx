import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PaywallDialog } from '@/components/workbench/PaywallDialog'

describe('PaywallDialog', () => {
  const onOneoffCheckout = vi.fn()
  const onProCheckout = vi.fn()
  const onOpenChange = vi.fn()

  beforeEach(() => {
    onOneoffCheckout.mockReset()
    onProCheckout.mockReset()
    onOpenChange.mockReset()
  })

  it('shows all three options and wires each to the correct checkout call', () => {
    render(
      <PaywallDialog
        open
        detail={{ error: 'payment_required', kind: 'draft', price_usd: 19, pro_price_usd: 29 }}
        onOpenChange={onOpenChange}
        onOneoffCheckout={onOneoffCheckout}
        onProCheckout={onProCheckout}
      />,
    )

    const caseNoteButton = screen.getByRole('button', { name: /Case note.*\$9 one-off/ })
    const draftButton = screen.getByRole('button', { name: /Draft.*\$19 one-off/ })
    const proButton = screen.getByRole('button', { name: /Go Pro \$29\/mo/ })
    expect(caseNoteButton).toBeInTheDocument()
    expect(draftButton).toBeInTheDocument()
    expect(proButton).toBeInTheDocument()

    fireEvent.click(caseNoteButton)
    expect(onOneoffCheckout).toHaveBeenCalledWith('case_note')

    fireEvent.click(draftButton)
    expect(onOneoffCheckout).toHaveBeenCalledWith('draft')

    fireEvent.click(proButton)
    expect(onProCheckout).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when detail is null', () => {
    const { container } = render(
      <PaywallDialog
        open={false}
        detail={null}
        onOpenChange={onOpenChange}
        onOneoffCheckout={onOneoffCheckout}
        onProCheckout={onProCheckout}
      />,
    )
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })
})
