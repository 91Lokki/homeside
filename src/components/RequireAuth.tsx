import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/state/auth'

/**
 * Gate the games (Predict / Fantasy) behind sign-in. When a backend is configured
 * but nobody is signed in, show a sign-in prompt. When there's no backend at all
 * (status 'unavailable'), or the user is signed in, render the screen normally —
 * so the app still works offline and signed-in play is unchanged. The leaderboard
 * stays open to everyone, so guests can still look around.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signInWithGoogle } = useAuth()

  if (status === 'signedOut') {
    return (
      <div className="mx-auto max-w-md py-16 text-center animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
          <Lock size={20} className="text-team" />
        </div>
        <h1 className="mt-5 font-grotesk text-2xl font-bold tracking-tight">Sign in to play.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Your bracket and fantasy picks save to your account and score on the league leaderboard. You can browse the
          leaderboard without an account.
        </p>
        <button
          onClick={() => void signInWithGoogle()}
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-ink px-6 py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-calm hover:-translate-y-0.5"
        >
          Continue with Google
        </button>
      </div>
    )
  }

  return <>{children}</>
}
