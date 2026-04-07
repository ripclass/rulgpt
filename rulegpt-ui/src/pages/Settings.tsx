import { Link } from 'react-router-dom'
import { ArrowLeft, User, CreditCard, BarChart3, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTierLimit } from '@/hooks/useTierLimit'
import { useQuery } from '@/hooks/useQuery'
import { useSession } from '@/hooks/useSession'

const tierLabels: Record<string, { name: string; price: string; description: string }> = {
  free: { name: 'Free', price: '$0/mo', description: '5 queries per month' },
  anonymous: { name: 'Free', price: '$0/mo', description: '5 queries per month' },
  professional: { name: 'Professional', price: '$79/mo', description: '500 queries per month' },
  enterprise: { name: 'Enterprise', price: '$199/mo', description: '2,000 queries per month' },
}

type SettingsTab = 'account' | 'plan' | 'usage'

export function Settings() {
  const auth = useAuth()
  const { sessionToken } = useSession()
  const query = useQuery({ sessionToken, tier: auth.tier, userId: auth.user?.id, accessToken: auth.accessToken })
  const tierLimit = useTierLimit({ tier: auth.tier, queriesRemaining: query.queriesRemaining })

  const tierInfo = tierLabels[auth.tier] ?? tierLabels.free
  const usagePercent = tierLimit.limitValue > 0 ? Math.min(100, (tierLimit.usedCount / tierLimit.limitValue) * 100) : 0

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'plan', label: 'Plan', icon: CreditCard },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#171717] transition-colors">
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-white/10 bg-white dark:bg-[#121212]">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-4">
          <Link to="/chat" className="p-1.5 rounded-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition">
            <ArrowLeft className="h-4 w-4 text-neutral-500" />
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0 hidden md:block">
            <div className="sticky top-8 space-y-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Account */}
            <section id="account" className="rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Account</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                {auth.user?.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">Name</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">{auth.user.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Email</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">{auth.user?.email ?? 'Not signed in'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">ID</span>
                  <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{auth.user?.id ?? '—'}</span>
                </div>
              </div>
            </section>

            {/* Plan */}
            <section id="plan" className="rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Plan</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-neutral-900 dark:text-white">{tierInfo.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{tierInfo.price} &middot; {tierInfo.description}</p>
                  </div>
                  <Link
                    to="/upgrade"
                    className={`rounded-sm px-4 py-2 text-xs font-bold uppercase tracking-widest transition ${
                      auth.tier === 'free' || auth.tier === 'anonymous'
                        ? 'bg-[#FF4F00] text-white hover:bg-[#E64600]'
                        : 'border border-neutral-200 dark:border-white/10 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {auth.tier === 'free' || auth.tier === 'anonymous' ? 'Upgrade' : 'Change'}
                  </Link>
                </div>
              </div>
            </section>

            {/* Usage */}
            <section id="usage" className="rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Usage this month</h2>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">{tierLimit.usedCount}</span>
                    <span className="text-sm text-neutral-400 dark:text-neutral-500">/ {tierLimit.limitValue}</span>
                  </div>
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {tierLimit.remaining} remaining
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      tierLimit.remaining <= 0 ? 'bg-red-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-[#FF4F00]'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
                  Resets at the start of your next billing cycle.
                </p>
              </div>
            </section>

            {/* Links */}
            <section className="rounded-lg bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-white/5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-900 dark:text-white">Resources</h2>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-white/5">
                {[
                  { to: '/chat', label: 'Back to chat' },
                  { to: '/pricing', label: 'Pricing plans' },
                  { to: '/contact', label: 'Contact support' },
                  { to: '/privacy', label: 'Privacy policy' },
                  { to: '/terms', label: 'Terms of use' },
                ].map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center justify-between px-6 py-3 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                  >
                    {label}
                    <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
