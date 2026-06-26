import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { ApiStatus } from '@/lib/api'
import type { GroupId, Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { MatchReport } from '@/components/MatchReport'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const GLASS = 'bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10'
const STAND_COLS = 'grid grid-cols-[1.9rem_minmax(0,1fr)_1.4rem_1.3rem_1.3rem_1.3rem_2rem_2rem] items-center gap-1'
const FIX_COLS = 'grid grid-cols-[3rem_minmax(0,1fr)_auto_4.25rem_auto_minmax(0,1fr)] items-center gap-2.5'
const kickoffMs = (m: Match) => new Date(m.kickoff).getTime()
const dayLabel = (m: Match) => new Date(m.kickoff).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const timeLabel = (m: Match) => new Date(m.kickoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function recordStr(matches: Match[], code: string): string {
  let w = 0, d = 0, l = 0
  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null) continue
    if (m.homeCode !== code && m.awayCode !== code) continue
    const gf = m.homeCode === code ? m.homeScore : m.awayScore
    const ga = m.homeCode === code ? m.awayScore : m.homeScore
    if (gf > ga) w++
    else if (gf < ga) l++
    else d++
  }
  return `${w}-${d}-${l}`
}

export function Schedule() {
  const { matches, homeCode, homeTeam, apiStatus, healthKnown } = useApp()
  const [group, setGroup] = useState<GroupId>(homeTeam?.group ?? 'A')
  const [openMatch, setOpenMatch] = useState<Match | null>(null)

  const groupCodes = useMemo(() => TEAMS.filter((t) => t.group === group).map((t) => t.code), [group])
  const standings = useMemo(() => computeGroupStandings(matches, group, groupCodes), [matches, group, groupCodes])

  // The group's matches, oldest at the top → newest at the bottom, grouped by day.
  const byDay = useMemo(() => {
    const fixtures = matches
      .filter((m) => m.stage === 'group' && m.group === group && m.homeCode && m.awayCode)
      .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    const out: { label: string; matches: Match[] }[] = []
    for (const m of fixtures) {
      const label = dayLabel(m)
      const last = out[out.length - 1]
      if (last && last.label === label) last.matches.push(m)
      else out.push({ label, matches: [m] })
    }
    return out
  }, [matches, group])

  return (
    <div className="relative z-10 animate-fade-in text-ink">
      <h1 className="font-grotesk text-3xl font-bold tracking-tight">World Cup</h1>
      <p className="mt-1 text-sm text-muted">{homeTeam ? `Following ${homeTeam.name} · Group ${homeTeam.group}` : '2026'}</p>

      <div className="mt-6 max-w-xl">
        <GroupSlider value={group} onChange={setGroup} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        {/* standings — left */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Group {group}</h2>
          <div className={cn('overflow-hidden rounded-[20px] p-1.5', GLASS)}>
            <div className={cn(STAND_COLS, 'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint')}>
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
                    'rounded-[12px] px-3 py-2.5 text-[15px]',
                    i === 2 && 'mt-1.5 border-t-2 border-black/15 pt-3 dark:border-white/15',
                    isHome && 'bg-team-soft',
                  )}
                >
                  <span className="flex items-center gap-0.5 tnum">
                    <span className={cn('w-2.5 text-xs', advancing ? 'text-emerald-500' : eliminated ? 'text-red-400' : 'text-transparent')}>{advancing ? '▸' : '–'}</span>
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
          <p className="mt-2 px-1 text-2xs text-faint">Top two advance, plus the eight best third-placed teams.</p>
        </section>

        {/* fixtures & results — right */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Fixtures &amp; results</h2>
          <div className="space-y-5">
            {byDay.map((day) => (
              <div key={day.label}>
                <p className="mb-2 ml-1 text-2xs font-semibold uppercase tracking-label text-faint">{day.label}</p>
                <div className={cn('divide-y divide-black/5 overflow-hidden rounded-[20px] dark:divide-white/8', GLASS)}>
                  {day.matches.map((m) => (
                    <FixtureRow key={m.id} m={m} onOpen={() => m.status === 'finished' && setOpenMatch(m)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {openMatch && (
        <MatchModal match={openMatch} allMatches={matches} apiStatus={apiStatus} healthKnown={healthKnown} onClose={() => setOpenMatch(null)} />
      )}
    </div>
  )
}

function FixtureRow({ m, onOpen }: { m: Match; onOpen: () => void }) {
  const home = m.homeCode ? teamByCode[m.homeCode] : null
  const away = m.awayCode ? teamByCode[m.awayCode] : null
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const hWin = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const aWin = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0)

  return (
    <button
      onClick={onOpen}
      className={cn(FIX_COLS, 'w-full px-3.5 py-3 text-left transition-colors sm:px-4', finished ? 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : 'cursor-default', live && 'bg-team-soft')}
    >
      <span className="text-2xs font-semibold">
        {finished ? <span className="text-faint">FT</span> : live ? <span className="inline-flex items-center gap-1 text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-live-pulse" />{m.minute ? `${m.minute}'` : 'Live'}</span> : <span className="text-muted">{timeLabel(m)}</span>}
      </span>

      <span className={cn('truncate text-right text-[15px]', aWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{home?.name ?? m.homeCode}</span>
      <Flag code={m.homeCode} size={26} />

      <span className="flex items-center justify-center gap-1.5 font-grotesk text-xl font-bold tnum">
        {finished || live ? (
          <>
            <span className={cn('w-4 text-right', aWin && 'text-faint')}>{m.homeScore}</span>
            <span className="text-faint">-</span>
            <span className={cn('w-4 text-left', hWin && 'text-faint')}>{m.awayScore}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-faint">vs</span>
        )}
      </span>

      <Flag code={m.awayCode} size={26} />
      <span className={cn('truncate text-[15px]', hWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{away?.name ?? m.awayCode}</span>
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

function MatchModal({ match, allMatches, apiStatus, healthKnown, onClose }: { match: Match; allMatches: Match[]; apiStatus: ApiStatus; healthKnown: boolean; onClose: () => void }) {
  const home = match.homeCode ? teamByCode[match.homeCode] : null
  const away = match.awayCode ? teamByCode[match.awayCode] : null
  const hWin = (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const aWin = (match.awayScore ?? 0) > (match.homeScore ?? 0)
  const homeColor = home?.color ?? '#444'
  const awayColor = away?.color ?? '#444'
  const STAGE = match.stage === 'group' ? `Group Stage · Group ${match.group}` : 'Knockout'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[26px] ring-1 ring-inset ring-white/12"
        style={{ background: `linear-gradient(140deg, color-mix(in srgb, ${homeColor} 38%, #0c0c14), #0b0b12 50%, color-mix(in srgb, ${awayColor} 38%, #0c0c14))` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3.5 top-3.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/12 text-white/75 ring-1 ring-inset ring-white/15 hover:text-white">
          <X size={15} />
        </button>

        <div className="px-6 pt-6 text-center text-white">
          <p className="text-2xs uppercase tracking-label text-white/55">FIFA World Cup 2026 · {STAGE}</p>
          <div className="mt-3 flex items-center justify-center gap-6">
            <span className={cn('font-grotesk text-5xl font-bold tnum', aWin ? 'text-white/40' : 'text-white')}>{match.homeScore}</span>
            <span className="font-grotesk text-sm font-semibold text-white/60">Final</span>
            <span className={cn('font-grotesk text-5xl font-bold tnum', hWin ? 'text-white/40' : 'text-white')}>{match.awayScore}</span>
          </div>
          <div className="mt-3 flex items-start justify-center gap-10">
            {[match.homeCode, match.awayCode].map((code, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Flag code={code} size={40} />
                <span className="text-sm font-semibold">{(code === match.homeCode ? home : away)?.name ?? code}</span>
                <span className="text-2xs tnum text-white/55">{recordStr(allMatches, code!)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* the report renders in dark context inside the gradient */}
        <div className="dark mt-3">
          <MatchReport match={match} apiStatus={apiStatus} healthKnown={healthKnown} />
        </div>
      </div>
    </div>
  )
}
