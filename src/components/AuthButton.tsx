import { useState } from 'react'
import { useAuth } from '@/state/auth'
import { AuthSheet } from './AuthSheet'

/**
 * The header sign-in control. Hidden entirely when no backend is configured
 * (`status==='unavailable'`) or while the initial session check is in flight, so
 * the header never flickers a control that can't do anything.
 */
export function AuthButton() {
  const { status, displayName } = useAuth()
  const [open, setOpen] = useState(false)

  if (status === 'unavailable' || status === 'loading') return null

  const signedIn = status === 'signedIn'
  const first = (displayName ?? '').trim().split(' ')[0]

  return (
    <>
      {signedIn ? (
        <button
          onClick={() => setOpen(true)}
          title="Account"
          className="flex items-center gap-2 rounded-pill border border-transparent py-1 pl-1 pr-3 transition-colors hover:border-ink/20"
        >
          <span
            className="grid h-7 w-7 place-items-center rounded-full font-grotesk text-[11px] font-bold"
            style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}
          >
            {(displayName ?? '?').trim().charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:inline">{first}</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-pill border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
        >
          Sign in
        </button>
      )}
      {open && <AuthSheet onClose={() => setOpen(false)} />}
    </>
  )
}
