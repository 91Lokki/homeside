import { useEffect, useState } from 'react'
import type { Match } from '@/domain/types'
import { fetchMatchReport, type ApiStatus, type MatchReport as Report } from '@/lib/api'
import { liveDataNote } from '@/lib/apiCopy'
import { cn } from '@/lib/utils'
import { Label } from './ui/atoms'

/** The match report — goal timeline + Apple-Sports-style stat comparison. ESPN data. */
export function MatchReport({
  match,
  accentCode,
  apiStatus,
  healthKnown,
}: {
  match: Match
  accentCode?: string | null
  apiStatus: ApiStatus
  healthKnown: boolean
}) {
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable' | 'ready'>('idle')

  useEffect(() => {
    let cancelled = false
    if (!match.apiFixtureId) {
      setState('unavailable')
      return
    }
    setState('loading')
    fetchMatchReport(match.apiFixtureId, match.homeCode, match.awayCode).then((r) => {
      if (cancelled) return
      if (r) {
        setReport(r)
        setState('ready')
      } else {
        setState('unavailable')
      }
    })
    return () => {
      cancelled = true
    }
  }, [match.apiFixtureId, match.homeCode, match.awayCode])

  if (state === 'loading') {
    return <div className="px-5 py-5 text-2xs text-faint">Loading report…</div>
  }

  if (state === 'unavailable') {
    const note = !healthKnown
      ? 'Checking the live data feed…'
      : apiStatus !== 'ok'
        ? liveDataNote(apiStatus)
        : match.apiFixtureId
          ? 'A detailed report for this match isn’t available yet.'
          : liveDataNote('ok')
    return (
      <div className="px-5 py-5">
        <p className="text-xs text-muted">Final score recorded. {note}</p>
      </div>
    )
  }

  if (!report) return null

  const goals = report.events.filter((e) => e.type === 'Goal' || e.type === 'Own Goal')
  const accent: 'home' | 'away' | null =
    accentCode && match.homeCode === accentCode ? 'home' : accentCode && match.awayCode === accentCode ? 'away' : null

  return (
    <div className="space-y-5 px-5 py-5">
      {/* goal timeline */}
      <div>
        <Label>Goals</Label>
        {goals.length === 0 ? (
          <p className="mt-2 text-xs text-faint">No goals.</p>
        ) : (
          <ul className="mt-2.5 space-y-2">
            {goals.map((g, i) => {
              const isHome = g.team === match.homeCode
              const isAccent = (isHome && accent === 'home') || (!isHome && accent === 'away')
              return (
                <li key={i} className={cn('flex items-center gap-2.5 text-sm', isHome ? 'justify-start' : 'flex-row-reverse text-right')}>
                  <span
                    className={cn(
                      'grid h-6 min-w-[30px] place-items-center rounded-md px-1.5 font-grotesk text-2xs font-semibold tnum',
                      isAccent ? 'bg-team text-team-ink' : 'bg-sunken text-muted',
                    )}
                  >
                    {g.minute}&rsquo;
                  </span>
                  <span className="truncate font-medium">
                    {g.player || 'Goal'}
                    {g.detail.includes('penalty') && <span className="text-faint"> (pen)</span>}
                    {g.detail.includes('own goal') && <span className="text-faint"> (og)</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* stat comparison */}
      <div className="space-y-3 border-t pt-4">
        <CompareBar label="Possession" home={report.possession.home} away={report.possession.away} accent={accent} unit="%" />
        <CompareBar label="Shots" home={report.shots.home} away={report.shots.away} accent={accent} />
        <CompareBar label="On target" home={report.shotsOnTarget.home} away={report.shotsOnTarget.away} accent={accent} />
        <CompareBar label="Corners" home={report.corners.home} away={report.corners.away} accent={accent} />
        <CompareBar label="Fouls" home={report.fouls.home} away={report.fouls.away} accent={accent} />
      </div>
    </div>
  )
}

function CompareBar({
  label,
  home,
  away,
  accent,
  unit = '',
}: {
  label: string
  home: number | null
  away: number | null
  accent: 'home' | 'away' | null
  unit?: string
}) {
  if (home == null && away == null) return null
  const h = home ?? 0
  const a = away ?? 0
  const total = h + a || 1
  const fill = (side: 'home' | 'away') => (accent === side ? 'bg-team' : 'bg-muted/60')

  return (
    <div>
      <div className="flex items-center justify-between text-sm tnum">
        <span className={cn('font-grotesk font-semibold', accent === 'home' ? 'text-team' : 'text-ink')}>{h}{unit}</span>
        <span className="text-2xs uppercase tracking-label text-faint">{label}</span>
        <span className={cn('font-grotesk font-semibold', accent === 'away' ? 'text-team' : 'text-ink')}>{a}{unit}</span>
      </div>
      <div className="mt-1.5 flex h-1.5 items-center gap-1">
        <div className="flex h-full justify-end" style={{ flexBasis: `${(h / total) * 100}%` }}>
          <div className={cn('h-full w-full rounded-l-full', fill('home'))} />
        </div>
        <div className="flex h-full flex-1 justify-start">
          <div className={cn('h-full w-full rounded-r-full', fill('away'))} />
        </div>
      </div>
    </div>
  )
}
