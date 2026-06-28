import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { TEAMS, teamByCode } from '@/data/teams'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { Flag } from './Flag'

/**
 * A search-and-switch control for the Team page. Picks a team to *browse*; the
 * choice is local to whoever owns it (the Team screen) — it never touches the
 * global home team or team colour.
 */
export function TeamSwitcher({
  current,
  homeCode,
  onPick,
}: {
  current: string
  homeCode: string
  onPick: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const isDesktop = useMediaQuery('(min-width: 640px)')
  const cur = teamByCode[current]

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...TEAMS]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(
        (t) => !s || t.name.toLowerCase().includes(s) || t.code.toLowerCase().includes(s) || (t.nameTC ?? '').includes(s),
      )
  }, [q])

  const close = () => {
    setOpen(false)
    setQ('')
  }
  const pick = (code: string) => {
    onPick(code)
    close()
  }

  const list = (
    <>
      <div className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2.5 dark:border-white/10">
        <Search size={15} className="shrink-0 text-faint" />
        <input
          autoFocus={isDesktop}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 48 teams…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>
      <ul className="max-h-[min(60vh,380px)] overflow-y-auto overscroll-contain p-1.5">
        {results.map((t) => (
          <li key={t.code}>
            <button
              onClick={() => pick(t.code)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
                t.code === current && 'bg-team-soft',
              )}
            >
              <Flag code={t.code} size={24} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{t.name}</span>
              {t.code === homeCode && (
                <span className="shrink-0 rounded-full bg-sunken px-1.5 py-0.5 text-[10px] font-semibold text-faint">home</span>
              )}
              {t.nameTC && <span className="shrink-0 font-tc text-2xs text-faint">{t.nameTC}</span>}
            </button>
          </li>
        ))}
        {!results.length && <li className="px-3 py-6 text-center text-sm text-faint">No team matches “{q.trim()}”.</li>}
      </ul>
    </>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-2.5 rounded-pill bg-black/[0.04] py-1.5 pl-2 pr-3 ring-1 ring-inset ring-black/[0.06] transition-colors hover:bg-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10 dark:hover:bg-white/[0.1]"
      >
        <Flag code={current} size={22} className="shrink-0" />
        <span className="text-sm font-semibold text-ink">{cur?.name ?? current}</span>
        <ChevronDown size={15} className={cn('text-faint transition-transform duration-300 ease-calm', open && 'rotate-180')} />
      </button>

      {open &&
        (isDesktop ? (
          <>
            <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
            <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 origin-top-left animate-scale-in overflow-hidden rounded-2xl bg-canvas shadow-xl ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
              {list}
            </div>
          </>
        ) : (
          createPortal(
            <div className="fixed inset-0 z-[70] grid place-items-end">
              <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={close} aria-hidden />
              <div className="relative w-full animate-slide-up overflow-hidden rounded-t-[24px] bg-canvas pb-[max(0.5rem,env(safe-area-inset-bottom))] ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
                <div className="flex items-center justify-between px-4 pb-1 pt-3">
                  <span className="label">View a team</span>
                  <button onClick={close} aria-label="Close" className="text-faint hover:text-ink">
                    <X size={18} />
                  </button>
                </div>
                {list}
              </div>
            </div>,
            document.body,
          )
        ))}
    </div>
  )
}
