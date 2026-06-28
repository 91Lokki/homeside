import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '@/state/auth'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { AuthSheet } from './AuthSheet'

/** Circular monogram in the home-team colour. */
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-grotesk font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: 'var(--team-pure)',
        color: 'var(--team-ink)',
      }}
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}

/**
 * Header account control. Signed out → a "Sign in" pill opening the join sheet.
 * Signed in → an avatar pill opening a compact account menu (a dropdown on
 * desktop, a bottom sheet on mobile). Hidden when there's no backend / mid-check.
 */
export function AuthButton() {
  const { status, displayName, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 640px)')

  if (status === 'unavailable' || status === 'loading') return null

  if (status !== 'signedIn') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-pill border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
        >
          Sign in
        </button>
        {open && <AuthSheet onClose={() => setOpen(false)} />}
      </>
    )
  }

  const name = displayName ?? 'Player'
  const first = name.trim().split(' ')[0]
  const close = () => setOpen(false)

  const card = (
    <div className="text-left">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <Avatar name={name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{name}</p>
          {user?.email && <p className="truncate text-2xs text-faint">{user.email}</p>}
        </div>
      </div>
      <div className="my-1.5 h-px bg-black/[0.06] dark:bg-white/10" />
      <button
        onClick={async () => {
          await signOut()
          close()
        }}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
      >
        <LogOut size={15} className="text-faint" /> Sign out
      </button>
    </div>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Account"
        className={cn(
          'flex items-center gap-2 rounded-pill border border-transparent py-1 pl-1 pr-2 transition-colors',
          open ? 'bg-black/[0.05] dark:bg-white/[0.07]' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
        )}
      >
        <Avatar name={name} />
        <span className="hidden max-w-[7rem] truncate text-xs font-medium sm:inline">{first}</span>
        <ChevronDown
          size={14}
          className={cn('hidden text-faint transition-transform duration-300 ease-calm sm:block', open && 'rotate-180')}
        />
      </button>

      {open &&
        (isDesktop ? (
          <>
            <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
            <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 origin-top-right animate-scale-in rounded-2xl bg-canvas p-2 shadow-xl ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
              {card}
            </div>
          </>
        ) : (
          createPortal(
            <div className="fixed inset-0 z-[70] grid place-items-end sm:hidden">
              <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={close} aria-hidden />
              <div className="relative w-full animate-slide-up rounded-t-[24px] bg-canvas p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
                {card}
              </div>
            </div>,
            document.body,
          )
        ))}
    </div>
  )
}
