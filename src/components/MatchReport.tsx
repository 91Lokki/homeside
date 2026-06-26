import { useEffect, useState } from 'react'
import { teamByCode } from '@/data/teams'
import type { Match } from '@/domain/types'
import { fetchMatchReport, type ApiStatus, type MatchReport as Report } from '@/lib/api'
import { liveDataNote } from '@/lib/apiCopy'
import { cn } from '@/lib/utils'

/**
 * The match report — a center-rail goal timeline + Apple-Sports-style split stat
 * tracks. Renders inline beneath a finished fixture, inside its glass day-panel,
 * so it never repeats the score line and never wraps itself in another box.
 */
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
  const sideOf = (g: (typeof goals)[number]): 'home' | 'away' => {
    const home = g.team === match.homeCode
    return g.type === 'Own Goal' ? (home ? 'away' : 'home') : home ? 'home' : 'away'
  }
  // Every goal hangs off one shared center rail in time order, on the side it counted
  // for. A 3-vs-1 reads as a single chronological story — never two lopsided columns.
  const timeline = goals
    .map((g) => ({ ...g, side: sideOf(g) }))
    .sort((x, y) => (x.minute ?? 999) - (y.minute ?? 999))

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
  const hasStats = bars.some(([, p]) => p.home != null || p.away != null)

  return (
    <div className="px-5 pb-7 pt-3 text-ink">
      {timeline.length > 0 && (
        <section className="relative pb-1">
          {/* The faint vertical rail the whole match hangs from. */}
          <div className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-black/[0.08] dark:bg-white/[0.12]" />
          <ul className="flex flex-col gap-3.5">
            {timeline.map((g, i) => (
              <GoalRow
                key={i}
                player={g.player}
                minute={g.minute}
                detail={g.detail}
                side={g.side}
                color={g.side === 'home' ? homeColor : awayColor}
              />
            ))}
          </ul>
        </section>
      )}

      {hasStats && (
        <section
          className={cn(timeline.length > 0 && 'mt-7 border-t border-black/5 pt-7 dark:border-white/[0.07]')}
        >
          <p className="mb-6 text-center text-2xs uppercase tracking-label text-faint">Team Stats</p>
          <div className="flex flex-col gap-5">
            {bars.map(([label, p, unit]) => (
              <CompareTrack
                key={label}
                label={label}
                home={p.home}
                away={p.away}
                homeColor={homeColor}
                awayColor={awayColor}
                unit={unit}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/** One goal pinned to the center rail on the side it counted for, in time order. */
function GoalRow({
  player,
  minute,
  detail,
  side,
  color,
}: {
  player: string
  minute: number | null
  detail: string
  side: 'home' | 'away'
  color: string
}) {
  const isHome = side === 'home'
  const tag = detail.includes('own goal') ? '(OG)' : detail.includes('penalty') ? '(pen)' : ''

  const name = (
    <span className="truncate text-sm font-medium text-ink">
      {player || 'Goal'}
      {tag && <span className="ml-1 font-normal text-faint">{tag}</span>}
    </span>
  )
  const min = minute != null && (
    <span className="shrink-0 font-grotesk text-xs tnum text-muted">{minute}’</span>
  )

  // The marker sits on the rail, ringed in the page color so it reads as "on" the
  // line. The scorer hugs the rail from the correct side; the far half stays empty.
  const marker = (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-canvas"
      style={{ background: color }}
      aria-hidden="true"
    />
  )

  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      {isHome ? (
        <div className="flex min-w-0 items-center justify-end gap-2">
          {name}
          {min}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}

      {marker}

      {!isHome ? (
        <div className="flex min-w-0 items-center gap-2">
          {min}
          {name}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
    </li>
  )
}

/** A single full-width split track: the two team colors meet at the proportional point. */
function CompareTrack({
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
  const total = h + a
  const empty = total === 0
  // Home's fraction of the always-full-width track; an even split (incl. equal
  // non-zero values) sits at 50%, and 0-0 falls through to a neutral empty track.
  const homePct = empty ? 50 : (h / total) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-grotesk text-base font-bold tnum text-ink">
          {home != null ? `${h}${unit}` : '—'}
        </span>
        <span className="text-2xs uppercase tracking-label text-faint">{label}</span>
        <span className="font-grotesk text-base font-bold tnum text-ink">
          {away != null ? `${a}${unit}` : '—'}
        </span>
      </div>

      <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full">
        {empty ? (
          // 0-0 (or no recorded contest) — a calm neutral track, never a lone dot.
          <div className="absolute inset-0 bg-black/[0.06] dark:bg-white/[0.08]" />
        ) : (
          <>
            {/* Away color fills the whole track; home color overlays from the left. */}
            <div className="absolute inset-0" style={{ background: awayColor }} />
            <div className="absolute inset-y-0 left-0" style={{ width: `${homePct}%`, background: homeColor }} />
            {/* A 1px notch in the page color keeps the meeting point clean. */}
            <div
              className="absolute inset-y-0 w-px -translate-x-1/2 bg-canvas"
              style={{ left: `${homePct}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
    </div>
  )
}
