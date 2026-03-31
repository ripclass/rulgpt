import { PublicPageShell } from '@/components/layout/PublicPageShell'

export function Terms() {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="Terms of use"
      description="This is a launch-ready first-pass terms page. It makes the product boundary explicit and reduces ambiguity about what tfrules is and is not doing."
    >
      <section className="space-y-6 border border-border bg-card px-6 py-6 text-sm leading-7 text-muted-foreground">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Product scope</h2>
          <p className="mt-2">tfrules provides trade-finance rule explanations and citation-backed information. It does not provide legal advice, transaction approval, or professional assurance.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">User responsibility</h2>
          <p className="mt-2">Users remain responsible for verifying whether a rule applies to their specific transaction, jurisdiction, bank practice, or document set.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Availability</h2>
          <p className="mt-2">We may change, suspend, or improve parts of the service, including model routing, pricing, and usage limits, as the product evolves.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Contact</h2>
          <p className="mt-2">Questions about these terms should be sent to hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
