import { PublicPageShell } from '@/components/layout/PublicPageShell'

export function Privacy() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Privacy policy"
      description="This is a lean first-pass privacy page for launch. It states what tfrules collects, why it is collected, and how users can contact you."
    >
      <section className="space-y-6 rounded-sm bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 px-6 py-6 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">What we collect</h2>
          <p className="mt-2">tfrules may collect account information, query history, saved answers, technical logs, usage analytics, and support messages.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Why we collect it</h2>
          <p className="mt-2">We use this information to operate the product, secure accounts, improve answer quality, support billing, and understand how the product is being used.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Product improvement</h2>
          <p className="mt-2">tfrules may retain question and answer pairs, citations, and feedback signals to improve retrieval quality, safety, and future model performance.</p>
        </div>
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Contact</h2>
          <p className="mt-2">Questions about privacy should be sent to privacy@tfrules.com or hello@tfrules.com.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
