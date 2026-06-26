import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SQUADS } from '@/data/squads'
import { teamByCode } from '@/data/teams'
import { Flag } from './Flag'
import { posCat, SLOT_ALLOWS, SLOT_LABEL, playerKey, type FantasyPick, type PosCat, type Slot } from '@/domain/fantasy'
import type { TeamCode } from '@/domain/types'
import { Label } from './ui/atoms'
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
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas/97 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <Label>Pick your {SLOT_LABEL[slot].toLowerCase()}</Label>
            <p className="mt-1 text-sm text-muted">
              {slot === 'FLEX' ? 'Any outfielder (defender, midfielder or attacker).' : 'Search any player — no suggestions, your call.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-pill border bg-surface px-4 py-2.5">
          <Search size={16} className="text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, club or country…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-sm text-faint">No players match.</p>
          ) : (
            <ul className="divide-y">
              {results.map((p) => {
                const full = isCountryFull?.(p.teamCode) ?? false
                return (
                  <li key={playerKey(p)}>
                    <button
                      disabled={full}
                      onClick={() => onPick({ slot, name: p.name, teamCode: p.teamCode, position: p.pos, number: p.number })}
                      className={cn('flex w-full items-center gap-3 px-2 py-2.5 text-left', full ? 'cursor-not-allowed opacity-40' : 'hover:bg-sunken/50')}
                    >
                      <Flag code={p.teamCode} size={28} className="shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-2xs text-faint">
                          {p.pos} · {p.teamName}
                          {p.club ? ` · ${p.club}` : ''}
                          {full && <span className="text-amber-600 dark:text-amber-500"> · country quota full</span>}
                        </span>
                      </span>
                      {p.number != null && <span className="font-grotesk text-xs text-faint tnum">{p.number}</span>}
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
