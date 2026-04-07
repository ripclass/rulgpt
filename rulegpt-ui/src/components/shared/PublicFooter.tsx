import { Link } from 'react-router-dom'
import { RuxMark } from '@/components/shared/RuxMascot'

export function PublicFooter() {
  return (
    <footer className="bg-black py-24 text-neutral-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2.5 mb-6 text-white hover:opacity-80 transition-opacity">
            <div className="text-white">
              <RuxMark className="w-6 h-6 border-none" />
            </div>
            <span className="text-2xl font-medium tracking-tight">tfrules</span>
          </Link>
          <p className="text-sm font-light leading-relaxed">
            Absolute verification for global trade finance. Citation-first intelligence.
          </p>
          <div className="mt-8 space-y-1 text-xs">
            <p className="font-mono tracking-widest uppercase text-neutral-600">By Enso Intelligence</p>
          </div>
        </div>
        
        <div className="flex gap-16 md:gap-32 text-sm uppercase tracking-widest font-semibold">
          <div className="space-y-6">
            <p className="text-neutral-500">System</p>
            <div className="flex flex-col gap-4">
              <Link to="/pricing" className="text-neutral-300 hover:text-white transition">Pricing</Link>
              <Link to="/faq" className="text-neutral-300 hover:text-white transition">FAQ</Link>
              <Link to="/contact" className="text-neutral-300 hover:text-white transition">Contact</Link>
              <Link to="/blog" className="text-neutral-300 hover:text-white transition">Blog</Link>
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-neutral-500">Legal</p>
            <div className="flex flex-col gap-4">
              <Link to="/privacy" className="text-neutral-300 hover:text-white transition">Privacy</Link>
              <Link to="/terms" className="text-neutral-300 hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
