import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'

describe('SuggestedQueries', () => {
  it('renders suggestion buttons', () => {
    render(<SuggestedQueries suggestions={['A', 'B']} onPick={() => undefined} />)
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
  })

  it('keeps example prompts inert in preview mode', () => {
    const onPick = vi.fn()

    render(<SuggestedQueries suggestions={['A']} onPick={onPick} disabled />)

    const button = screen.getByRole('button', { name: 'A' })
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(onPick).not.toHaveBeenCalled()
  })
})
