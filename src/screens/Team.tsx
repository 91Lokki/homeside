import { useMemo } from 'react'
import { finishedFor } from '@/domain/record'
import { moodFor } from '@/domain/mood'
import { AXIS_LABEL, computeRatings, type AxisKey } from '@/domain/ratings'
import type { TeamMatchStats } from '@/lib/api'
import { liveDataNote } from '@/lib/apiCopy'
import { useMatchDetails } from '@/lib/matchData'
import { GROUP_STATS } from '@/data/teamStats'
import type { Match } from '@/domain/types'
import { Mascot } from '@/components/mascot/Mascot'
import { RadarChart } from '@/components/RadarChart'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const ORDER: AxisKey[] = ['attack', 'finishing', 'possession', 'defense', 'creativity', 'discipline']

/** Fallback stats from a real final score alone (Attack/Defense only) — used when
 *  no box score is available; the other axes stay null (never fabricated). */
function resultStat(m: Match, code: string): TeamMatchStats | null {
  const gf = m.homeCode === code ? m.homeScore : m.awayScore
  const ga = m.homeCode === code ? m.awayScore : m.homeScore
  if (gf == null || ga == null) return null
  return { code, goalsFor: gf, goalsAgainst: ga, cleanSheet: ga === 0, possession: null, shots: null, shotsOnTarget: null, passPct: null, crosses: null, corners: null, tackles: null, interceptions: null, clearances: null, fouls: null, yellow: null, red: null, gkSaves: null }
}

export function Team() {
  const { homeTeam, matches, apiStatus, healthKnown } = useApp()
  const code = homeTeam?.code ?? ''

  const finished = useMemo(() => (code ? finishedFor(matches, code) : []), [matches, code])

  // Knockout box scores are the only ones that cost an API call; the group stage
  // is served from the static ESPN bake below.
  const fixtureIds = useMemo(
    () => finished.filter((m) => m.stage !== 'group').map((m) => m.apiFixtureId).filter((x): x is number => typeof x === 'number'),
    [finished],
  )
  const { details, loading } = useMatchDetails(fixtureIds)

  // Radar inputs, all from REAL data, never fabricated:
  //  • group stage → real ESPN box scores (static, ZERO API key/quota), with the
  //    seed's final scores as a gf/ga-only fallback if a match isn't baked yet
  //  • knockouts → live box score when present, else the seed score
  const stats = useMemo<TeamMatchStats[]>(() => {
    const baked = GROUP_STATS[code]
    const group: TeamMatchStats[] = baked?.length
      ? baked
      : (finished.filter((m) => m.stage === 'group').map((m) => resultStat(m, code)).filter(Boolean) as TeamMatchStats[])
    const ko: TeamMatchStats[] = finished
      .filter((m) => m.stage !== 'group')
      .map((m) => (m.apiFixtureId ? details[m.apiFixtureId]?.teamStats[code] : undefined) ?? resultStat(m, code))
      .filter(Boolean) as TeamMatchStats[]
    return [...group, ...ko]
  }, [finished, details, code])
  const ratings = useMemo(() => computeRatings(stats), [stats])

  if (!homeTeam) return null
  const mood = moodFor(matches, code).mood
  const noData = stats.length === 0

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Label>Ability card · Group {homeTeam.group}</Label>
        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="font-grotesk text-4xl font-semibold tracking-tight">{homeTeam.name}</h1>
          {homeTeam.nameTC && <span className="font-tc text-base text-faint">{homeTeam.nameTC}</span>}
        </div>
      </div>

      {noData ? (
        <div className="rounded-[22px] border bg-surface p-6 text-sm text-muted">
          The ability card is built from {homeTeam.name}&rsquo;s real match stats.{' '}
          {!healthKnown
            ? 'Checking the live data feed…'
            : apiStatus === 'ok'
              ? 'It appears once the team has played and the match is in the live data feed.'
              : liveDataNote(apiStatus)}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)]">
          {/* radar card with team-colour wash */}
          <section className="relative flex flex-col items-center overflow-hidden rounded-[22px] border bg-surface px-6 pb-6 pt-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44" style={{ background: 'linear-gradient(180deg, var(--team-soft), transparent)' }} />
            <div className="absolute right-4 top-4 animate-breathe">
              <Mascot code={code} color={homeTeam.color} color2={homeTeam.color2} symbol={homeTeam.symbol} mood={mood} size={60} />
            </div>
            <RadarChart ratings={ratings} color={homeTeam.color} />
            <p className="mt-1 text-center font-grotesk text-2xl font-semibold tracking-tight text-team">{ratings.playstyle}</p>
            {ratings.summary && <p className="mt-1.5 max-w-[34ch] text-center text-sm leading-snug text-muted">{ratings.summary}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xs text-faint">
              <span>Real stats · {ratings.matchesUsed} {ratings.matchesUsed === 1 ? 'match' : 'matches'}</span>
              {loading && <span>· updating…</span>}
              {ratings.provisional && <span className="rounded-pill bg-sunken px-2 py-0.5 font-medium text-muted">provisional</span>}
            </div>
          </section>

          {/* rating bars — Apple-Sports style */}
          <section className="rounded-[22px] border bg-surface p-5 sm:p-6">
            <div className="space-y-4">
              {ORDER.map((k) => {
                const v = ratings.axes[k]
                return (
                  <div key={k}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-sm font-medium">{AXIS_LABEL[k]}</span>
                      <span className={cn('font-grotesk text-lg font-semibold tnum leading-none', v == null ? 'text-faint' : 'text-ink')}>
                        {v == null ? '—' : v}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sunken">
                      {v != null && (
                        <div className="h-full rounded-full bg-team transition-[width] duration-700 ease-calm" style={{ width: `${v}%` }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {ORDER.some((k) => ratings.axes[k] == null) && (
              <p className="mt-4 text-2xs text-faint">— = not enough real data for this axis yet (never fabricated).</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
