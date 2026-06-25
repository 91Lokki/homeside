import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** A calm, last-resort fallback so a runtime error never shows a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Homeside caught an error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-8">
          <p className="label">Homeside</p>
          <h1 className="font-grotesk text-2xl font-medium tracking-tight">Something hiccuped.</h1>
          <p className="text-muted">
            The home base ran into an unexpected error. A reload usually settles it — your home team is saved.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-pill border px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink/30"
          >
            Reload
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
