import { PublicPageShell } from '@/components/layout/PublicPageShell'

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
    <PublicPageShell
      eyebrow="Contact"
      title="Support should be easy to find"
      description="tfrules is a trust product. The support path needs to be visible before something goes wrong, not after."
    >
      <section className="grid gap-4 md:grid-cols-3">
        {contacts.map((contact) => (
          <article key={contact.label} className="border border-border bg-card px-6 py-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{contact.label}</p>
            <p className="mt-3 text-lg font-semibold text-foreground">{contact.value}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{contact.note}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 border border-border bg-card px-6 py-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">What to send</p>
        <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <p>For answer-quality issues, include the exact question, what you expected, and which rule or source you think was missed.</p>
          <p>For account problems, include the email on the account and a short description of what happened.</p>
          <p>For billing questions, include the plan, invoice date, and the last four digits shown by your payment provider if relevant.</p>
        </div>
      </section>
    </PublicPageShell>
  )
}
