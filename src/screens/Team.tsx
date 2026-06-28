import { useMemo, useState, type CSSProperties } from 'react'
import { computeQualification, finishedFor, liveMatchFor, nextMatchFor, recordFor } from '@/domain/record'
import { moodFor } from '@/domain/mood'
import { AXIS_LABEL, buildLeague, computeRatings, type AxisKey } from '@/domain/ratings'
import type { TeamMatchStats } from '@/lib/api'
import { liveDataNote } from '@/lib/apiCopy'
import { useMatchDetails } from '@/lib/matchData'
import { GROUP_STATS } from '@/data/teamStats'
import { SQUADS } from '@/data/squads'
import { TEAMS, teamByCode } from '@/data/teams'
import type { Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { Mascot } from '@/components/mascot/Mascot'
import { RadarChart } from '@/components/RadarChart'
import { TeamSwitcher } from '@/components/TeamSwitcher'
import { FormDots, Label, Stat } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useTheme } from '@/state/theme'
import { accentOn, rgba, readableInkOn } from '@/lib/prng'
import { cn } from '@/lib/utils'

const ORDER: AxisKey[] = ['attack', 'finishing', 'possession', 'defense', 'creativity', 'discipline']
const POS_LINES = [
  ['GK', 'Goalkeepers'],
  ['DF', 'Defenders'],
  ['MF', 'Midfielders'],
  ['FW', 'Forwards'],
] as const

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
  const { isDark } = useTheme()

  // Local browse state ONLY: which team this page is showing. Defaults to the
  // home team and resets on every visit (the screen remounts on route change).
  // It never writes back to the store, so the global home team, every other page,
  // and the global team colour are untouched. The team accent is scoped below to
  // this page's root element, so even the colour change stays local.
  const [viewCode, setViewCode] = useState(homeTeam?.code ?? '')
  const team = teamByCode[viewCode] ?? homeTeam
  const code = team?.code ?? ''

  const finished = useMemo(() => (code ? finishedFor(matches, code) : []), [matches, code])

  // Pull the live ESPN box score for EVERY finished match (group + knockout) so
  // the radar reflects the real feed in real time. /api/match is hard-cached
  // server-side and memoized per session, so one team's handful of matches stays
  // well under the cap.
  const fixtureIds = useMemo(
    () => finished.map((m) => m.apiFixtureId).filter((x): x is number => typeof x === 'number'),
    [finished],
  )
  const { details, loading } = useMatchDetails(fixtureIds)

  // Radar inputs, all from REAL data, never fabricated:
  //  • prefer the LIVE ESPN box score for each finished match,
  //  • for the group stage fall back to the static ESPN bake until every match is
  //    fetched (so the card never flickers down to partial data),
  //  • last resort is the final score alone (gf/ga only — other axes stay null).
  const stats = useMemo<TeamMatchStats[]>(() => {
    const groupMatches = finished.filter((m) => m.stage === 'group')
    const liveGroup = groupMatches
      .map((m) => (m.apiFixtureId ? details[m.apiFixtureId]?.teamStats[code] : undefined))
      .filter(Boolean) as TeamMatchStats[]
    const baked = GROUP_STATS[code]
    const group: TeamMatchStats[] =
      groupMatches.length > 0 && liveGroup.length === groupMatches.length
        ? liveGroup
        : baked?.length
          ? baked
          : (groupMatches.map((m) => resultStat(m, code)).filter(Boolean) as TeamMatchStats[])
    const ko: TeamMatchStats[] = finished
      .filter((m) => m.stage !== 'group')
      .map((m) => (m.apiFixtureId ? details[m.apiFixtureId]?.teamStats[code] : undefined) ?? resultStat(m, code))
      .filter(Boolean) as TeamMatchStats[]
    return [...group, ...ko]
  }, [finished, details, code])

  // Dynamic rating standard: rank this team's axes against the whole field
  // (every team's real group-stage box scores) so the scale adapts and no team
  // is ever pinned to a flat 0 or a perfect 100.
  const league = useMemo(() => buildLeague(Object.values(GROUP_STATS)), [])
  const ratings = useMemo(() => computeRatings(stats, league), [stats, league])
  const qualMap = useMemo(() => computeQualification(matches, TEAMS), [matches])

  if (!homeTeam || !team) return null

  // Team accent scoped to a subtree only (overrides --team within it), never
  // <html> — so the page content + each hero card can show the browsed team's
  // colour while the global nav theme stays the home team's.
  const teamVarsFor = (t: typeof team): CSSProperties =>
    ({
      '--team': accentOn(t.color, isDark),
      '--team-pure': t.color,
      '--team-soft': rgba(t.color, isDark ? 0.16 : 0.1),
      '--team-ink': readableInkOn(t.color),
    }) as CSSProperties
  const teamVars = teamVarsFor(team)
  const browsingAway = team.code !== homeTeam.code

  // Switch the viewed team — LOCAL browse state only, never the global home team.
  const selectTeam = (c: string) => setViewCode(c)

  const rec = recordFor(matches, code)
  const qual = qualMap.get(code)
  const live = liveMatchFor(matches, code)
  const next = live ?? nextMatchFor(matches, code)
  const oppCode = next ? (next.homeCode === code ? next.awayCode : next.homeCode) : null
  const squad = SQUADS[code]
  const mood = moodFor(matches, code).mood
  const noData = stats.length === 0
  const byLine = (pos: 'GK' | 'DF' | 'MF' | 'FW') =>
    (squad?.players ?? []).filter((p) => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99))

  // One hero "card" for any team, with its own scoped colour.
  const renderHero = (t: typeof team, hMood: typeof mood, hQual: typeof qual, vars: CSSProperties) => (
    <section
      style={vars}
      className="relative h-full overflow-hidden rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 px-6 pb-6 pt-5 sm:px-7"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: 'linear-gradient(180deg, var(--team-soft), transparent)' }} />
      <div className="pointer-events-none absolute right-4 top-3 animate-breathe sm:right-6">
        <Mascot code={t.code} color={t.color} color2={t.color2} symbol={t.symbol} mood={hMood} size={72} />
      </div>
      <div className="relative max-w-[40rem]">
        <Label>National team · Group {t.group}</Label>
        <div className="mt-2.5 flex items-center gap-3.5">
          <Flag code={t.code} size={48} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="font-grotesk text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{t.name}</h1>
            {t.nameTC && <span className="mt-1.5 block font-tc text-base text-faint">{t.nameTC}</span>}
          </div>
        </div>
        {t.symbol && (
          <p className="mt-4 text-sm text-muted">
            <span className="text-faint">National emblem · </span>
            {t.symbol}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-muted">
            {t.pot === 1 ? 'Top seed · Pot 1' : `Pot ${t.pot}`}
          </span>
          {t.host && <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-muted">Host nation</span>}
          {hQual === 'in' && <span className="rounded-pill bg-team-soft px-2.5 py-1 text-2xs font-semibold text-team">Through to knockouts</span>}
          {hQual === 'out' && <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-faint">Eliminated</span>}
        </div>
      </div>
    </section>
  )
  const heroFor = (t: typeof team) => renderHero(t, moodFor(matches, t.code).mood, qualMap.get(t.code), teamVarsFor(t))

  return (
    <div className="animate-fade-in" style={teamVars}>
      {/* Controls — desktop: searchable selector + Back. Mobile: a compact search
          entry + Back. Both share the same local viewCode; neither touches the
          global home team. */}
      <div className="mb-4 flex min-h-[2.25rem] items-center gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <TeamSwitcher current={team.code} homeCode={homeTeam.code} onPick={selectTeam} />
          {browsingAway && (
            <button
              onClick={() => selectTeam(homeTeam.code)}
              className="rounded-pill px-3 py-1.5 text-2xs font-medium text-faint transition-colors hover:text-ink"
            >
              ← Back to {homeTeam.name}
            </button>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:hidden">
          <TeamSwitcher current={team.code} homeCode={homeTeam.code} onPick={selectTeam} asSearch />
          {browsingAway && (
            <button
              onClick={() => selectTeam(homeTeam.code)}
              className="inline-flex items-center gap-1.5 rounded-pill bg-black/[0.04] px-3 py-1.5 text-2xs font-medium text-muted ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10"
            >
              ← {homeTeam.name}
            </button>
          )}
        </div>
      </div>

      {/* Hero — a single card; re-keyed per team for a silky fade on switch. */}
      <div className="mb-4">
        <div key={team.code} className="animate-team-in">{heroFor(team)}</div>
      </div>

      {/* The rest of the profile — re-keyed per team for a silky fade as it syncs
          to the browsed team. */}
      <div key={team.code} className="grid grid-cols-1 gap-4 animate-team-in lg:grid-cols-12 lg:items-start">
        {/* Pulse strip — the only result data: compact record + next/live chip. */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[22px] bg-black/[0.04] px-5 py-4 ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 lg:col-span-12">
        {rec.played > 0 ? (
          <>
            <div className="flex items-baseline gap-1.5 font-grotesk tnum">
              <span className="text-2xl font-semibold">{rec.win}</span>
              <span className="text-xs text-faint">W</span>
              <span className="ml-2 text-2xl font-semibold">{rec.draw}</span>
              <span className="text-xs text-faint">D</span>
              <span className="ml-2 text-2xl font-semibold">{rec.loss}</span>
              <span className="text-xs text-faint">L</span>
            </div>
            <span className="hidden h-8 w-px bg-hairline sm:block" />
            <Stat label="Goals" value={`${rec.gf}:${rec.ga}`} sub={`${rec.gf - rec.ga >= 0 ? '+' : ''}${rec.gf - rec.ga} GD`} />
            <div className="flex flex-col gap-1">
              <Label>Form</Label>
              <FormDots form={rec.form} accent />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <Label>Record</Label>
            <span className="text-sm text-muted">No matches played yet.</span>
          </div>
        )}
        {next && oppCode && (
          <span className="ml-auto inline-flex items-center gap-2 rounded-pill bg-sunken px-3 py-1.5 text-2xs font-medium text-muted">
            {live ? <span className="font-semibold text-team">LIVE</span> : <span className="text-faint">Next</span>}
            <Flag code={oppCode} size={16} />
            <span className="truncate text-ink">{teamByCode[oppCode]?.name ?? oppCode}</span>
            {!live && <span className="tnum text-faint">{new Date(next.kickoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </span>
        )}
      </section>

      {/* Squad — the first-class roster, grouped by position. */}
      <section className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-5 sm:p-7 lg:col-span-7">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-grotesk text-2xl font-semibold tracking-tight">Squad</h2>
          <span className="text-2xs uppercase tracking-label text-faint">
            {squad?.players?.length ?? 0} players{squad && !squad.verified ? ' · unconfirmed' : ''}
          </span>
        </div>
        {!squad?.players?.length ? (
          <p className="text-sm text-muted">
            The squad list for {team.name} isn&rsquo;t available yet — it appears once verified from a public source (never fabricated).
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
            {POS_LINES.map(([pos, title]) => {
              const rows = byLine(pos)
              if (!rows.length) return null
              return (
                <div key={pos}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <span className="font-grotesk text-2xs font-semibold tracking-[0.14em] text-muted">{title}</span>
                    <span className="h-px flex-1 bg-hairline" />
                    <span className="font-grotesk text-2xs tnum text-faint">{rows.length}</span>
                  </div>
                  <ul className="font-system">
                    {rows.map((p, i) => (
                      <li
                        key={p.name + (p.number ?? i)}
                        className="flex items-center gap-3 border-b border-black/5 py-2 last:border-0 dark:border-white/[0.07]"
                      >
                        {p.number != null ? (
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-sunken font-grotesk text-xs font-semibold tnum text-muted">
                            {p.number}
                          </span>
                        ) : (
                          <span aria-hidden className="h-7 w-7 shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{p.name}</span>
                        {p.club && <span className="max-w-[42%] shrink-0 truncate text-right text-2xs text-faint">{p.club}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Ability rail — the radar + rating bars (or the no-data note). */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        {noData ? (
          <div className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-6 text-sm text-muted">
            The ability card is built from {team.name}&rsquo;s real match stats.{' '}
            {!healthKnown
              ? 'Checking the live data feed…'
              : apiStatus === 'ok'
                ? 'It appears once the team has played and the match is in the live data feed.'
                : liveDataNote(apiStatus)}
          </div>
        ) : (
          <>
            {/* radar card with team-colour wash */}
            <section className="relative flex flex-col items-center overflow-hidden rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 px-6 pb-6 pt-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44" style={{ background: 'linear-gradient(180deg, var(--team-soft), transparent)' }} />
              <Label className="relative self-start">Ability card</Label>
              <RadarChart ratings={ratings} color={team.color} />
              <p className="mt-1 text-center font-grotesk text-2xl font-semibold tracking-tight text-team">{ratings.playstyle}</p>
              {ratings.summary && <p className="mt-1.5 max-w-[34ch] text-center text-sm leading-snug text-muted">{ratings.summary}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xs text-faint">
                <span>Real stats · {ratings.matchesUsed} {ratings.matchesUsed === 1 ? 'match' : 'matches'}</span>
                {loading && <span>· updating…</span>}
                {ratings.provisional && <span className="rounded-pill bg-sunken px-2 py-0.5 font-medium text-muted">provisional</span>}
              </div>
            </section>

            {/* rating bars — Apple-Sports style */}
            <section className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-5 sm:p-6">
              <Label className="mb-4 block">Ratings</Label>
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
                        {v != null && <div className="h-full rounded-full bg-team transition-[width] duration-700 ease-calm" style={{ width: `${v}%` }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              {ORDER.some((k) => ratings.axes[k] == null) && (
                <p className="mt-4 text-2xs text-faint">— = not enough real data for this axis yet (never fabricated).</p>
              )}
            </section>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
