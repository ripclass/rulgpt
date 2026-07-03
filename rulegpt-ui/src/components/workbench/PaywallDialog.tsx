import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ArtifactKind, PaymentRequiredDetail } from '@/types'

interface PaywallDialogProps {
  open: boolean
  detail: PaymentRequiredDetail | null
  onOpenChange: (open: boolean) => void
  onOneoffCheckout: (kind: ArtifactKind) => void
  onProCheckout: () => void
}

export function PaywallDialog({ open, detail, onOpenChange, onOneoffCheckout, onProCheckout }: PaywallDialogProps) {
  if (!detail) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121212] rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-neutral-900 dark:text-white">Unlock this artifact</DialogTitle>
          <DialogDescription>
            Free accounts get case notes and drafts pay-as-you-go, or go Pro for unlimited access.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onOneoffCheckout('case_note')}
            className="flex w-full items-center justify-between rounded-sm border border-neutral-200 dark:border-white/10 px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-white/5"
          >
            Case note &mdash; $9 one-off
          </button>
          <button
            type="button"
            onClick={() => onOneoffCheckout('draft')}
            className="flex w-full items-center justify-between rounded-sm border border-neutral-200 dark:border-white/10 px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white transition hover:bg-neutral-50 dark:hover:bg-white/5"
          >
            Draft &mdash; $19 one-off
          </button>
          <button
            type="button"
            onClick={onProCheckout}
            className="flex w-full items-center justify-between rounded-sm bg-[#FF4F00] px-4 py-3 text-left text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#E64600] shadow-md shadow-[#FF4F00]/20"
          >
            Go Pro ${detail.pro_price_usd}/mo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
