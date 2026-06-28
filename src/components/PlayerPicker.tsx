import { useMemo, useState } from 'react'
import { ChevronLeft, Plus, Search } from 'lucide-react'
import { keyPlayerById, type KeyPlayerArchetype } from '@/data/keyPlayers'
import { SQUADS } from '@/data/squads'
import { teamByCode } from '@/data/teams'
import { PlayerAvatar } from './PlayerAvatar'
import { posCat, SLOT_ALLOWS, playerKey, type PosCat, type Slot } from '@/domain/fantasy'
import type { TeamCode } from '@/domain/types'
import { useT } from '@/lib/useT'
import { cn } from '@/lib/utils'

interface PoolPlayer {
  name: string
  pos: PosCat
  number: number | null
  club?: string
  teamCode: TeamCode
  teamName: string
}

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

const ALL_POS: PosCat[] = ['GK', 'DEF', 'MID', 'ATT']
const ARCHETYPE_BADGE: Record<KeyPlayerArchetype, string> = {
  Scorer: 'text-rose-700/70 ring-rose-500/15 dark:text-rose-200/70 dark:ring-rose-300/15',
  Creator: 'text-sky-700/70 ring-sky-500/15 dark:text-sky-200/70 dark:ring-sky-300/15',
  Guardian: 'text-emerald-700/70 ring-emerald-500/15 dark:text-emerald-200/70 dark:ring-emerald-300/15',
}

function KeyPlayerCue({
  archetypes,
  starOnly = false,
  showStar = true,
}: {
  archetypes: KeyPlayerArchetype[]
  starOnly?: boolean
  showStar?: boolean
}) {
  return (
    <span className="inline-flex shrink-0 flex-wrap items-center justify-end gap-1 leading-none">
      {showStar && (
        <span aria-label="Key player" className="shrink-0 text-[13px] text-team/80">
          ★
        </span>
      )}
      {!starOnly && archetypes.map((a) => (
        <span
          key={a}
          className={cn(
            'shrink-0 rounded-[8px] bg-black/[0.025] px-2 py-[3px] font-grotesk text-[10px] font-semibold leading-none ring-1 ring-inset dark:bg-white/[0.035]',
            ARCHETYPE_BADGE[a],
          )}
        >
          {a}
        </span>
      ))}
    </span>
  )
}

