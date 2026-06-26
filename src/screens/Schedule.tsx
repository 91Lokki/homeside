import { useEffect, useMemo, useRef, useState } from 'react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { GroupId, Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { MatchReport } from '@/components/MatchReport'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const GLASS = 'bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10'
const STAND_COLS = 'grid grid-cols-[1.9rem_minmax(0,1fr)_1.4rem_1.3rem_1.3rem_1.3rem_2rem_2rem] items-center gap-1'
const kickoffMs = (m: Match) => new Date(m.kickoff).getTime()
const timeLabel = (m: Match) => new Date(m.kickoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dateLabel = (m: Match) => new Date(m.kickoff).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** Re-render every `ms` while `active`, so a live clock can tick on its own. */
function useNow(active: boolean, ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [active, ms])
  return now
}

/** A live game clock as MM:SS, ticking every second between polls. ESPN gives a
 *  whole-minute clock, so we anchor to it at each poll and interpolate the seconds
 *  locally; the next poll re-syncs the minute (and handles half-time / stoppage). */
function liveClock(minute: number | null | undefined, lastUpdated: number | null, now: number): string {
  if (minute == null) return 'LIVE'
  const since = lastUpdated != null ? Math.max(0, Math.min(119, Math.floor((now - lastUpdated) / 1000))) : 0
  const total = minute * 60 + since
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function Schedule() {
  const { matches, homeCode, homeTeam, apiStatus, healthKnown, lastUpdated } = useApp()
  const [group, setGroup] = useState<GroupId>(homeTeam?.group ?? 'A')
  const [openId, setOpenId] = useState<string | null>(null)

  // Tick once a second only while something is actually live, so the clock runs.
  const hasLive = useMemo(() => matches.some((m) => m.status === 'live'), [matches])
  const now = useNow(hasLive)

  const groupCodes = useMemo(() => TEAMS.filter((t) => t.group === group).map((t) => t.code), [group])
  const standings = useMemo(() => computeGroupStandings(matches, group, groupCodes), [matches, group, groupCodes])

  // The group's six fixtures oldest→newest. A 4-team group plays 3 matchdays of two
  // games each, chronologically grouped, so matchday = pair index + 1 (the two MD2
  // games can fall on different calendar dates, so day-of-month won't do).
  const fixtures = useMemo(
    () =>
      matches
        .filter((m) => m.stage === 'group' && m.group === group && m.homeCode && m.awayCode)
        .sort((a, b) => kickoffMs(a) - kickoffMs(b)),
    [matches, group],
  )
  const matchdayById = useMemo(
    () => Object.fromEntries(fixtures.map((m, i) => [m.id, Math.floor(i / 2) + 1])),
    [fixtures],
  )

  return (
    <div className="relative z-10 mx-auto max-w-5xl animate-fade-in text-ink">
      <h1 className="font-grotesk text-3xl font-bold tracking-tight">World Cup</h1>
      <p className="mt-1 text-sm text-muted">{homeTeam ? `Following ${homeTeam.name} · Group ${homeTeam.group}` : '2026'}</p>

      <div className="mt-6 max-w-xl">
        <GroupSlider value={group} onChange={(g) => { setGroup(g); setOpenId(null) }} />
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* standings */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Group {group}</h2>
          <div className={cn('overflow-hidden rounded-[20px]', GLASS)}>
            <div className={cn(STAND_COLS, 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint')}>
              <span />
              <span>Team</span>
              <span className="text-center">GP</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center">GD</span>
              <span className="text-center">PTS</span>
            </div>
            {standings.map((row, i) => {
              const t = teamByCode[row.code]
              const isHome = row.code === homeCode
              const advancing = i < 2
              const eliminated = i === standings.length - 1 && row.played > 0
              return (
                <div
                  key={row.code}
                  className={cn(
                    STAND_COLS,
                    'border-t px-4 py-3 text-[15px]',
                    i === 2 ? 'border-black/[0.12] dark:border-white/15' : 'border-black/5 dark:border-white/[0.07]',
                    isHome && 'bg-team-soft',
                  )}
                >
                  <span className="flex items-center gap-1 tnum">
                    <span className={cn('w-2 text-[10px]', advancing ? 'text-emerald-500' : eliminated ? 'text-red-400' : 'text-transparent')}>{advancing ? '▲' : '▼'}</span>
                    <span className={cn(advancing ? 'font-semibold text-ink' : 'text-faint')}>{row.rank}</span>
                  </span>
                  <span className="flex items-center gap-2.5 truncate">
                    <Flag code={row.code} size={24} />
                    <span className={cn('truncate font-medium', isHome ? 'text-team' : 'text-ink')}>{t?.name ?? row.code}</span>
                  </span>
                  <span className="text-center tnum text-muted">{row.played}</span>
                  <span className="text-center tnum text-muted">{row.win}</span>
                  <span className="text-center tnum text-muted">{row.draw}</span>
                  <span className="text-center tnum text-muted">{row.loss}</span>
                  <span className="text-center tnum text-muted">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <span className="text-center font-grotesk font-bold tnum text-ink">{row.points}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2.5 px-1 text-2xs text-faint">Top two advance, plus the eight best third-placed teams.</p>
        </section>

        {/* fixtures & results */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Fixtures &amp; results</h2>
          <div className={cn('overflow-hidden rounded-[20px]', GLASS)}>
            {fixtures.map((m, i) => {
              const open = openId === m.id
              return (
                <div key={m.id} className={cn(i > 0 && 'border-t border-black/5 dark:border-white/[0.07]')}>
                  <FixtureRow
                    m={m}
                    matchday={matchdayById[m.id]}
                    open={open}
                    now={now}
                    lastUpdated={lastUpdated}
                    onToggle={() => m.status === 'finished' && setOpenId((c) => (c === m.id ? null : m.id))}
                  />
                  {open && (
                    <div className="animate-fade-in border-t border-black/5 dark:border-white/[0.07]">
                      <MatchReport match={m} apiStatus={apiStatus} healthKnown={healthKnown} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function FixtureRow({
  m,
  matchday,
  open,
  now,
  lastUpdated,
  onToggle,
}: {
  m: Match
  matchday: number
  open: boolean
  now: number
  lastUpdated: number | null
  onToggle: () => void
}) {
  const home = m.homeCode ? teamByCode[m.homeCode] : null
  const away = m.awayCode ? teamByCode[m.awayCode] : null
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const showScore = finished || live
  const hWin = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const aWin = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0)

  return (
    <button
      onClick={onToggle}
      className={cn(
        'block w-full px-4 py-5 text-center transition-colors',
        finished ? 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : 'cursor-default',
        (live || open) && 'bg-team-soft',
      )}
    >
      <p className="mb-3.5 text-2xs font-medium uppercase tracking-label text-faint">
        {m.stage === 'group' ? `Group Stage · Match ${matchday}` : m.stage}
      </p>

      {/* Apple-Sports row: flags pushed to the edges, big scores inboard, the
          live clock / FT / kickoff time dead-centre, team names under the flags. */}
      <div className="grid items-center gap-x-3 sm:gap-x-5" style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto auto minmax(0,1fr)' }}>
        <div className="col-start-1 row-start-1 flex justify-center"><Flag code={m.homeCode} size={40} /></div>
        <span className={cn('col-start-2 row-start-1 min-w-[1.25rem] text-center font-grotesk text-4xl font-bold leading-none tnum', !showScore ? 'text-transparent' : aWin ? 'text-faint' : 'text-ink')}>
          {showScore ? m.homeScore : 0}
        </span>

        <div className="col-start-3 row-start-1 flex min-w-[3.5rem] flex-col items-center justify-center gap-1 px-1">
          {live ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-live-pulse" />
              <span className="font-grotesk text-xl font-bold tnum text-ink">{liveClock(m.minute, lastUpdated, now)}</span>
            </>
          ) : finished ? (
            <span className="text-2xs font-semibold uppercase tracking-label text-faint">FT</span>
          ) : (
            <>
              <span className="font-grotesk text-base font-semibold tnum text-ink">{timeLabel(m)}</span>
              <span className="text-2xs text-faint">{dateLabel(m)}</span>
            </>
          )}
        </div>

        <span className={cn('col-start-4 row-start-1 min-w-[1.25rem] text-center font-grotesk text-4xl font-bold leading-none tnum', !showScore ? 'text-transparent' : hWin ? 'text-faint' : 'text-ink')}>
          {showScore ? m.awayScore : 0}
        </span>
        <div className="col-start-5 row-start-1 flex justify-center"><Flag code={m.awayCode} size={40} /></div>

        <span className="col-start-1 row-start-2 mt-2.5 truncate text-center text-sm font-medium text-muted">{home?.name ?? m.homeCode}</span>
        <span className="col-start-5 row-start-2 mt-2.5 truncate text-center text-sm font-medium text-muted">{away?.name ?? m.awayCode}</span>
      </div>
    </button>
  )
}

function GroupSlider({ value, onChange }: { value: GroupId; onChange: (g: GroupId) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState(false)
  const n = GROUP_IDS.length
  const idx = Math.max(0, (GROUP_IDS as readonly string[]).indexOf(value))

  const pickAt = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 4
    const inner = r.width - pad * 2
    const rel = Math.max(0, Math.min(inner - 1, clientX - r.left - pad))
    const i = Math.max(0, Math.min(n - 1, Math.floor((rel / inner) * n)))
    if (GROUP_IDS[i] !== value) onChange(GROUP_IDS[i])
  }

  return (
    <div
      ref={ref}
      className={cn('relative grid touch-none select-none rounded-pill p-1', GLASS)}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}
      onPointerDown={(e) => { setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); pickAt(e.clientX) }}
      onPointerMove={(e) => drag && pickAt(e.clientX)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <div
        className="pointer-events-none absolute bottom-1 top-1 rounded-full transition-[left] duration-300 ease-calm"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          left: `calc(0.25rem + (100% - 0.5rem) * ${idx} / ${n})`,
          background: 'var(--team-pure)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.3)',
        }}
      />
      {GROUP_IDS.map((g, i) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={cn('relative z-10 h-9 rounded-full font-grotesk text-sm font-bold transition-colors duration-200', i === idx ? 'text-team-ink' : 'text-muted hover:text-ink')}
        >
          {g}
        </button>
      ))}
    </div>
  )
}
