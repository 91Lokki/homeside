import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { ApiStatus } from '@/lib/api'
import type { Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { MatchReport } from '@/components/MatchReport'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const STAGE_LABEL = (m: Match): string => {
  switch (m.stage) {
    case 'group': return `Group ${m.group ?? ''}`.trim()
    case 'R32': return 'Round of 32'
    case 'R16': return 'Round of 16'
    case 'QF': return 'Quarter-final'
    case 'SF': return 'Semi-final'
    case 'F3': return 'Third place'
    case 'F': return 'Final'
    default: return ''
  }
}

const kickoffMs = (m: Match) => new Date(m.kickoff).getTime()
const startOfDay = (ms: number) => {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
const dayLabel = (ms: number) => new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
  const [openMatch, setOpenMatch] = useState<Match | null>(null)
  const today = useMemo(() => startOfDay(Date.now()), [])

  const real = useMemo(() => matches.filter((m) => m.homeCode && m.awayCode), [matches])

  // Group by day; show today + upcoming first (ascending), then past results (most recent first).
  const days = useMemo(() => {
    const map = new Map<number, Match[]>()
    for (const m of real) {
      const key = startOfDay(kickoffMs(m))
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    for (const arr of map.values()) arr.sort((a, b) => kickoffMs(a) - kickoffMs(b))
    const keys = [...map.keys()]
    const future = keys.filter((k) => k >= today).sort((a, b) => a - b)
    const past = keys.filter((k) => k < today).sort((a, b) => b - a)
    return [...future, ...past].map((k) => ({ key: k, label: dayLabel(k), matches: map.get(k)! }))
  }, [real, today])

  const group = homeTeam?.group
  const groupCodes = useMemo(() => (group ? TEAMS.filter((t) => t.group === group).map((t) => t.code) : []), [group])
  const standings = useMemo(() => (group ? computeGroupStandings(matches, group, groupCodes) : []), [matches, group, groupCodes])

  return (
    <div className="relative z-10 animate-fade-in text-white">
      <h1 className="font-grotesk text-3xl font-bold tracking-tight">World Cup</h1>
      <p className="mt-1 text-sm text-white/60">{group ? `Following ${homeTeam?.name} · Group ${group}` : '2026'}</p>

      <div className="mt-7 space-y-8">
        {days.map((day) => {
          const isToday = day.key === today
          return (
            <section key={day.key}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-grotesk text-lg font-bold">{isToday ? 'Today' : day.label}</h2>
                {isToday && <span className="text-2xs text-white/45">{day.label}</span>}
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {day.matches.map((m) => (
                  <MatchCard key={m.id} m={m} homeCode={homeCode} allMatches={matches} onOpen={() => m.status === 'finished' && setOpenMatch(m)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {standings.length > 0 && (
        <section className="mt-9 max-w-2xl">
          <h2 className="mb-3 font-grotesk text-lg font-bold">Group {group}</h2>
          <div className="overflow-hidden rounded-[20px] bg-white/[0.06] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
            <div className="grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem_1.4rem] items-center gap-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
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
                <div key={row.code} className={cn('grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem_1.4rem] items-center gap-1 border-t border-white/8 px-4 py-2.5 text-sm', isHome && 'bg-white/[0.06]')}>
                  <span className={cn('text-center text-xs tnum', advancing ? 'font-semibold text-white' : 'text-white/45')}>{row.rank}</span>
                  <span className="flex items-center gap-2.5 truncate">
                    <Flag code={row.code} size={22} />
                    <span className={cn('truncate font-medium', isHome ? 'text-white' : 'text-white/85')}>{t?.name ?? row.code}</span>
                  </span>
                  <span className="text-center tnum text-white/55">{row.played}</span>
                  <span className="text-center tnum text-white/55">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <span className="text-center font-grotesk font-bold tnum">{row.points}</span>
                  <span className="flex justify-center">{advancing && row.played > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {openMatch && (
        <MatchModal match={openMatch} homeCode={homeCode} apiStatus={apiStatus} healthKnown={healthKnown} onClose={() => setOpenMatch(null)} />
      )}
    </div>
  )
}

function MatchCard({ m, homeCode, allMatches, onOpen }: { m: Match; homeCode: string | null; allMatches: Match[]; onOpen: () => void }) {
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const hWin = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const aWin = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0)

  const status = finished ? 'Final' : live ? (m.minute ? `${m.minute}'` : 'Live') : timeLabel(m)

  return (
    <button
      onClick={onOpen}
      className={cn(
        'rounded-[18px] bg-white/[0.06] p-3.5 text-left ring-1 ring-inset ring-white/10 backdrop-blur-xl transition',
        finished ? 'cursor-pointer hover:bg-white/[0.1]' : 'cursor-default',
        live && 'ring-red-500/40',
      )}
    >
      <div className="mb-2.5 flex items-center justify-between text-[11px]">
        <span className="text-white/45">{STAGE_LABEL(m)}</span>
        <span className={cn('font-semibold', live ? 'text-red-400' : finished ? 'text-white/55' : 'text-white')}>
          {live && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle animate-live-pulse" />}
          {status}
        </span>
      </div>
      <TeamRow code={m.homeCode} finished={finished} score={m.homeScore} dim={aWin} record={recordStr(allMatches, m.homeCode!)} star={m.homeCode === homeCode} />
      <div className="my-1.5 h-px bg-white/8" />
      <TeamRow code={m.awayCode} finished={finished} score={m.awayScore} dim={hWin} record={recordStr(allMatches, m.awayCode!)} star={m.awayCode === homeCode} />
    </button>
  )
}

function TeamRow({ code, finished, score, dim, record, star }: { code?: string | null; finished: boolean; score: number | null; dim: boolean; record: string; star: boolean }) {
  const t = code ? teamByCode[code] : null
  return (
    <div className="flex items-center gap-2.5">
      <Flag code={code} size={26} />
      <span className={cn('flex-1 truncate text-[15px]', dim ? 'font-medium text-white/55' : 'font-semibold text-white')}>{t?.name ?? code}</span>
      {star && <span className="text-[10px] text-white/55">★</span>}
      {finished ? (
        <span className={cn('font-grotesk text-xl font-bold tnum', dim ? 'text-white/35' : 'text-white')}>{score ?? '–'}</span>
      ) : (
        <span className="font-grotesk text-sm font-semibold tnum text-white/45">{record}</span>
      )}
    </div>
  )
}

function MatchModal({ match, homeCode, apiStatus, healthKnown, onClose }: { match: Match; homeCode: string | null; apiStatus: ApiStatus; healthKnown: boolean; onClose: () => void }) {
  const home = match.homeCode ? teamByCode[match.homeCode] : null
  const away = match.awayCode ? teamByCode[match.awayCode] : null
  const hWin = (match.homeScore ?? 0) > (match.awayScore ?? 0)
  const aWin = (match.awayScore ?? 0) > (match.homeScore ?? 0)
  const homeColor = home?.color ?? '#444'
  const awayColor = away?.color ?? '#444'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/12"
        style={{ background: `linear-gradient(110deg, color-mix(in srgb, ${homeColor} 32%, #0c0c14), #0b0b12 50%, color-mix(in srgb, ${awayColor} 32%, #0c0c14))` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-3.5 top-3.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 ring-1 ring-inset ring-white/15 hover:text-white">
          <X size={15} />
        </button>

        <div className="px-6 pt-6 text-center text-white">
          <p className="text-2xs uppercase tracking-label text-white/55">FIFA World Cup 2026 · {STAGE_LABEL(match)}</p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <span className={cn('font-grotesk text-5xl font-bold tnum', aWin ? 'text-white/40' : 'text-white')}>{match.homeScore}</span>
            <span className="font-grotesk text-sm font-semibold text-white/60">Final</span>
            <span className={cn('font-grotesk text-5xl font-bold tnum', hWin ? 'text-white/40' : 'text-white')}>{match.awayScore}</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-1.5">
              <Flag code={match.homeCode} size={40} />
              <span className="text-sm font-semibold">{home?.name}</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Flag code={match.awayCode} size={40} />
              <span className="text-sm font-semibold">{away?.name}</span>
            </div>
          </div>
        </div>

        <div className="mt-2">
          <MatchReport match={match} accentCode={homeCode} apiStatus={apiStatus} healthKnown={healthKnown} />
        </div>
      </div>
    </div>
  )
}
