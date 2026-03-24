import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { QueryInput } from '@/components/input/QueryInput'

const { toastMessage } = vi.hoisted(() => ({
  toastMessage: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    message: toastMessage,
  },
}))

describe('QueryInput', () => {
  it('does not submit live queries while preview mode is active', () => {
    const onSubmit = vi.fn()

    render(<QueryInput previewMode onSubmit={onSubmit} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What documents are required?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview only' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(toastMessage).toHaveBeenCalledWith(
      'Preview mode is active. Live queries will return when the RulHub API is ready.',
    )
  })
})
