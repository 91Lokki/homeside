import { Component, type ReactNode } from 'react'
import { getT } from '@/lib/i18n'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

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
      const lang = (() => {
        try { return localStorage.getItem('homeside.lang') === 'zh' ? 'zh' : 'en' } catch { return 'en' }
      })()
      const t = getT(lang)
      return (
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-4 px-8">
          <p className="label">Homeside</p>
          <h1 className="font-grotesk text-2xl font-medium tracking-tight">{t.errorTitle}</h1>
          <p className="text-muted">{t.errorDesc}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-pill border px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink/30"
          >
            {t.errorReload}
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
