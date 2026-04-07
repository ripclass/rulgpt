import { Link } from 'react-router-dom'
import { PublicPageShell } from '@/components/layout/PublicPageShell'
import { useAuth } from '@/hooks/useAuth'
import { useTierLimit } from '@/hooks/useTierLimit'
import { useQuery } from '@/hooks/useQuery'
import { useSession } from '@/hooks/useSession'

const tierLabels: Record<string, { name: string; price: string }> = {
  free: { name: 'Free', price: '$0/mo' },
  anonymous: { name: 'Free', price: '$0/mo' },
  professional: { name: 'Professional', price: '$79/mo' },
  enterprise: { name: 'Enterprise', price: '$199/mo' },
}

export function Settings() {
  const auth = useAuth()
  const { sessionToken } = useSession()
  const query = useQuery({ sessionToken, tier: auth.tier, userId: auth.user?.id, accessToken: auth.accessToken })
  const tierLimit = useTierLimit({ tier: auth.tier, queriesRemaining: query.queriesRemaining })

  const tierInfo = tierLabels[auth.tier] ?? tierLabels.free
  const usagePercent = tierLimit.limitValue > 0 ? Math.min(100, (tierLimit.usedCount / tierLimit.limitValue) * 100) : 0

  return (
    <PublicPageShell
      eyebrow="Settings"
      title="Account & Usage"
      description="Manage your plan, view usage, and update account settings."
    >
      {/* Account */}
      <section className="rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          {auth.user?.name && (
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Name</span>
              <span className="font-medium text-neutral-900 dark:text-white">{auth.user.name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Email</span>
            <span className="font-medium text-neutral-900 dark:text-white">{auth.user?.email ?? 'Not signed in'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">User ID</span>
            <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{auth.user?.id?.slice(0, 8) ?? '—'}...</span>
          </div>
        </div>
      </section>

      {/* Plan & Usage */}
      <section className="mt-6 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white mb-4">Plan & Usage</h2>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{tierInfo.name}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{tierInfo.price}</p>
          </div>
          {auth.tier === 'free' || auth.tier === 'anonymous' ? (
            <Link
              to="/upgrade"
              className="rounded-sm bg-[#FF4F00] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#E64600]"
            >
              Upgrade
            </Link>
          ) : (
            <Link
              to="/upgrade"
              className="rounded-sm border border-neutral-200 dark:border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:hover:bg-white/5"
            >
              Change plan
            </Link>
          )}
        </div>

        {/* Usage bar */}
        <div className="mt-4 p-4 rounded-sm bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              {tierLimit.usedCount} of {tierLimit.limitValue} queries used
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {tierLimit.remaining} remaining
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tierLimit.remaining <= 0 ? 'bg-red-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-[#FF4F00]'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            Resets at the start of your next billing cycle.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-6 rounded-sm p-6 bg-white dark:bg-[#121212] border border-neutral-200 dark:border-white/10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-900 dark:text-white mb-4">Quick Links</h2>
        <div className="space-y-2">
          <Link to="/chat" className="block text-sm font-medium text-[#FF4F00] hover:underline">Back to chat</Link>
          <Link to="/pricing" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">View pricing plans</Link>
          <Link to="/contact" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">Contact support</Link>
          <Link to="/privacy" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">Privacy policy</Link>
          <Link to="/terms" className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition">Terms of use</Link>
        </div>
      </section>
    </PublicPageShell>
  )
}
