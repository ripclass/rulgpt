import { PublicPageShell } from '@/components/layout/PublicPageShell'

export function Terms() {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="Terms of use"
      description="This is a launch-ready first-pass terms page. It makes the product boundary explicit and reduces ambiguity about what RuleGPT is and is not doing."
    >
      <section className="space-y-6 border border-black/10 bg-white px-6 py-6 text-sm leading-7 text-[#243042]">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Product scope</h2>
          <p className="mt-2">RuleGPT provides trade-finance rule explanations and citation-backed information. It does not provide legal advice, transaction approval, or professional assurance.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">User responsibility</h2>
          <p className="mt-2">Users remain responsible for verifying whether a rule applies to their specific transaction, jurisdiction, bank practice, or document set.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Availability</h2>
          <p className="mt-2">We may change, suspend, or improve parts of the service, including model routing, pricing, and usage limits, as the product evolves.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Contact</h2>
          <p className="mt-2">Questions about these terms should be sent to hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
