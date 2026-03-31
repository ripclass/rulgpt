import { PublicPageShell } from '@/components/layout/PublicPageShell'

export function Privacy() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Privacy policy"
      description="This is a lean first-pass privacy page for launch. It states what tfrules collects, why it is collected, and how users can contact you."
    >
      <section className="space-y-6 rounded-xl border border-border bg-card px-6 py-6 text-sm leading-7 text-muted-foreground">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">What we collect</h2>
          <p className="mt-2">tfrules may collect account information, query history, saved answers, technical logs, usage analytics, and support messages.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Why we collect it</h2>
          <p className="mt-2">We use this information to operate the product, secure accounts, improve answer quality, support billing, and understand how the product is being used.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Product improvement</h2>
          <p className="mt-2">tfrules may retain question and answer pairs, citations, and feedback signals to improve retrieval quality, safety, and future model performance.</p>
        </div>
        <div>
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em] text-foreground">Contact</h2>
          <p className="mt-2">Questions about privacy should be sent to privacy@tfrules.com or hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
