import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { reportFrontendError } from '@/lib/monitoring'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportFrontendError(error, {
      kind: 'react.error_boundary',
      component_stack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center px-4 py-10">
          <div className="glass-panel w-full rounded-2xl p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">RuleGPT</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.05em] text-[#0c111d]">
              The page hit an unexpected error
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              The error has been recorded. You can reload, go back to chat, or return to the public site.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="rounded-none bg-[#111827] text-white hover:bg-primary" onClick={() => window.location.reload()}>
                Reload
              </Button>
              <Button asChild variant="outline" className="rounded-none border-black/10 bg-white hover:bg-[#faf7f2]">
                <Link to="/chat">Go to chat</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-none border-black/10 bg-white hover:bg-[#faf7f2]">
                <Link to="/">Public site</Link>
              </Button>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
