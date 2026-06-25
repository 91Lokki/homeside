import { useEffect, useState } from 'react'
import { teamByCode } from '@/data/teams'
import type { Match } from '@/domain/types'
import { fetchMatchReport, type MatchReport as Report } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Label } from './ui/atoms'

/** The light match report — goal timeline, possession, shots. Live data only. */
export function MatchReport({ match, accentCode }: { match: Match; accentCode?: string | null }) {
  const [report, setReport] = useState<Report | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable' | 'ready'>('idle')

  const home = match.homeCode ? teamByCode[match.homeCode] : null
  const away = match.awayCode ? teamByCode[match.awayCode] : null

  useEffect(() => {
    let cancelled = false
    if (!match.apiFixtureId) {
      setState('unavailable')
      return
    }
    setState('loading')
    fetchMatchReport(match.apiFixtureId, home?.name, away?.name).then((r) => {
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
  }, [match.apiFixtureId, home?.name, away?.name])

  if (state === 'loading') {
    return <div className="px-4 py-5 text-2xs text-faint">Loading report…</div>
  }

  if (state === 'unavailable') {
    return (
      <div className="px-4 py-5">
        <p className="text-xs text-muted">
          Final score recorded. The goal timeline, possession and shots appear here once a live data key is connected.
        </p>
      </div>
    )
  }

  if (!report) return null

  const goals = report.events.filter((e) => e.type.toLowerCase() === 'goal' && !e.detail.toLowerCase().includes('missed'))
  const accentHome = accentCode && match.homeCode === accentCode
  const accentAway = accentCode && match.awayCode === accentCode

  return (
    <div className="space-y-5 px-4 py-5">
      {/* goal timeline */}
      <div>
        <Label>Goals</Label>
        {goals.length === 0 ? (
          <p className="mt-2 text-xs text-faint">No goals.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {goals.map((g, i) => {
              const isHome = g.team === match.homeCode
              return (
                <li key={i} className={cn('flex items-center gap-2 text-sm', isHome ? 'justify-start' : 'flex-row-reverse text-right')}>
                  <span className="w-8 shrink-0 font-grotesk text-xs font-semibold tnum text-muted">{g.minute}&rsquo;</span>
                  <span className="truncate">
                    {g.player}
                    {g.detail.toLowerCase().includes('penalty') && <span className="text-faint"> (pen)</span>}
                    {g.detail.toLowerCase().includes('own') && <span className="text-faint"> (og)</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <StatBar label="Possession" home={report.possession.home} away={report.possession.away} unit="%" accentHome={!!accentHome} accentAway={!!accentAway} />
      <StatRow label="Shots" home={report.shots.home} away={report.shots.away} />
      <StatRow label="On target" home={report.shotsOnTarget.home} away={report.shotsOnTarget.away} />
    </div>
  )
}

function StatBar({
  label,
  home,
  away,
  unit = '',
  accentHome,
  accentAway,
}: {
  label: string
  home: number | null
  away: number | null
  unit?: string
  accentHome: boolean
  accentAway: boolean
}) {
  if (home == null && away == null) return null
  const h = home ?? 0
  const a = away ?? 0
  const total = h + a || 1
  return (
    <div>
      <div className="flex items-center justify-between text-xs tnum">
        <span className={cn(accentHome ? 'font-semibold text-team' : 'text-muted')}>{h}{unit}</span>
        <Label>{label}</Label>
        <span className={cn(accentAway ? 'font-semibold text-team' : 'text-muted')}>{a}{unit}</span>
      </div>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-sunken">
        <div className={cn('h-full', accentHome ? 'bg-team' : 'bg-muted/50')} style={{ width: `${(h / total) * 100}%` }} />
        <div className="h-full w-px bg-canvas" />
        <div className={cn('h-full flex-1', accentAway ? 'bg-team' : 'bg-muted/50')} />
      </div>
    </div>
  )
}

function StatRow({ label, home, away }: { label: string; home: number | null; away: number | null }) {
  if (home == null && away == null) return null
  return (
    <div className="flex items-center justify-between text-sm tnum">
      <span className="w-10 text-muted">{home ?? '–'}</span>
      <Label>{label}</Label>
      <span className="w-10 text-right text-muted">{away ?? '–'}</span>
    </div>
  )
}
