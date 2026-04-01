import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
        <main
          className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center px-4 py-10"
          style={{ background: 'var(--color-obsidian)', fontFamily: 'var(--font-body)' }}
        >
          <div className="card-dark w-full rounded-2xl p-6 md:p-8">
            <p
              className="text-[11px] uppercase tracking-[0.18em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-amber)' }}
            >
              tfrules
            </p>
            <h1
              className="display-md mt-3"
              style={{ color: 'var(--color-parchment)' }}
            >
              The page hit an unexpected error
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: 'var(--color-text-secondary)' }}>
              The error has been recorded. You can reload, go back to chat, or return to the public site.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="btn-primary rounded-md px-5 py-2 text-sm"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <Link to="/chat" className="btn-secondary rounded-md px-5 py-2 text-sm">
                Go to chat
              </Link>
              <Link to="/" className="btn-secondary rounded-md px-5 py-2 text-sm">
                Public site
              </Link>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
