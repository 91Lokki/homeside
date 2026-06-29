import { useEffect, useMemo, useState } from 'react'
import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import { scorePredictions, stampMissingPredictionTimes, type Predictions } from '@/domain/predict'
import { scoreFantasyTotal, type ScorableMatch } from '@/domain/fantasy'
import type { RoundSquad, Round } from '@/domain/fantasy'
import type { Match } from '@/domain/types'
import { useMatchDetails } from '@/lib/matchData'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/state/store'
import { useAuth } from '@/state/auth'
import { useT } from '@/lib/useT'
import { cn } from '@/lib/utils'
import { Flag } from '@/components/Flag'
import { Label } from '@/components/ui/atoms'

type FantasyRounds = Partial<Record<Round, RoundSquad>>

interface PickRow {
  user_id: string
  predictions: Predictions | null
  fantasy: FantasyRounds | null
  home_code: string | null
  name: string
}

type SortKey = 'predict' | 'fantasy'

export function Leaderboard() {
  const { status, user, signInWithGoogle } = useAuth()
  const { matches } = useApp()
  const t = useT()

  const [rows, setRows] = useState<PickRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('predict')

  useEffect(() => {
    if (!supabase || status === 'unavailable' || status === 'loading') return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('user_id, display_name, home_code, predictions, fantasy')
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        return
      }
      const merged: PickRow[] = (data ?? []).map((p) => ({
        user_id: p.user_id as string,
        predictions: p.predictions as Predictions | null,
        fantasy: p.fantasy as FantasyRounds | null,
        home_code: (p.home_code as string | null) ?? null,
        name: ((p.display_name as string | null) ?? '').trim() || 'Player',
      }))
      setRows(merged)
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  const resolved = useMemo(() => resolveBracket(BRACKET, TEAMS, matches), [matches])
  const koMatches = useMemo<(Match & { apiFixtureId: number })[]>(
    () =>
      matches.filter(
        (m): m is Match & { apiFixtureId: number } =>
          m.stage !== 'group' && m.status === 'finished' && !!m.apiFixtureId,
      ),
    [matches],
  )
  const { details, loading: detailsLoading } = useMatchDetails(koMatches.map((m) => m.apiFixtureId))
  const scorable = useMemo<ScorableMatch[]>(
    () => koMatches.map((m) => ({ stage: m.stage, apiFixtureId: m.apiFixtureId, homeCode: m.homeCode, awayCode: m.awayCode })),
    [koMatches],
  )

  const board = useMemo(() => {
    const scored = (rows ?? []).map((r) => {
      const predictions = stampMissingPredictionTimes(r.predictions ?? {}, BRACKET)
      return {
        ...r,
        predict: scorePredictions(predictions, resolved).points,
        fantasy: scoreFantasyTotal(r.fantasy ?? {}, scorable, details),
      }
    })
    scored.sort((a, b) => b[sortKey] - a[sortKey] || b.predict + b.fantasy - (a.predict + a.fantasy) || a.name.localeCompare(b.name))
    return scored
  }, [rows, resolved, scorable, details, sortKey])

  if (status === 'unavailable') {
    return <Centered>The league isn&rsquo;t configured for this build.</Centered>
  }
  if (status === 'loading') {
    return <Centered>{t.leagueSessionCheck}</Centered>
  }

  return (
    <div className="animate-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Label>{t.leagueLabel}</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-bold tracking-tight sm:text-4xl">{t.leagueTitle}</h1>
        </div>
        <Segmented value={sortKey} onChange={setSortKey} />
      </header>

      {status === 'signedOut' && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/[0.035] px-4 py-3 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
          <p className="text-sm text-muted">{t.leagueGuestNote}</p>
          <button
            onClick={() => void signInWithGoogle()}
            className="shrink-0 rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-canvas transition-transform duration-300 ease-calm hover:-translate-y-0.5"
          >
            {t.leagueSignIn}
          </button>
        </div>
      )}

      {loadError ? (
        <Centered>{t.leagueLoadError(loadError)}</Centered>
      ) : rows === null ? (
        <Centered>{t.leagueLoading}</Centered>
      ) : board.length === 0 ? (
        <Centered>{t.leagueEmpty}</Centered>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-[20px] bg-black/[0.025] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/10">
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-2 border-b border-black/[0.06] px-4 py-2.5 text-2xs uppercase tracking-label text-faint dark:border-white/10 sm:grid-cols-[3rem_1fr_5rem_5rem]">
              <span>{t.leagueHashCol}</span>
              <span>{t.leaguePlayerCol}</span>
              <button onClick={() => setSortKey('predict')} className={cn('text-right transition-colors', sortKey === 'predict' ? 'text-ink' : 'hover:text-muted')}>
                {t.navPredict}
              </button>
              <button onClick={() => setSortKey('fantasy')} className={cn('text-right transition-colors', sortKey === 'fantasy' ? 'text-ink' : 'hover:text-muted')}>
                {t.navFantasy}
              </button>
            </div>
            <ul>
              {board.map((r, i) => {
                const isMe = !!user && r.user_id === user.id
                return (
                  <li
                    key={r.user_id}
                    className={cn(
                      'grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-2 px-4 py-3 sm:grid-cols-[3rem_1fr_5rem_5rem]',
                      i > 0 && 'border-t border-black/[0.05] dark:border-white/[0.07]',
                      isMe && 'bg-team/[0.07]',
                    )}
                  >
                    <span className={cn('font-grotesk text-sm font-bold tnum', i < 3 ? 'text-team' : 'text-faint')}>{i + 1}</span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      {r.home_code ? (
                        <Flag code={r.home_code} size={22} />
                      ) : (
                        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-black/[0.06] font-grotesk text-[10px] font-bold text-muted dark:bg-white/10">
                          {r.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 truncate text-sm font-medium text-ink">{r.name}</span>
                      {isMe && <span className="shrink-0 rounded-full bg-team/15 px-1.5 py-0.5 text-[10px] font-semibold text-team">{t.leagueYou}</span>}
                    </span>
                    <span className={cn('text-right font-grotesk text-base tnum', sortKey === 'predict' ? 'font-bold text-ink' : 'font-medium text-muted')}>{r.predict}</span>
                    <span className={cn('text-right font-grotesk text-base tnum', sortKey === 'fantasy' ? 'font-bold text-ink' : 'font-medium text-muted')}>{r.fantasy}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <p className="mt-3 px-1 text-2xs text-faint">
            {detailsLoading ? t.leagueScoring : t.leagueScoringDone}
          </p>
        </>
      )}
    </div>
  )
}

function Segmented({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const t = useT()
  const opts: { key: SortKey; label: string }[] = [
    { key: 'predict', label: t.navPredict },
    { key: 'fantasy', label: t.navFantasy },
  ]
  return (
    <div className="flex rounded-pill bg-black/[0.04] p-0.5 ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-pill px-3.5 py-1.5 text-xs font-semibold transition-colors',
            value === o.key ? 'bg-canvas text-ink shadow-sm' : 'text-faint hover:text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="py-16 text-center text-sm text-muted animate-fade-in">{children}</div>
}
