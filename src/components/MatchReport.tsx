import { useEffect, useState } from 'react'
import { teamByCode } from '@/data/teams'
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
  const homeColor = (match.homeCode && teamByCode[match.homeCode]?.color) || '#9aa0aa'
  const awayColor = (match.awayCode && teamByCode[match.awayCode]?.color) || '#5b606b'

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

      {/* stat comparison — each team in its own colour */}
      <div className="space-y-3.5 border-t border-white/10 pt-4">
        <CompareBar label="Possession" home={report.possession.home} away={report.possession.away} homeColor={homeColor} awayColor={awayColor} unit="%" />
        <CompareBar label="Shots" home={report.shots.home} away={report.shots.away} homeColor={homeColor} awayColor={awayColor} />
        <CompareBar label="On target" home={report.shotsOnTarget.home} away={report.shotsOnTarget.away} homeColor={homeColor} awayColor={awayColor} />
        <CompareBar label="Corners" home={report.corners.home} away={report.corners.away} homeColor={homeColor} awayColor={awayColor} />
        <CompareBar label="Fouls" home={report.fouls.home} away={report.fouls.away} homeColor={homeColor} awayColor={awayColor} />
      </div>
    </div>
  )
}

function CompareBar({
  label,
  home,
  away,
  homeColor,
  awayColor,
  unit = '',
}: {
  label: string
  home: number | null
  away: number | null
  homeColor: string
  awayColor: string
  unit?: string
}) {
  if (home == null && away == null) return null
  const h = home ?? 0
  const a = away ?? 0
  const total = h + a || 1

  return (
    <div>
      <div className="flex items-center justify-between text-[15px] tnum">
        <span className="font-grotesk font-bold text-white">{h}{unit}</span>
        <span className="text-2xs uppercase tracking-label text-white/40">{label}</span>
        <span className="font-grotesk font-bold text-white">{a}{unit}</span>
      </div>
      <div className="mt-1.5 flex h-[5px] items-center gap-1">
        <div className="flex h-full justify-end" style={{ flexBasis: `${(h / total) * 100}%` }}>
          <div className="h-full w-full rounded-l-full" style={{ background: homeColor }} />
        </div>
        <div className="flex h-full flex-1 justify-start">
          <div className="h-full w-full rounded-r-full" style={{ background: awayColor }} />
        </div>
      </div>
    </div>
  )
}
