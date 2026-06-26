import { useEffect, useState } from 'react'
import { teamByCode } from '@/data/teams'
import type { Match } from '@/domain/types'
import { fetchMatchReport, type ApiStatus, type MatchReport as Report } from '@/lib/api'
import { liveDataNote } from '@/lib/apiCopy'

/** The match report — goal timeline + Apple-Sports-style stat comparison. ESPN data. */
export function MatchReport({
  match,
  apiStatus,
  healthKnown,
}: {
  match: Match
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
  const homeColor = (match.homeCode && teamByCode[match.homeCode]?.color) || '#9aa0aa'
  const awayColor = (match.awayCode && teamByCode[match.awayCode]?.color) || '#5b606b'
  // An own goal is shown on the side that benefited (the scoreline), not the scorer's team.
  const sideOf = (g: (typeof goals)[number]) => {
    const home = g.team === match.homeCode
    return g.type === 'Own Goal' ? (home ? 'away' : 'home') : home ? 'home' : 'away'
  }
  const homeGoals = goals.filter((g) => sideOf(g) === 'home')
  const awayGoals = goals.filter((g) => sideOf(g) === 'away')
  const bars: [string, typeof report.possession, string][] = [
    ['Possession %', report.possession, '%'],
    ['Shots', report.shots, ''],
    ['Shots on Goal', report.shotsOnTarget, ''],
    ['Corner Kicks', report.corners, ''],
    ['Total Passes', report.passes, ''],
    ['Passing Accuracy %', report.passAcc, '%'],
    ['Offsides', report.offsides, ''],
    ['Fouls', report.fouls, ''],
    ['Yellow Cards', report.cards, ''],
  ]

  return (
    <div className="px-5 pb-6 pt-1 text-ink">
      {goals.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 pb-4">
          <div className="space-y-1 text-right">{homeGoals.map((g, i) => <GoalLine key={i} g={g} />)}</div>
          <div className="pt-1"><Ball /></div>
          <div className="space-y-1 text-left">{awayGoals.map((g, i) => <GoalLine key={i} g={g} />)}</div>
        </div>
      )}

      <div className="rounded-[16px] bg-black/[0.04] p-4 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
        <p className="mb-3.5 text-center text-sm font-bold">Team Stats</p>
        <div className="space-y-3.5">
          {bars.map(([label, p, unit]) => (
            <CompareBar key={label} label={label} home={p.home} away={p.away} homeColor={homeColor} awayColor={awayColor} unit={unit} />
          ))}
        </div>
      </div>
    </div>
  )
}

function GoalLine({ g }: { g: { player: string; minute: number | null; detail: string } }) {
  return (
    <p className="text-sm leading-snug">
      <span className="font-medium text-ink">{g.player || 'Goal'}</span> <span className="tnum text-muted">{g.minute}&rsquo;</span>
      {g.detail.includes('penalty') && <span className="text-faint"> (pen)</span>}
      {g.detail.includes('own goal') && <span className="text-faint"> (OG)</span>}
    </p>
  )
}

function Ball() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" className="text-ink" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6.8l3.4 2.5-1.3 4h-4.2l-1.3-4z" fill="currentColor" />
    </svg>
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
        <span className="font-grotesk font-bold text-ink">{h}{unit}</span>
        <span className="text-2xs uppercase tracking-label text-faint">{label}</span>
        <span className="font-grotesk font-bold text-ink">{a}{unit}</span>
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
