import { useMemo, useState, type CSSProperties } from 'react'
import { computeQualification, finishedFor, liveMatchFor, nextMatchFor, recordFor } from '@/domain/record'
import { moodFor } from '@/domain/mood'
import { buildLeague, computeRatings, type AxisKey } from '@/domain/ratings'
import type { TeamMatchStats } from '@/lib/api'
import { useMatchDetails } from '@/lib/matchData'
import { GROUP_STATS } from '@/data/teamStats'
import { SQUADS } from '@/data/squads'
import { TEAMS, teamByCode } from '@/data/teams'
import { KEY_PLAYERS } from '@/data/keyPlayers'
import type { Match } from '@/domain/types'
import { playerKey } from '@/domain/fantasy'
import { ChevronDown, Star } from 'lucide-react'
import { Flag } from '@/components/Flag'
import { Mascot } from '@/components/mascot/Mascot'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { RadarChart } from '@/components/RadarChart'
import { TeamSwitcher } from '@/components/TeamSwitcher'
import { FormDots, Label, Stat } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useTheme } from '@/state/theme'
import { useT } from '@/lib/useT'
import { accentOn, rgba, readableInkOn } from '@/lib/prng'
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
  const { isDark } = useTheme()
  const t = useT()

  const [viewCode, setViewCode] = useState(homeTeam?.code ?? '')
  const team = teamByCode[viewCode] ?? homeTeam
  const code = team?.code ?? ''

  const finished = useMemo(() => (code ? finishedFor(matches, code) : []), [matches, code])

  const fixtureIds = useMemo(
    () => finished.map((m) => m.apiFixtureId).filter((x): x is number => typeof x === 'number'),
    [finished],
  )
  const { details, loading } = useMatchDetails(fixtureIds)

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

  const league = useMemo(() => buildLeague(Object.values(GROUP_STATS)), [])
  const ratings = useMemo(() => computeRatings(stats, league), [stats, league])
  const qualMap = useMemo(() => computeQualification(matches, TEAMS), [matches])

  const [fullSquadOpen, setFullSquadOpen] = useState(false)

  if (!homeTeam || !team) return null

  // Rename inner-function team param to `tm` so the outer `t` (translations) stays accessible
  const teamVarsFor = (tm: typeof team): CSSProperties =>
    ({
      '--team': accentOn(tm.color, isDark),
      '--team-pure': tm.color,
      '--team-soft': rgba(tm.color, isDark ? 0.16 : 0.1),
      '--team-ink': readableInkOn(tm.color),
    }) as CSSProperties
  const teamVars = teamVarsFor(team)
  const browsingAway = team.code !== homeTeam.code

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

  const pKey = (p: { name: string; number?: number | null }) => playerKey({ teamCode: code, name: p.name, number: p.number })
  const playerByKey = new Map((squad?.players ?? []).map((p) => [pKey(p), p]))
  const keyPlayers = KEY_PLAYERS.filter((m) => m.teamCode === code)
    .map((m) => ({ player: playerByKey.get(m.playerId), archetypes: m.archetypes }))
    .filter((x): x is { player: NonNullable<ReturnType<typeof playerByKey.get>>; archetypes: typeof x.archetypes } => Boolean(x.player))
  const keyKeys = new Set(keyPlayers.map((x) => pKey(x.player)))

  const renderFullSquad = () => (
    <div className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2">
      {t.teamPosLines.map(([pos, posTitle]) => {
        const rows = byLine(pos as 'GK' | 'DF' | 'MF' | 'FW')
        if (!rows.length) return null
        return (
          <div key={pos}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-grotesk text-2xs font-semibold tracking-[0.14em] text-muted">{posTitle}</span>
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
                  {keyKeys.has(pKey(p)) && <Star size={11} className="shrink-0 fill-team text-team opacity-70" aria-label="Key player" />}
                  {p.club && <span className="max-w-[40%] shrink-0 truncate text-right text-2xs text-faint">{p.club}</span>}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )

  const renderHero = (tm: typeof team, hMood: typeof mood, hQual: typeof qual, vars: CSSProperties) => (
    <section
      style={vars}
      className="relative h-full overflow-hidden rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 px-6 pb-6 pt-5 sm:px-7"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40" style={{ background: 'linear-gradient(180deg, var(--team-soft), transparent)' }} />
      <div className="pointer-events-none absolute right-4 top-3 animate-breathe sm:right-6">
        <Mascot code={tm.code} color={tm.color} color2={tm.color2} symbol={tm.symbol} mood={hMood} size={72} />
      </div>
      <div className="relative max-w-[40rem]">
        <Label>{t.teamNationalLabel(tm.group)}</Label>
        <div className="mt-2.5 flex items-center gap-3.5">
          <Flag code={tm.code} size={48} className="shrink-0" />
          <div className="min-w-0">
            <h1 className="font-grotesk text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{tm.name}</h1>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-muted">
            {tm.pot === 1 ? t.teamTopSeed : t.teamPot(tm.pot)}
          </span>
          {tm.host && <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-muted">{t.teamHost}</span>}
          {hQual === 'in' && <span className="rounded-pill bg-team-soft px-2.5 py-1 text-2xs font-semibold text-team">{t.teamThrough}</span>}
          {hQual === 'out' && <span className="rounded-pill bg-sunken px-2.5 py-1 text-2xs font-medium text-faint">{t.teamEliminated}</span>}
        </div>
      </div>
    </section>
  )
  const heroFor = (tm: typeof team) => renderHero(tm, moodFor(matches, tm.code).mood, qualMap.get(tm.code), teamVarsFor(tm))

  return (
    <div className="animate-fade-in" style={teamVars}>
      <div className="mb-4 flex min-h-[2.25rem] items-center gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <TeamSwitcher current={team.code} homeCode={homeTeam.code} onPick={selectTeam} />
          {browsingAway && (
            <button
              onClick={() => selectTeam(homeTeam.code)}
              className="rounded-pill px-3 py-1.5 text-2xs font-medium text-faint transition-colors hover:text-ink"
            >
              {t.teamBackTo(homeTeam.name)}
            </button>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:hidden">
          <TeamSwitcher current={team.code} homeCode={homeTeam.code} onPick={selectTeam} />
          {browsingAway && (
            <button
              onClick={() => selectTeam(homeTeam.code)}
              className="inline-flex items-center gap-1.5 rounded-pill bg-black/[0.04] px-3 py-1.5 text-2xs font-medium text-muted ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10"
            >
              {t.teamBackToMobile(homeTeam.name)}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div key={team.code} className="animate-team-in">{heroFor(team)}</div>
      </div>

      <div key={team.code} className="grid grid-cols-1 gap-4 animate-team-in lg:grid-cols-12 lg:items-start">
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
            <Stat label={t.teamGoals} value={`${rec.gf}:${rec.ga}`} sub={`${rec.gf - rec.ga >= 0 ? '+' : ''}${rec.gf - rec.ga} GD`} />
            <div className="flex flex-col gap-1">
              <Label>{t.teamForm}</Label>
              <FormDots form={rec.form} accent />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <Label>{t.teamRecord}</Label>
            <span className="text-sm text-muted">{t.teamNoMatches}</span>
          </div>
        )}
        {next && oppCode && (
          <span className="ml-auto inline-flex items-center gap-2 rounded-pill bg-sunken px-3 py-1.5 text-2xs font-medium text-muted">
            {live ? <span className="font-semibold text-team">{t.teamLive}</span> : <span className="text-faint">{t.teamNext}</span>}
            <Flag code={oppCode} size={16} />
            <span className="truncate text-ink">{teamByCode[oppCode]?.name ?? oppCode}</span>
            {!live && <span className="tnum text-faint">{new Date(next.kickoff).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </span>
        )}
      </section>

      <section className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-5 sm:p-7 lg:col-span-7">
        {!squad?.players?.length ? (
          <>
            <h2 className="mb-5 font-grotesk text-2xl font-semibold tracking-tight">{t.teamSquad}</h2>
            <p className="text-sm text-muted">{t.teamNoSquad(team.name)}</p>
          </>
        ) : keyPlayers.length > 0 ? (
          <>
            <div className="mb-4">
              <h2 className="font-grotesk text-2xl font-semibold tracking-tight">{t.teamPlayersToKnow}</h2>
            </div>
            <ul className="space-y-1.5">
              {keyPlayers.map(({ player, archetypes }) => (
                <li
                  key={pKey(player)}
                  className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-3 py-2.5 ring-1 ring-inset ring-black/[0.05] dark:bg-white/[0.04] dark:ring-white/[0.07]"
                >
                  <PlayerAvatar teamCode={code} name={player.name} number={player.number} size={44} flagBadge={false} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{player.name}</span>
                    <p className="mt-0.5 truncate text-2xs text-faint">
                      {t.teamPosName[player.position] ?? player.position}
                      {player.club ? ` · ${player.club}` : ''}
                    </p>
                  </div>
                  {archetypes.length > 0 && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      {archetypes.map((a) => (
                        <span key={a} className="rounded-pill bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-hairline pt-3">
              <button
                onClick={() => setFullSquadOpen((o) => !o)}
                aria-expanded={fullSquadOpen}
                className="flex w-full items-center justify-between gap-2 py-1 text-left"
              >
                <span className="font-grotesk text-2xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {t.teamFullSquad}
                  <span className="ml-2 font-system normal-case tracking-normal text-faint">
                    {t.teamPlayers(squad.players.length, !squad.verified)}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  className={cn('shrink-0 text-faint transition-transform duration-300 ease-calm', fullSquadOpen && 'rotate-180')}
                />
              </button>
              {fullSquadOpen && <div className="mt-4 animate-fade-in">{renderFullSquad()}</div>}
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="font-grotesk text-2xl font-semibold tracking-tight">{t.teamSquad}</h2>
              <span className="text-2xs uppercase tracking-label text-faint">
                {t.teamPlayers(squad.players.length, !squad.verified)}
              </span>
            </div>
            {renderFullSquad()}
          </>
        )}
      </section>

      <div className="flex flex-col gap-4 lg:col-span-5">
        {noData ? (
          <div className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-6 text-sm text-muted">
            {t.teamAbilityNoData(team.name, apiStatus, healthKnown)}
          </div>
        ) : (
          <>
            <section className="relative flex flex-col items-center overflow-hidden rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 px-6 pb-6 pt-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-44" style={{ background: 'linear-gradient(180deg, var(--team-soft), transparent)' }} />
              <Label className="relative self-start">{t.teamAbilityCard}</Label>
              <RadarChart ratings={ratings} color={team.color} />
              <p className="mt-1 text-center font-grotesk text-2xl font-semibold tracking-tight text-team">{ratings.playstyle}</p>
              {ratings.summary && <p className="mt-1.5 max-w-[34ch] text-center text-sm leading-snug text-muted">{ratings.summary}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xs text-faint">
                <span>{t.teamRealStats(ratings.matchesUsed)}</span>
                {loading && <span>{t.teamUpdating}</span>}
                {ratings.provisional && <span className="rounded-pill bg-sunken px-2 py-0.5 font-medium text-muted">{t.teamProvisional}</span>}
              </div>
            </section>

            <section className="rounded-[22px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10 p-5 sm:p-6">
              <Label className="mb-4 block">{t.teamRatings}</Label>
              <div className="space-y-4">
                {ORDER.map((k) => {
                  const v = ratings.axes[k]
                  return (
                    <div key={k}>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-sm font-medium">{t.teamAxisLabel[k]}</span>
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
                <p className="mt-4 text-2xs text-faint">{t.teamNullAxis}</p>
              )}
            </section>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
