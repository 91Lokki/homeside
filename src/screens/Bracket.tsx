import { useMemo } from 'react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import { homePath, resolveBracket, STAGE_LABEL } from '@/domain/bracket'
import { computeGroupStandings } from '@/domain/record'
import type { ResolvedBracketMatch, SlotRef, Stage, TeamCode } from '@/domain/types'
import { Label } from '@/components/ui/atoms'
import { localDay } from '@/lib/time'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']

export function Bracket() {
  const { matches, homeCode, homeTeam } = useApp()

  const resolved = useMemo(() => resolveBracket(BRACKET, TEAMS, matches), [matches])
  const path = useMemo(() => homePath(resolved, homeCode), [resolved, homeCode])
  const byStage = useMemo(() => {
    const m = new Map<Stage, ResolvedBracketMatch[]>()
    for (const r of resolved) {
      const arr = m.get(r.stage) ?? []
      arr.push(r)
      m.set(r.stage, arr)
    }
    return m
  }, [resolved])

  const final = byStage.get('F')?.[0]
  const third = byStage.get('F3')?.[0]
  const status = useMemo(() => homeStatus(matches, homeCode), [matches, homeCode])

  return (
    <div className="animate-fade-in">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Knockout bracket</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Round of 32 → Final</h1>
        </div>
      </div>

      {homeTeam && (
        <p className="mb-6 max-w-2xl text-sm text-muted">
          {status === 'in' ? (
            <>
              <span className="font-medium text-team">{homeTeam.name}</span>&rsquo;s path to the final is highlighted. It
              follows the fixed FIFA bracket — results fill in as the knockouts are played.
            </>
          ) : status === 'out' ? (
            <>
              <span className="font-medium">{homeTeam.name}</span> didn&rsquo;t make the round of 32 this time — but the
              bracket plays on. Your mascot stays right here with you.
            </>
          ) : (
            <>
              {homeTeam.name}&rsquo;s place isn&rsquo;t settled yet. Once Group {homeTeam.group} finishes, its path
              through the bracket lights up here.
            </>
          )}
        </p>
      )}

      <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((stage) => (
            <div key={stage} className="w-56 shrink-0">
              <p className="mb-3 text-2xs font-medium uppercase tracking-label text-faint">{STAGE_LABEL[stage]}</p>
              <div
                className={cn(
                  'flex flex-col gap-3',
                  stage !== 'R32' && 'justify-around',
                  stage === 'F' && 'h-full justify-center',
                )}
              >
                {(byStage.get(stage) ?? []).map((m) => (
                  <BracketCard key={m.matchNo} match={m} homeCode={homeCode} inPath={path.has(m.matchNo)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* final + third place callout */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {final && (
          <div className="panel border-team/40 p-5">
            <Label>The final</Label>
            <p className="mt-1 text-2xs text-faint">{final.city}{final.kickoff ? ` · ${localDay(final.kickoff)}` : ''}</p>
            <div className="mt-3 space-y-2">
              <SlotLine match={final} side="home" homeCode={homeCode} large />
              <SlotLine match={final} side="away" homeCode={homeCode} large />
            </div>
          </div>
        )}
        {third && (
          <div className="panel p-5">
            <Label>Third-place play-off</Label>
            <p className="mt-1 text-2xs text-faint">{third.city}{third.kickoff ? ` · ${localDay(third.kickoff)}` : ''}</p>
            <div className="mt-3 space-y-2">
              <SlotLine match={third} side="home" homeCode={homeCode} />
              <SlotLine match={third} side="away" homeCode={homeCode} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BracketCard({ match, homeCode, inPath }: { match: ResolvedBracketMatch; homeCode: string | null; inPath: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[12px] border bg-surface px-3 py-2.5 transition-colors',
        inPath && 'border-team bg-team-soft',
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-label text-faint">M{match.matchNo}</span>
        {match.status === 'finished' && <span className="text-[9px] uppercase tracking-label text-faint">FT</span>}
      </div>
      <SlotLine match={match} side="home" homeCode={homeCode} />
      <SlotLine match={match} side="away" homeCode={homeCode} />
    </div>
  )
}

function SlotLine({
  match,
  side,
  homeCode,
  large = false,
}: {
  match: ResolvedBracketMatch
  side: 'home' | 'away'
  homeCode: string | null
  large?: boolean
}) {
  const code = side === 'home' ? match.homeCode : match.awayCode
  const slot: SlotRef = side === 'home' ? match.home : match.away
  const score = side === 'home' ? match.homeScore : match.awayScore
  const team = code ? teamByCode[code] : null
  const isHome = code && code === homeCode
  const isWinner = match.status === 'finished' && match.winnerCode === code
  const isLoser = match.status === 'finished' && match.winnerCode != null && match.winnerCode !== code

  return (
    <div className={cn('flex items-center justify-between gap-2 py-0.5', large && 'py-1')}>
      <span
        className={cn(
          'truncate',
          large ? 'text-base' : 'text-[13px]',
          team ? 'font-medium' : 'text-faint',
          isHome && 'font-semibold text-team',
          isWinner && !isHome && 'font-semibold',
          isLoser && 'text-faint',
        )}
      >
        {team ? team.name : slot.label}
      </span>
      {score != null && <span className="font-grotesk text-sm font-semibold tnum">{score}</span>}
    </div>
  )
}

/** Is the home team in / out of the round of 32, or undecided? */
function homeStatus(matches: Parameters<typeof computeGroupStandings>[0], homeCode: string | null): 'in' | 'out' | 'tbd' {
  if (!homeCode) return 'tbd'
  const team = teamByCode[homeCode]
  if (!team) return 'tbd'
  const codes = TEAMS.filter((t) => t.group === team.group).map((t) => t.code as TeamCode)
  const finished = matches.filter((m) => m.stage === 'group' && m.group === team.group && m.status === 'finished').length
  if (finished < 6) return 'tbd'
  const standings = computeGroupStandings(matches, team.group, codes)
  const rank = standings.find((r) => r.code === homeCode)?.rank ?? 99
  // Top 2 always advance. 3rd may advance as a best-third — treat as tbd-but-hopeful.
  if (rank <= 2) return 'in'
  if (rank === 3) return 'tbd'
  return 'out'
}
