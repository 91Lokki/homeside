import { useMemo, useState } from 'react'
import { ChevronLeft, Plus, Search } from 'lucide-react'
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

/**
 * Inline player picker — an in-page screen (NOT a modal/overlay). It replaces the
 * squad view while choosing, with a back button, a sticky search, and a responsive
 * grid of player cards that fills the width on desktop and stacks on mobile.
 */
export function PlayerPicker({
  slot,
  onPick,
  onClose,
  taken,
  isCountryFull,
  embedded = false,
}: {
  slot: Slot
  onPick: (p: FantasyPick) => void
  onClose: () => void
  taken?: Set<string>
  isCountryFull?: (teamCode: TeamCode) => boolean
  /** Rendered as a persistent side panel (desktop) — hides the back button. */
  embedded?: boolean
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
    <section className="animate-fade-in">
      {!embedded && (
        <button
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1 rounded-pill bg-black/[0.04] py-1.5 pl-2 pr-3.5 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.06] transition-colors hover:text-ink dark:bg-white/[0.06] dark:ring-white/10"
        >
          <ChevronLeft size={16} /> Squad
        </button>
      )}

      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="font-grotesk text-2xl font-bold tracking-tight">Pick your {SLOT_LABEL[slot].toLowerCase()}</h2>
        <span className="text-2xs uppercase tracking-label text-faint">{results.length} available</span>
      </div>
      <p className="mb-4 text-sm text-muted">
        {slot === 'FLEX' ? 'Any outfielder — defender, midfielder or forward.' : 'Search any player — no suggestions, your call.'}
      </p>

      {/* sticky search so it stays reachable as the grid scrolls with the page */}
      <div className="sticky top-2 z-10 mb-4">
        <div className="flex items-center gap-2.5 rounded-pill bg-black/[0.04] px-4 py-3 ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10">
          <Search size={16} className="shrink-0 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, club or country…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </div>
      </div>

      {results.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-faint">No players match.</p>
      ) : (
        <ul className="panel divide-y divide-black/5 overflow-hidden dark:divide-white/[0.07]">
          {results.map((p) => {
            const full = isCountryFull?.(p.teamCode) ?? false
            return (
              <li key={playerKey(p)}>
                <button
                  type="button"
                  disabled={full}
                  onClick={() => onPick({ slot, name: p.name, teamCode: p.teamCode, position: p.pos, number: p.number })}
                  className={cn(
                    'group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors sm:px-4',
                    full ? 'cursor-not-allowed opacity-40' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
                  )}
                >
                  <Flag code={p.teamCode} size={34} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{p.name}</span>
                    <span className="block truncate text-2xs text-faint">
                      <span className="font-semibold uppercase tracking-label text-muted">{POS_ABBR[p.pos] ?? p.pos}</span> · {p.teamName}
                      {p.club ? ` · ${p.club}` : ''}
                    </span>
                    {full && <span className="mt-0.5 block text-2xs text-amber-600 dark:text-amber-500">country quota full</span>}
                  </span>
                  {p.number != null && (
                    <span className="grid h-6 min-w-[1.6rem] shrink-0 place-items-center rounded-full bg-black/[0.05] px-1.5 font-grotesk text-xs tnum text-faint dark:bg-white/[0.08]">
                      {p.number}
                    </span>
                  )}
                  {/* add affordance — the reference's Action column; the only accent in the list */}
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors',
                      full
                        ? 'text-faint ring-black/5 dark:ring-white/10'
                        : 'text-ink ring-black/10 group-hover:bg-team group-hover:text-team-ink group-hover:ring-transparent dark:ring-white/15',
                    )}
                  >
                    <Plus size={16} />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
