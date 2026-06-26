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
  return { code, goalsFor: gf, goalsAgainst: ga, cleanSheet: ga === 0, possession: null, shots: null, shotsOnTarget: null, xg: null, xa: null, keyPasses: null, fouls: null, yellow: null, red: null, gkSaves: null }
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
        <Label>Team ability card · Group {homeTeam.group}</Label>
        <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">{homeTeam.name}</h1>
        {homeTeam.nameTC && <span className="font-tc text-sm text-faint">{homeTeam.nameTC}</span>}
      </div>

      {noData ? (
        <div className="panel p-6 text-sm text-muted">
          The ability card is built from {homeTeam.name}&rsquo;s real match stats.{' '}
          {!healthKnown
            ? 'Checking the live data feed…'
            : apiStatus === 'ok'
              ? 'It appears once the team has played and the match is in the live data feed.'
              : liveDataNote(apiStatus)}
        </div>
      ) : (
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* radar + mascot accent */}
          <section className="panel relative flex flex-col items-center p-6">
            <div className="absolute right-3 top-3 opacity-90">
              <Mascot code={code} color={homeTeam.color} color2={homeTeam.color2} symbol={homeTeam.symbol} mood={mood} size={64} />
            </div>
            <RadarChart ratings={ratings} color={homeTeam.color} />
            <p className="mt-2 text-center font-grotesk text-lg font-medium">{ratings.playstyle}</p>
            <p className="mt-1 text-center text-2xs text-faint">
              Based on real tournament stats · {ratings.matchesUsed} {ratings.matchesUsed === 1 ? 'match' : 'matches'}
              {loading && ' · loading…'}
              {ratings.provisional && <span className="ml-1 rounded-pill bg-sunken px-2 py-0.5 text-ink">provisional</span>}
            </p>
          </section>

          {/* numeric ratings */}
          <section className="panel divide-y p-2">
            {ORDER.map((k) => {
              const v = ratings.axes[k]
              return (
                <div key={k} className="flex items-center gap-3 px-3 py-3">
                  <span className="w-24 shrink-0 text-sm font-medium">{AXIS_LABEL[k]}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-team" style={{ width: `${v ?? 0}%` }} />
                  </div>
                  <span className={cn('w-10 text-right font-grotesk text-sm font-semibold tnum', v == null && 'text-faint')}>
                    {v == null ? '—' : v}
                  </span>
                </div>
              )
            })}
            {ORDER.some((k) => ratings.axes[k] == null) && (
              <p className="px-3 py-2 text-2xs text-faint">— = not enough real data for this axis yet (not fabricated).</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
