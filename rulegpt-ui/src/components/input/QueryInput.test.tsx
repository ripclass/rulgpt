import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryInput } from '@/components/input/QueryInput'

describe('QueryInput', () => {
  it('submits from the centered composer layout in preview mode', () => {
    const onSubmit = vi.fn()

    render(<QueryInput previewMode layout="centered" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What documents are required?' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(onSubmit).toHaveBeenCalledWith('What documents are required?')
  })
})