export function PlayerPicker({
  slot,
  onPick,
  onClose,
  taken,
  isCountryFull,
  canAdd,
  unavailableTeams,
  embedded = false,
}: {
  slot: Slot | null
  onPick: (p: { name: string; teamCode: TeamCode; position: PosCat; number: number | null }) => void
  onClose: () => void
  taken?: Set<string>
  isCountryFull?: (teamCode: TeamCode) => boolean
  canAdd?: (pos: PosCat) => boolean
  unavailableTeams?: Set<TeamCode>
  embedded?: boolean
}) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [posFilter, setPosFilter] = useState<PosCat | null>(null)
  const browsing = slot == null
  const allowed = slot ? SLOT_ALLOWS[slot] : ALL_POS

  const rowDisabled = (p: IndexedPlayer) =>
    (isCountryFull?.(p.teamCode) ?? false) || (canAdd ? !canAdd(p.pos) : false)

  const results = useMemo(() => {
    const q = foldText(query.trim())
    return POOL.filter((p) => allowed.includes(p.pos))
      .filter((p) => !unavailableTeams?.has(p.teamCode))
      .filter((p) => !taken?.has(playerKey(p)))
      .filter((p) => (browsing && posFilter ? p.pos === posFilter : true))
      .filter((p) => !q || p.search.includes(q))
      .sort((a, b) => {
        const da = rowDisabled(a) ? 1 : 0
        const db = rowDisabled(b) ? 1 : 0
        if (da !== db) return da - db
        return a.teamName.localeCompare(b.teamName) || a.name.localeCompare(b.name)
      })
  }, [query, allowed, taken, browsing, posFilter, isCountryFull, canAdd, unavailableTeams])

  const addableCount = useMemo(() => results.filter((p) => !rowDisabled(p)).length, [results])
  const posCounts = useMemo(() => {
    const m: Record<PosCat, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 }
    for (const p of POOL) {
      if (unavailableTeams?.has(p.teamCode)) continue
      if (!taken?.has(playerKey(p))) m[p.pos]++
    }
    return m
  }, [taken, unavailableTeams])

  const posFilterBar = browsing && (
    <div className="mt-3 flex flex-wrap gap-1.5">
      <button
        onClick={() => setPosFilter(null)}
        className={cn(
          'rounded-pill px-3 py-1 text-2xs font-semibold uppercase tracking-label transition-colors',
          posFilter === null ? 'bg-team text-team-ink' : 'bg-black/[0.04] text-muted hover:text-ink dark:bg-white/[0.06]',
        )}
      >
        {t.poolAll}
      </button>
      {ALL_POS.map((pos) => (
        <button
          key={pos}
          onClick={() => setPosFilter((cur) => (cur === pos ? null : pos))}
          className={cn(
            'rounded-pill px-3 py-1 text-2xs font-semibold uppercase tracking-label transition-colors',
            posFilter === pos ? 'bg-team text-team-ink' : 'bg-black/[0.04] text-muted hover:text-ink dark:bg-white/[0.06]',
          )}
        >
          {t.fantasyPosAbbr[pos] ?? pos} <span className="tnum opacity-70">{posCounts[pos]}</span>
        </button>
      ))}
    </div>
  )

  const slotLabel = slot ? t.fantasySlotLabel[slot] : ''
  const heading = embedded
    ? t.poolTitle
    : slot
      ? t.poolPickSlot(slotLabel.toLowerCase())
      : t.poolTitle
  const helper = slot
    ? slot === 'FLEX'
      ? t.poolFillFlex
      : t.poolFillSlot(slotLabel.toLowerCase())
    : t.poolBrowse

  const searchBar = (
    <div className="flex items-center gap-2.5 rounded-pill bg-black/[0.04] px-4 py-3 ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10">
      <Search size={16} className="shrink-0 text-faint" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.poolSearchPlaceholder}
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
      />
    </div>
  )

  const listItems = results.map((p) => {
    const key = playerKey(p)
    const keyMeta = keyPlayerById[key]
    const full = isCountryFull?.(p.teamCode) ?? false
    const disabled = rowDisabled(p)
    return (
      <li key={key}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick({ name: p.name, teamCode: p.teamCode, position: p.pos, number: p.number })}
          className={cn(
            'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
            disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
          )}
        >
          <PlayerAvatar teamCode={p.teamCode} name={p.name} number={p.number} size={34} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1">
              <span className="min-w-0 truncate text-sm font-medium text-ink">{p.name}</span>
              {keyMeta && <KeyPlayerCue archetypes={keyMeta.archetypes} starOnly />}
            </span>
            <span className="block truncate text-2xs text-faint">
              <span className="font-semibold uppercase tracking-label text-muted">{t.fantasyPosAbbr[p.pos] ?? p.pos}</span> · {p.teamName}
              {p.club ? ` · ${p.club}` : ''}
            </span>
            {full && <span className="mt-0.5 block text-2xs text-amber-600 dark:text-amber-500">{t.poolCountryFull}</span>}
          </span>
          <span className="flex shrink-0 items-center justify-end gap-2">
            {keyMeta && <KeyPlayerCue archetypes={keyMeta.archetypes} showStar={false} />}
            {p.number != null && (
              <span className="font-grotesk text-sm tnum text-faint">{p.number}</span>
            )}
          </span>
          <span
            aria-hidden
            className={cn(
              'grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors',
              disabled
                ? 'text-faint ring-black/5 dark:ring-white/10'
                : 'text-ink ring-black/10 group-hover:bg-team group-hover:text-team-ink group-hover:ring-transparent dark:ring-white/15',
            )}
          >
            <Plus size={16} />
          </span>
        </button>
      </li>
    )
  })

  if (embedded) {
    return (
      <section className="flex h-full">
        <div className="panel flex h-[640px] w-full flex-col overflow-hidden">
          <div className="border-b border-black/5 px-4 py-4 dark:border-white/[0.07]">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <h2 className="font-grotesk text-xl font-bold tracking-tight">{heading}</h2>
              <span className="flex items-center gap-2 text-2xs uppercase tracking-label text-faint">
                {slot && (
                  <button onClick={onClose} className="normal-case tracking-normal text-team hover:underline">
                    {t.poolShowAll}
                  </button>
                )}
                {t.poolAddable(addableCount)}
              </span>
            </div>
            <p className="mt-1 text-2xs text-faint">{helper}</p>
            <div className="mt-3">{searchBar}</div>
            {posFilterBar}
          </div>
          {results.length === 0 ? (
            <p className="grid flex-1 place-items-center px-1 text-center text-sm text-faint">{t.poolNoMatch}</p>
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-black/5 overflow-y-auto overscroll-contain dark:divide-white/[0.07]">
              {listItems}
            </ul>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="animate-fade-in">
      <button
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-1 rounded-pill bg-black/[0.04] py-1.5 pl-2 pr-3.5 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.06] transition-colors hover:text-ink dark:bg-white/[0.06] dark:ring-white/10"
      >
        <ChevronLeft size={16} /> {t.poolBack}
      </button>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2 className="font-grotesk text-2xl font-bold tracking-tight">{heading}</h2>
        <span className="text-2xs uppercase tracking-label text-faint">{t.poolAddable(addableCount)}</span>
      </div>
      <p className="mb-4 text-sm text-muted">{helper}</p>
      <div className="mb-4">{searchBar}</div>

      {results.length === 0 ? (
        <p className="px-1 py-10 text-center text-sm text-faint">{t.poolNoMatch}</p>
      ) : (
        <ul className="panel max-h-[64vh] divide-y divide-black/5 overflow-y-auto overscroll-contain dark:divide-white/[0.07]">
          {listItems}
        </ul>
      )}
    </section>
  )
}
