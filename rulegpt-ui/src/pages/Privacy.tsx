import { PublicPageShell } from '@/components/layout/PublicPageShell'

export function Privacy() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Privacy policy"
      description="This is a lean first-pass privacy page for launch. It states what RuleGPT collects, why it is collected, and how users can contact you."
    >
      <section className="space-y-6 border border-black/10 bg-white px-6 py-6 text-sm leading-7 text-[#243042]">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">What we collect</h2>
          <p className="mt-2">RuleGPT may collect account information, query history, saved answers, technical logs, usage analytics, and support messages.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Why we collect it</h2>
          <p className="mt-2">We use this information to operate the product, secure accounts, improve answer quality, support billing, and understand how the product is being used.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Product improvement</h2>
          <p className="mt-2">RuleGPT may retain question and answer pairs, citations, and feedback signals to improve retrieval quality, safety, and future model performance.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-[#0c111d]">Contact</h2>
          <p className="mt-2">Questions about privacy should be sent to privacy@tfrules.com or hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
