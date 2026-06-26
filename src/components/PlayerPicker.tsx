import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { SQUADS } from '@/data/squads'
import { teamByCode } from '@/data/teams'
import { SLOT_LABEL, SLOT_POSITION, type FantasyPick, type Slot } from '@/domain/fantasy'
import type { TeamCode } from '@/domain/types'
import { Label } from './ui/atoms'

interface PoolPlayer {
  name: string
  position: string
  number: number | null
  club?: string
  teamCode: TeamCode
  teamName: string
  verified: boolean
}

const POOL: PoolPlayer[] = Object.entries(SQUADS).flatMap(([code, squad]) =>
  squad.players.map((p) => ({
    name: p.name,
    position: p.position,
    number: p.number ?? null,
    club: p.club,
    teamCode: code,
    teamName: teamByCode[code]?.name ?? code,
    verified: squad.verified,
  })),
)

const keyOf = (teamCode: string, name: string) => `${teamCode}-${name}`

export function PlayerPicker({
  slot,
  onPick,
  onClose,
  taken,
}: {
  slot: Slot
  onPick: (p: FantasyPick) => void
  onClose: () => void
  taken?: Set<string>
}) {
  const [query, setQuery] = useState('')
  const wantPos = SLOT_POSITION[slot]

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POOL.filter((p) => p.position === wantPos)
      .filter((p) => !taken?.has(keyOf(p.teamCode, p.name)))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.club ?? '').toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q))
      .sort((a, b) => a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name))
  }, [query, wantPos, taken])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <Label>Pick your {SLOT_LABEL[slot].toLowerCase()}</Label>
            <p className="mt-1 text-sm text-muted">Search any player. No suggestions — your call.</p>
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
            placeholder={`Search ${SLOT_LABEL[slot].toLowerCase()}s by name, club or country…`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-2 py-6 text-sm text-faint">No players match.</p>
          ) : (
            <ul className="divide-y">
              {results.map((p) => (
                <li key={`${p.teamCode}-${p.name}`}>
                  <button
                    onClick={() => onPick({ slot, name: p.name, teamCode: p.teamCode, position: p.position, number: p.number })}
                    className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-sunken/50"
                  >
                    <span className="grid h-8 w-9 shrink-0 place-items-center rounded-[7px] bg-sunken font-grotesk text-[10px] font-semibold tracking-wide text-muted">
                      {p.teamCode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-2xs text-faint">
                        {p.teamName}
                        {p.club ? ` · ${p.club}` : ''}
                        {!p.verified && <span className="text-amber-600 dark:text-amber-500"> · roster unverified</span>}
                      </span>
                    </span>
                    {p.number != null && <span className="font-grotesk text-xs text-faint tnum">{p.number}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export const POOL_SIZE = POOL.length
