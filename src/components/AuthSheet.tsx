import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, X } from 'lucide-react'
import { useAuth } from '@/state/auth'
import { Label } from './ui/atoms'

/** The multicolor Google "G" glyph. */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** A small centered modal — sign in (Google) when out, account + sign out when in. */
export function AuthSheet({ onClose }: { onClose: () => void }) {
  const { status, user, displayName, signInWithGoogle, signOut } = useAuth()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const signedIn = status === 'signedIn'

  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-end sm:place-items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative m-0 w-full animate-slide-up rounded-t-[24px] bg-canvas p-6 ring-1 ring-inset ring-black/[0.08] dark:ring-white/10 sm:m-4 sm:max-w-sm sm:animate-fade-in sm:rounded-[24px]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-faint hover:text-ink"
        >
          <X size={16} />
        </button>

        {signedIn ? (
          <>
            <Label>Your account</Label>
            <div className="mt-3 flex items-center gap-3">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full font-grotesk text-sm font-bold"
                style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}
              >
                {(displayName ?? '?').trim().charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                {user?.email && <p className="truncate text-xs text-faint">{user.email}</p>}
              </div>
            </div>
            <p className="mt-5 text-sm text-muted">
              Your bracket and fantasy picks sync to the cloud, so you show up on the league leaderboard. Nothing else
              is shared.
            </p>
            <button
              onClick={async () => {
                await signOut()
                onClose()
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-pill border border-black/10 py-3 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              <LogOut size={15} /> Sign out
            </button>
          </>
        ) : (
          <>
            <Label>Homeside league</Label>
            <h2 className="mt-2 font-grotesk text-2xl font-bold tracking-tight text-ink">Join the league.</h2>
            <p className="mt-3 text-sm text-muted">
              Sign in to put your bracket and fantasy scores on the leaderboard against your friends. Your picks stay
              yours — sign-in just keeps the scoreboard honest.
            </p>
            <button
              onClick={() => void signInWithGoogle()}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-pill bg-ink py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-calm hover:-translate-y-0.5"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                <GoogleG size={15} />
              </span>
              Continue with Google
            </button>
            <p className="mt-3 text-center text-2xs text-faint">You can keep playing without signing in.</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
