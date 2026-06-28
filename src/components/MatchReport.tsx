import { useEffect, useState } from 'react'
import { teamByCode } from '@/data/teams'
import type { Match } from '@/domain/types'
import { fetchMatchReport, type ApiStatus, type MatchReport as Report } from '@/lib/api'
import { teamFillPair } from '@/lib/prng'
import { useTheme } from '@/state/theme'
import { useT } from '@/lib/useT'
import { cn } from '@/lib/utils'

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
  const { isDark } = useTheme()
  const t = useT()

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
    return <div className="px-5 py-5 text-2xs text-faint">{t.reportLoading}</div>
  }

  if (state === 'unavailable') {
    const note = !healthKnown
      ? t.reportChecking
      : apiStatus !== 'ok'
        ? t.liveDataNote(apiStatus)
        : match.apiFixtureId
          ? t.reportUnavailable
          : t.liveDataNote('ok')
    return (
      <div className="px-5 py-5">
        <p className="text-xs text-muted">{t.reportFinalScore} {note}</p>
      </div>
    )
  }

  if (!report) return null

  const goals = report.events.filter((e) => e.type === 'Goal' || e.type === 'Own Goal')
  const homeT = match.homeCode ? teamByCode[match.homeCode] : undefined
  const awayT = match.awayCode ? teamByCode[match.awayCode] : undefined
  const [homeColor, awayColor] = teamFillPair(
    { color: homeT?.color ?? '#9aa0aa', color2: homeT?.color2 ?? '#9aa0aa' },
    { color: awayT?.color ?? '#5b606b', color2: awayT?.color2 ?? '#5b606b' },
    isDark,
  )
  const sideOf = (g: (typeof goals)[number]): 'home' | 'away' => {
    const home = g.team === match.homeCode
    return g.type === 'Own Goal' ? (home ? 'away' : 'home') : home ? 'home' : 'away'
  }
  const timeline = goals
    .map((g) => ({ ...g, side: sideOf(g) }))
    .sort((x, y) => (x.minute ?? 999) - (y.minute ?? 999))

  const sl = t.reportStatLabels
  const bars: [string, typeof report.possession, string][] = [
    [sl[0][0], report.possession, sl[0][2]],
    [sl[1][0], report.shots, sl[1][2]],
    [sl[2][0], report.shotsOnTarget, sl[2][2]],
    [sl[3][0], report.corners, sl[3][2]],
    [sl[4][0], report.passes, sl[4][2]],
    [sl[5][0], report.passAcc, sl[5][2]],
    [sl[6][0], report.offsides, sl[6][2]],
    [sl[7][0], report.fouls, sl[7][2]],
    [sl[8][0], report.cards, sl[8][2]],
  ]
  const hasStats = bars.some(([, p]) => p.home != null || p.away != null)

  return (
    <div className="px-5 pb-7 pt-3 text-ink">
      {timeline.length > 0 && (
        <section className="relative pb-1">
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
                tOG={t.reportOG}
                tPen={t.reportPen}
                tGoal={t.reportGoalFallback}
              />
            ))}
          </ul>
        </section>
      )}

      {hasStats && (
        <section
          className={cn(timeline.length > 0 && 'mt-7 border-t border-black/5 pt-7 dark:border-white/[0.07]')}
        >
          <p className="mb-6 text-center text-2xs uppercase tracking-label text-faint">{t.reportTeamStats}</p>
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

function GoalRow({
  player,
  minute,
  detail,
  side,
  color,
  tOG,
  tPen,
  tGoal,
}: {
  player: string
  minute: number | null
  detail: string
  side: 'home' | 'away'
  color: string
  tOG: string
  tPen: string
  tGoal: string
}) {
  const isHome = side === 'home'
  const tag = detail.includes('own goal') ? tOG : detail.includes('penalty') ? tPen : ''

  const name = (
    <span className="truncate text-sm font-medium text-ink">
      {player || tGoal}
      {tag && <span className="ml-1 font-normal text-faint">{tag}</span>}
    </span>
  )
  const min = minute != null && (
    <span className="shrink-0 font-grotesk text-xs tnum text-muted">{minute}'</span>
  )

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
          <div className="absolute inset-0 bg-black/[0.06] dark:bg-white/[0.08]" />
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: awayColor }} />
            <div className="absolute inset-y-0 left-0" style={{ width: `${homePct}%`, background: homeColor }} />
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
