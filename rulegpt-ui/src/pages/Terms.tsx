import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { SEOHead } from '@/components/shared/SEOHead'

export function Terms() {
  return (
    <>
    <SEOHead title="Terms of Use — TFRules" description="Terms and conditions for using tfrules.com. Rules explanation only — not legal advice, not document validation." path="/terms" />
    <PublicPageShell
      eyebrow="Terms"
      title="Terms of use"
      description="This is a launch-ready first-pass terms page. It makes the product boundary explicit and reduces ambiguity about what tfrules is and is not doing."
    >
      <section className="space-y-6 rounded-sm bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 px-6 py-6 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Product scope</h2>
          <p className="mt-2">tfrules provides trade-finance rule explanations and citation-backed information. It does not provide legal advice, transaction approval, or professional assurance.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">User responsibility</h2>
          <p className="mt-2">Users remain responsible for verifying whether a rule applies to their specific transaction, jurisdiction, bank practice, or document set.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Availability</h2>
          <p className="mt-2">We may change, suspend, or improve parts of the service, including model routing, pricing, and usage limits, as the product evolves.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Contact</h2>
          <p className="mt-2">Questions about these terms should be sent to hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
    </>
  )
}
