import { render, screen } from '@testing-library/react'
import { SuggestedQueries } from '@/components/input/SuggestedQueries'

describe('SuggestedQueries', () => {
  it('renders suggestion buttons', () => {
    render(<SuggestedQueries suggestions={['A', 'B']} onPick={() => undefined} />)
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
  })
})
