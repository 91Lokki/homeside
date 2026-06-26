import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SQUADS } from '@/data/squads'
import { teamByCode } from '@/data/teams'
import { Flag } from './Flag'
import { posCat, POS_ABBR, SLOT_ALLOWS, SLOT_LABEL, playerKey, type FantasyPick, type PosCat, type Slot } from '@/domain/fantasy'
import type { TeamCode } from '@/domain/types'
import { cn } from '@/lib/utils'

interface PoolPlayer {
  name: string
  pos: PosCat
  number: number | null
  club?: string
  teamCode: TeamCode
  teamName: string
}

/** Accent-insensitive search key, so "modric" finds "Modrić". */
const foldText = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

interface IndexedPlayer extends PoolPlayer {
  search: string
}

const POOL: IndexedPlayer[] = Object.entries(SQUADS).flatMap(([code, squad]) =>
  squad.players.map((p) => ({
    name: p.name,
    pos: posCat(p.position),
    number: p.number ?? null,
    club: p.club,
    teamCode: code,
    teamName: teamByCode[code]?.name ?? code,
    search: foldText(`${p.name} ${p.club ?? ''} ${teamByCode[code]?.name ?? code}`),
  })),
)

export function PlayerPicker({
  slot,
  onPick,
  onClose,
  taken,
  isCountryFull,
}: {
  slot: Slot
  onPick: (p: FantasyPick) => void
  onClose: () => void
  taken?: Set<string>
  isCountryFull?: (teamCode: TeamCode) => boolean
}) {
  const [query, setQuery] = useState('')
  const allowed = SLOT_ALLOWS[slot]

  const results = useMemo(() => {
    const q = foldText(query.trim())
    return POOL.filter((p) => allowed.includes(p.pos))
      .filter((p) => !taken?.has(playerKey(p)))
      .filter((p) => !q || p.search.includes(q))
      .sort((a, b) => a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name))
  }, [query, allowed, taken])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      {/* dimmed, blurred backdrop — tap to dismiss */}
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-md" />

      {/* the sheet: an opaque, rim-lit glass card (no drop shadow per the system) */}
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-canvas ring-1 ring-inset ring-black/[0.08] dark:ring-white/12 sm:max-h-[82vh] sm:rounded-[28px]">
        <div className="shrink-0 px-5 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-grotesk text-xl font-bold tracking-tight text-ink">Pick your {SLOT_LABEL[slot].toLowerCase()}</h2>
              <p className="mt-1 text-2xs text-muted">
                {slot === 'FLEX' ? 'Any outfielder — defender, midfielder or forward.' : 'Search any player — no suggestions, your call.'}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.04] text-muted ring-1 ring-inset ring-black/[0.06] hover:text-ink dark:bg-white/[0.06] dark:ring-white/10"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2.5 rounded-pill bg-black/[0.04] px-4 py-3 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
            <Search size={16} className="shrink-0 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, club or country…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </div>
          <p className="mt-2.5 px-1 text-2xs text-faint">{results.length} available</p>
        </div>

        <div className="mt-1 flex-1 overflow-y-auto px-2 pb-3 sm:px-3">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-faint">No players match.</p>
          ) : (
            <ul>
              {results.map((p) => {
                const full = isCountryFull?.(p.teamCode) ?? false
                return (
                  <li key={playerKey(p)}>
                    <button
                      disabled={full}
                      onClick={() => onPick({ slot, name: p.name, teamCode: p.teamCode, position: p.pos, number: p.number })}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                        full ? 'cursor-not-allowed opacity-40' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                      )}
                    >
                      <Flag code={p.teamCode} size={32} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                        <span className="block truncate text-2xs text-faint">
                          <span className="font-semibold tracking-label text-muted">{POS_ABBR[p.pos] ?? p.pos}</span> · {p.teamName}
                          {p.club ? ` · ${p.club}` : ''}
                          {full && <span className="text-amber-600 dark:text-amber-500"> · country quota full</span>}
                        </span>
                      </span>
                      {p.number != null && (
                        <span className="grid h-6 min-w-[1.5rem] shrink-0 place-items-center rounded-full bg-black/[0.05] px-1.5 font-grotesk text-xs tnum text-faint dark:bg-white/[0.08]">
                          {p.number}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
