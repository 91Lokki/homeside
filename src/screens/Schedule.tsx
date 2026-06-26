import { useMemo, useState } from 'react'
import { TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { ApiStatus } from '@/lib/api'
import type { Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { MatchReport } from '@/components/MatchReport'
import { localDay } from '@/lib/time'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

type Bucket = 'results' | 'today' | 'upcoming'

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
  const startOfToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])
  const startOfTomorrow = startOfToday + 86_400_000

  const real = useMemo(() => matches.filter((m) => m.homeCode && m.awayCode), [matches])
  const todayCount = real.filter((m) => kickoffMs(m) >= startOfToday && kickoffMs(m) < startOfTomorrow).length
  const [bucket, setBucket] = useState<Bucket>(todayCount > 0 ? 'today' : 'upcoming')
  const [openId, setOpenId] = useState<string | null>(null)

  const list = useMemo(() => {
    const inBucket = (m: Match) => {
      const k = kickoffMs(m)
      if (bucket === 'today') return k >= startOfToday && k < startOfTomorrow
      if (bucket === 'upcoming') return k >= startOfTomorrow && m.status !== 'finished'
      return m.status === 'finished' && k < startOfToday
    }
    const filtered = real.filter(inBucket)
    filtered.sort((a, b) => (bucket === 'results' ? kickoffMs(b) - kickoffMs(a) : kickoffMs(a) - kickoffMs(b)))
    return filtered
  }, [real, bucket, startOfToday, startOfTomorrow])

  const byDay = useMemo(() => {
    const map = new Map<string, Match[]>()
    for (const m of list) {
      const day = localDay(m.kickoff)
      ;(map.get(day) ?? map.set(day, []).get(day)!).push(m)
    }
    return [...map.entries()]
  }, [list])

  const group = homeTeam?.group
  const groupCodes = useMemo(() => (group ? TEAMS.filter((t) => t.group === group).map((t) => t.code) : []), [group])
  const standings = useMemo(
    () => (group ? computeGroupStandings(matches, group, groupCodes) : []),
    [matches, group, groupCodes],
  )

  return (
    <div className="animate-fade-in text-white">
      {/* full-bleed team-colour gradient behind everything (glass nav sits on top) */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--team-pure) 42%, #0b0b14) 0%, #0a0a12 50%, #08080c 100%)' }}
      />

      <div className="relative z-10 mx-auto max-w-md">
        <h1 className="font-grotesk text-3xl font-bold tracking-tight">World Cup</h1>
        <p className="mt-1 text-sm text-white/60">{group ? `Following ${homeTeam?.name} · Group ${group}` : '2026'}</p>

        {/* segmented tabs */}
        <div className="mt-5 flex items-center justify-between border-b border-white/12 pb-3">
          {(['results', 'today', 'upcoming'] as Bucket[]).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              className={cn('flex-1 text-center text-[15px] font-semibold capitalize transition-colors', bucket === b ? 'text-white' : 'text-white/45')}
            >
              {b === 'results' ? 'Results' : b}
            </button>
          ))}
        </div>

        {/* feed */}
        <div className="mt-4 space-y-6">
          {byDay.length === 0 ? (
            <p className="rounded-[20px] bg-white/[0.06] px-5 py-8 text-center text-sm text-white/50">No matches in this view.</p>
          ) : (
            byDay.map(([day, dayMatches]) => (
              <div key={day}>
                <p className="mb-2 text-center text-[13px] font-semibold text-white/80">{day}</p>
                <div className="overflow-hidden rounded-[22px] bg-white/[0.06] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
                  {dayMatches.map((m, i) => (
                    <div key={m.id}>
                      {i > 0 && <div className="ml-4 border-t border-white/8" />}
                      <MatchRow
                        m={m}
                        homeCode={homeCode}
                        allMatches={matches}
                        open={openId === m.id}
                        onToggle={() => setOpenId((cur) => (cur === m.id ? null : m.id))}
                        apiStatus={apiStatus}
                        healthKnown={healthKnown}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* standings of the followed team's group */}
        {standings.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-center text-[15px] font-bold">Group {group}</p>
            <div className="overflow-hidden rounded-[22px] bg-white/[0.06] ring-1 ring-inset ring-white/10 backdrop-blur-xl">
              <div className="grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem_2rem] items-center gap-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
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
                  <div
                    key={row.code}
                    className={cn('grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem_2rem] items-center gap-1 border-t border-white/8 px-4 py-2.5 text-sm', isHome && 'bg-white/[0.06]')}
                  >
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
            <p className="mt-2 px-1 text-2xs text-white/45">Top two of each group advance, plus the eight best third-placed teams.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreNum({ value, dim }: { value: number | null; dim: boolean }) {
  return (
    <span className={cn('font-grotesk text-[32px] font-bold leading-none tnum sm:text-[34px]', dim ? 'text-white/35' : 'text-white')}>
      {value ?? '–'}
    </span>
  )
}

function TeamCell({ code, name, starred }: { code?: string | null; name?: string; starred?: boolean }) {
  return (
    <div className="flex w-[74px] flex-col items-center gap-1.5">
      <div className="relative">
        <Flag code={code} size={34} />
        {starred && <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-[11px] text-white/70">★</span>}
      </div>
      <span className="w-full truncate text-center text-[11px] font-medium text-white/70">{name ?? code ?? '—'}</span>
    </div>
  )
}

function MatchRow({
  m,
  homeCode,
  allMatches,
  open,
  onToggle,
  apiStatus,
  healthKnown,
}: {
  m: Match
  homeCode: string | null
  allMatches: Match[]
  open: boolean
  onToggle: () => void
  apiStatus: ApiStatus
  healthKnown: boolean
}) {
  const home = m.homeCode ? teamByCode[m.homeCode] : null
  const away = m.awayCode ? teamByCode[m.awayCode] : null
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const hWin = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const aWin = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0)
  const expandable = finished

  const center =
    finished ? 'Final' : live ? (m.minute ? `${m.minute}'` : 'Live') : new Date(m.kickoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div className={cn(live && 'bg-white/[0.05]')}>
      <button
        onClick={() => expandable && onToggle()}
        className={cn('grid w-full items-center px-3 py-3.5 sm:px-4', expandable && 'active:bg-white/[0.04]')}
        style={{ gridTemplateColumns: '74px 1fr auto 1fr 74px' }}
      >
        <TeamCell code={m.homeCode} name={home?.name} starred={m.homeCode === homeCode} />

        <div className="flex justify-end pr-2 sm:pr-4">
          {finished ? <ScoreNum value={m.homeScore} dim={aWin} /> : <span className="whitespace-nowrap font-grotesk text-[15px] font-semibold text-white/55 tnum">{recordStr(allMatches, m.homeCode!)}</span>}
        </div>

        <div className="min-w-[78px] px-1 text-center">
          <p className="text-[11px] text-white/40">{STAGE_LABEL(m)}</p>
          <p className={cn('mt-0.5 font-grotesk text-[15px] font-bold', live ? 'text-red-400' : 'text-white')}>
            {live && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500 align-middle animate-live-pulse" />}
            {center}
          </p>
        </div>

        <div className="flex justify-start pl-2 sm:pl-4">
          {finished ? <ScoreNum value={m.awayScore} dim={hWin} /> : <span className="whitespace-nowrap font-grotesk text-[15px] font-semibold text-white/55 tnum">{recordStr(allMatches, m.awayCode!)}</span>}
        </div>

        <TeamCell code={m.awayCode} name={away?.name} starred={m.awayCode === homeCode} />
      </button>

      {open && expandable && (
        <div className="border-t border-white/10 bg-black/20">
          <MatchReport match={m} accentCode={homeCode} apiStatus={apiStatus} healthKnown={healthKnown} />
        </div>
      )}
    </div>
  )
}
