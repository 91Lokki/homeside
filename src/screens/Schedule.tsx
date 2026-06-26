import { useMemo, useState } from 'react'
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

      {/* smooth group switcher */}
      <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className={cn('inline-flex gap-1 rounded-pill p-1', GLASS)}>
          {GROUP_IDS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                'h-9 w-9 shrink-0 rounded-full font-grotesk text-sm font-bold transition-all duration-300 ease-calm',
                g === group ? 'scale-105 text-team-ink' : 'text-muted hover:text-ink',
              )}
              style={g === group ? { background: 'var(--team-pure)' } : undefined}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        {/* standings — left */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Group {group}</h2>
          <div className={cn('overflow-hidden rounded-[20px]', GLASS)}>
            <div className="grid grid-cols-[1.5rem_1fr_1.5rem_1.5rem_2rem_1.2rem] items-center gap-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
              <span />
              <span>Team</span>
              <span className="text-center">P</span>
              <span className="text-center">GD</span>
              <span className="text-center">Pts</span>
              <span />
            </div>
            {standings.map((row, i) => {
              const t = teamByCode[row.code]
              const isHome = row.code === homeCode
              const advancing = i < 2
              return (
                <div key={row.code} className={cn('grid grid-cols-[1.5rem_1fr_1.5rem_1.5rem_2rem_1.2rem] items-center gap-1 border-t border-black/5 px-4 py-2.5 text-sm dark:border-white/8', isHome && 'bg-team-soft')}>
                  <span className={cn('text-center text-xs tnum', advancing ? 'font-semibold text-ink' : 'text-faint')}>{row.rank}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <Flag code={row.code} size={22} />
                    <span className={cn('truncate font-medium', isHome ? 'text-team' : 'text-ink')}>{t?.name ?? row.code}</span>
                  </span>
                  <span className="text-center tnum text-muted">{row.played}</span>
                  <span className="text-center tnum text-muted">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <span className="text-center font-grotesk font-bold tnum">{row.points}</span>
                  <span className="flex justify-center">{advancing && row.played > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}</span>
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
      className={cn('flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors sm:px-4', finished ? 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : 'cursor-default', live && 'bg-team-soft')}
    >
      <span className="w-12 shrink-0 text-2xs font-semibold">
        {finished ? <span className="text-faint">FT</span> : live ? <span className="inline-flex items-center gap-1 text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-live-pulse" />{m.minute ? `${m.minute}'` : 'Live'}</span> : <span className="text-muted">{timeLabel(m)}</span>}
      </span>

      <span className="flex flex-1 items-center justify-end gap-2.5 truncate">
        <span className={cn('truncate text-[15px]', aWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{home?.name ?? m.homeCode}</span>
        <Flag code={m.homeCode} size={26} />
      </span>

      <span className="flex shrink-0 items-center gap-1.5 font-grotesk text-xl font-bold tnum">
        {finished || live ? (
          <>
            <span className={cn(aWin && 'text-faint')}>{m.homeScore}</span>
            <span className="text-faint">-</span>
            <span className={cn(hWin && 'text-faint')}>{m.awayScore}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-faint">vs</span>
        )}
      </span>

      <span className="flex flex-1 items-center gap-2.5 truncate">
        <Flag code={m.awayCode} size={26} />
        <span className={cn('truncate text-[15px]', hWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{away?.name ?? m.awayCode}</span>
      </span>
    </button>
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
