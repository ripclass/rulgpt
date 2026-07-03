import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Mt700Interpreter } from '@/components/workbench/Mt700Interpreter'

const { interpretMt700 } = vi.hoisted(() => ({
  interpretMt700: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: { interpretMt700 },
  ApiError: class ApiError extends Error {
    status: number
    detail?: unknown

    constructor(message: string, status = 500, detail?: unknown) {
      super(message)
      this.status = status
      this.detail = detail
    }
  },
}))

describe('Mt700Interpreter', () => {
  beforeEach(() => {
    interpretMt700.mockReset()
  })

  it('renders parsed fields, flags, and the LCopilot CTA after a successful interpretation', async () => {
    interpretMt700.mockResolvedValue({
      fields: [{ tag: '20', name: 'Documentary Credit Number', content: 'LC-12345' }],
      flags: [{ tag: '46A', name: 'Documents Required', note: 'Soft clause: "acceptable to applicant"' }],
      answer: 'This is a standard documentary credit issuance.',
      citations: [{ rule_id: 'ucp600-19', rulebook: 'UCP600', reference: 'Art. 19', excerpt: '...', confidence: 'high' }],
      disclaimer: 'Advisory only — not legal advice.',
      cta_text: 'Need the full document check? → LCopilot',
      cta_url: 'https://trdrhub.com/lcopilot',
    })

    render(<Mt700Interpreter />)

    const textarea = screen.getByPlaceholderText(/paste the raw SWIFT MT700/i)
    fireEvent.change(textarea, { target: { value: ':20:LC-12345\n:31C:260101\n:50:Applicant Name' } })
    fireEvent.click(screen.getByRole('button', { name: /interpret/i }))

    await waitFor(() => {
      expect(interpretMt700).toHaveBeenCalledWith(':20:LC-12345\n:31C:260101\n:50:Applicant Name', expect.anything())
    })

    expect(await screen.findByText('Documentary Credit Number')).toBeInTheDocument()
    expect(screen.getByText('LC-12345')).toBeInTheDocument()
    expect(screen.getByText(/Soft clause: "acceptable to applicant"/)).toBeInTheDocument()
    expect(screen.getByText('This is a standard documentary credit issuance.')).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /Need the full document check\?.*LCopilot/ })
    expect(cta).toHaveAttribute('href', 'https://trdrhub.com/lcopilot')
    expect(screen.getByText('Advisory only — not legal advice.')).toBeInTheDocument()
  })

  it('shows the 422 error message when the pasted text is not MT700-like', async () => {
    const { ApiError } = await import('@/lib/api')
    interpretMt700.mockRejectedValue(new ApiError("That doesn't look like an MT700 message.", 422))

    render(<Mt700Interpreter />)
    fireEvent.change(screen.getByPlaceholderText(/paste the raw SWIFT MT700/i), { target: { value: 'not a real message' } })
    fireEvent.click(screen.getByRole('button', { name: /interpret/i }))

    expect(await screen.findByText(/doesn't look like an MT700 message/)).toBeInTheDocument()
  })
})
