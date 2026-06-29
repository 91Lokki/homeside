import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, LogOut, Trash2 } from 'lucide-react'
import { useAuth } from '@/state/auth'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useT } from '@/lib/useT'
import { cn } from '@/lib/utils'
import { AuthSheet } from './AuthSheet'

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

export function AuthButton() {
  const { status, displayName, user, signOut, deleteAccount } = useAuth()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 640px)')

  if (status === 'unavailable' || status === 'loading') return null

  if (status !== 'signedIn') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="rounded-pill border border-black/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
        >
          {t.authSignIn}
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
        <LogOut size={15} className="text-faint" /> {t.authSignOut}
      </button>
      <button
        onClick={() => {
          close()
          setConfirmingDelete(true)
        }}
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
      >
        <Trash2 size={15} /> {t.authDeleteAccount}
      </button>
    </div>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t.authAccountTitle}
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

      {confirmingDelete &&
        createPortal(
          <div className="fixed inset-0 z-[80] grid place-items-center p-4">
            <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setConfirmingDelete(false)} aria-hidden />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-sm animate-scale-in rounded-[22px] bg-canvas p-6 ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/12 text-rose-600 dark:text-rose-400">
                <Trash2 size={18} />
              </div>
              <h2 className="font-grotesk text-xl font-semibold tracking-tight">{t.authDeleteTitle}</h2>
              <p className="mt-2 text-sm text-muted">{t.authDeleteDesc}</p>
              {deleteFailed && <p className="mt-3 text-sm font-medium text-rose-600 dark:text-rose-400">{t.authDeleteFailed}</p>}
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="rounded-pill px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
                >
                  {t.authDeleteCancel}
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    setDeleteFailed(false)
                    try {
                      await deleteAccount() // reloads the page on success
                    } catch {
                      setDeleting(false)
                      setDeleteFailed(true)
                    }
                  }}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <Trash2 size={14} /> {t.authDeleteConfirm}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
