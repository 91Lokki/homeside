import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { GroupId, Match } from '@/domain/types'
import type { ApiStatus } from '@/lib/api'
import { MatchReport } from '@/components/MatchReport'
import { FormDots, Label, Score } from '@/components/ui/atoms'
import { localDay, localTime, localZoneName } from '@/lib/time'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

export function Schedule() {
  const { matches, homeCode, homeTeam, apiStatus, healthKnown } = useApp()
  const [group, setGroup] = useState<GroupId>(homeTeam?.group ?? 'A')

  const codes = useMemo(() => TEAMS.filter((t) => t.group === group).map((t) => t.code), [group])
  const standings = useMemo(() => computeGroupStandings(matches, group, codes), [matches, group, codes])
  const fixtures = useMemo(
    () =>
      matches
        .filter((m) => m.stage === 'group' && m.group === group)
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
    [matches, group],
  )

  const byDay = useMemo(() => groupByDay(fixtures), [fixtures])

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Schedule</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Group {group}</h1>
        </div>
        <span className="text-2xs text-faint">Times in {localZoneName()}</span>
      </div>

      {/* group selector A–L */}
      <div className="-mx-5 mb-7 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5">
          {GROUP_IDS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-grotesk text-sm font-semibold transition-colors',
                g === group ? 'bg-team text-team-ink' : 'border text-muted hover:text-ink',
                g === homeTeam?.group && g !== group && 'border-team text-team',
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* standings */}
        <section>
          <Label className="ml-1">Standings</Label>
          <div className="panel mt-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-2xs uppercase tracking-label text-faint">
                  <th className="py-2.5 pl-4 text-left font-medium">Team</th>
                  <th className="px-1.5 text-center font-medium">P</th>
                  <th className="px-1.5 text-center font-medium">GD</th>
                  <th className="px-1.5 text-center font-medium">Pts</th>
                  <th className="hidden px-1.5 pr-4 text-right font-medium sm:table-cell">Form</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const team = teamByCode[row.code]
                  const isHome = row.code === homeCode
                  const advancing = i < 2
                  return (
                    <tr key={row.code} className={cn('border-t', isHome && 'bg-team-soft')}>
                      <td className="py-2.5 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              'w-4 text-2xs tnum',
                              advancing ? 'font-semibold text-ink' : 'text-faint',
                            )}
                          >
                            {row.rank}
                          </span>
                          <span className={cn('font-medium', isHome && 'text-team')}>{team?.name ?? row.code}</span>
                          {advancing && row.played > 0 && <span className="h-1 w-1 rounded-full bg-team" title="In a qualifying place" />}
                        </div>
                      </td>
                      <td className="px-1.5 text-center tnum text-muted">{row.played}</td>
                      <td className="px-1.5 text-center tnum text-muted">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                      <td className="px-1.5 text-center font-grotesk font-semibold tnum">{row.points}</td>
                      <td className="hidden px-1.5 pr-4 text-right sm:table-cell">
                        <div className="flex justify-end">
                          <FormDots form={row.form} accent={isHome} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="ml-1 mt-2 text-2xs text-faint">Top two of each group advance, plus the eight best third-placed teams.</p>
        </section>

        {/* fixtures */}
        <section>
          <Label className="ml-1">Fixtures &amp; results</Label>
          <div className="mt-3 space-y-6">
            {byDay.map(([day, dayMatches]) => (
              <div key={day}>
                <p className="ml-1 text-2xs font-medium uppercase tracking-label text-faint">{day}</p>
                <div className="panel mt-2 divide-y overflow-hidden">
                  {dayMatches.map((m) => (
                    <MatchRow key={m.id} match={m} homeCode={homeCode} apiStatus={apiStatus} healthKnown={healthKnown} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function MatchRow({ match, homeCode, apiStatus, healthKnown }: { match: Match; homeCode: string | null; apiStatus: ApiStatus; healthKnown: boolean }) {
  const [open, setOpen] = useState(false)
  const home = match.homeCode ? teamByCode[match.homeCode] : null
  const away = match.awayCode ? teamByCode[match.awayCode] : null
  const expandable = match.status === 'finished'
  const live = match.status === 'live'
  const involvesHome = match.homeCode === homeCode || match.awayCode === homeCode

  return (
    <div className={cn(involvesHome && 'bg-team-soft/40', live && 'bg-team-soft/60')}>
      <button
        onClick={() => expandable && setOpen((v) => !v)}
        className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', expandable && 'hover:bg-sunken/40')}
      >
        <span className="w-12 shrink-0 text-2xs tnum text-faint">
          {match.status === 'finished' ? (
            'FT'
          ) : live ? (
            <span className="inline-flex items-center gap-1 font-semibold text-team">
              <span className="h-1.5 w-1.5 rounded-full bg-team animate-live-pulse" />
              {match.minute ? `${match.minute}'` : 'LIVE'}
            </span>
          ) : (
            localTime(match.kickoff)
          )}
        </span>
        <span className={cn('flex-1 truncate text-right text-sm', match.homeCode === homeCode ? 'font-semibold text-team' : 'font-medium')}>
          {home?.name ?? match.homeLabel ?? '—'}
        </span>
        <Score home={match.homeScore} away={match.awayScore} />
        <span className={cn('flex-1 truncate text-sm', match.awayCode === homeCode ? 'font-semibold text-team' : 'font-medium')}>
          {away?.name ?? match.awayLabel ?? '—'}
        </span>
        <ChevronDown
          size={15}
          className={cn('shrink-0 text-faint transition-transform', !expandable && 'opacity-0', open && 'rotate-180')}
        />
      </button>
      {open && expandable && (
        <div className="border-t bg-canvas/40">
          <MatchReport match={match} accentCode={homeCode} apiStatus={apiStatus} healthKnown={healthKnown} />
        </div>
      )}
    </div>
  )
}

function groupByDay(matches: Match[]): [string, Match[]][] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const day = localDay(m.kickoff)
    const arr = map.get(day) ?? []
    arr.push(m)
    map.set(day, arr)
  }
  return [...map.entries()]
}
