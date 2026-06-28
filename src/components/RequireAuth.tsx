import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/state/auth'
import { useT } from '@/lib/useT'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signInWithGoogle } = useAuth()
  const t = useT()

  if (status === 'signedOut') {
    return (
      <div className="mx-auto max-w-md py-16 text-center animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
          <Lock size={20} className="text-team" />
        </div>
        <h1 className="mt-5 font-grotesk text-2xl font-bold tracking-tight">{t.authRequireTitle}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">{t.authRequireDesc}</p>
        <button
          onClick={() => void signInWithGoogle()}
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-ink px-6 py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-calm hover:-translate-y-0.5"
        >
          {t.authGoogle}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
