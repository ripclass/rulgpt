import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { SEOHead } from '@/components/shared/SEOHead'

const contacts = [
  {
    label: 'General',
    value: 'hello@tfrules.com',
    note: 'Product questions, partnerships, and media.',
  },
  {
    label: 'Support',
    value: 'support@tfrules.com',
    note: 'Account issues, bugs, and answer-quality feedback.',
  },
  {
    label: 'Billing',
    value: 'billing@tfrules.com',
    note: 'Subscription questions and payment issues.',
  },
]

export function Contact() {
  return (
    <>
    <SEOHead title="Contact — TFRules" description="Get in touch with the tfrules team. General enquiries, support, and billing." path="/contact" />
    <PublicPageShell
      eyebrow="Contact"
      title="Support should be easy to find"
      description="tfrules is a trust product. The support path needs to be visible before something goes wrong, not after."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {contacts.map((contact) => (
          <article
            key={contact.label}
            className="rounded-sm bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 px-6 py-6"
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
            >
              {contact.label}
            </p>
            <p className="mt-3 text-lg font-bold tracking-tight text-neutral-900 dark:text-white">{contact.value}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{contact.note}</p>
          </article>
        ))}
      </section>

      <section
        className="mt-8 rounded-sm px-6 py-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10"
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
        >
          What to send
        </p>
        <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-600 dark:text-neutral-400">
          <p>For answer-quality issues, include the exact question, what you expected, and which rule or source you think was missed.</p>
          <p>For account problems, include the email on the account and a short description of what happened.</p>
          <p>For billing questions, include the plan, invoice date, and the last four digits shown by your payment provider if relevant.</p>
        </div>
      </section>
    </PublicPageShell>
    </>
  )
}
