import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import { scorePredictions, type Predictions } from '@/domain/predict'
import { scoreFantasyTotal, type ScorableMatch } from '@/domain/fantasy'
import type { RoundSquad, Round } from '@/domain/fantasy'
import type { Match } from '@/domain/types'
import { useMatchDetails } from '@/lib/matchData'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/state/store'
import { useAuth } from '@/state/auth'
import { cn } from '@/lib/utils'
import { Flag } from '@/components/Flag'
import { Label } from '@/components/ui/atoms'

type FantasyRounds = Partial<Record<Round, RoundSquad>>

interface PickRow {
  user_id: string
  email: string | null
  predictions: Predictions | null
  fantasy: FantasyRounds | null
  home_code: string | null
  name: string
}

type SortKey = 'predict' | 'fantasy'

export function Leaderboard() {
  const { status, user, signInWithGoogle } = useAuth()
  const { matches } = useApp()

  const [rows, setRows] = useState<PickRow[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('predict')

  // Pull every participant's stored picks + the friendly-name roster, merge by email.
  useEffect(() => {
    if (!supabase || status !== 'signedIn') return
    let cancelled = false
    void (async () => {
      const [picksRes, membersRes] = await Promise.all([
        supabase.from('picks').select('user_id, email, predictions, fantasy, home_code'),
        supabase.from('members').select('email, display_name'),
      ])
      if (cancelled) return
      if (picksRes.error) {
        setLoadError(picksRes.error.message)
        return
      }
      const nameByEmail = new Map<string, string>(
        (membersRes.data ?? []).map((m) => [String(m.email).toLowerCase(), m.display_name as string]),
      )
      const merged: PickRow[] = (picksRes.data ?? []).map((p) => {
        const email = (p.email as string | null) ?? null
        const name = (email && nameByEmail.get(email.toLowerCase())) || email || 'Player'
        return {
          user_id: p.user_id as string,
          email,
          predictions: p.predictions as Predictions | null,
          fantasy: p.fantasy as FantasyRounds | null,
          home_code: (p.home_code as string | null) ?? null,
          name,
        }
      })
      setRows(merged)
    })()
    return () => {
      cancelled = true
    }
  }, [status])

  // Same source data every client scores from — ESPN results → resolved bracket +
  // finished knockout box scores. Picks differ per person; the results don't.
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
    const scored = (rows ?? []).map((r) => ({
      ...r,
      predict: scorePredictions(r.predictions ?? {}, resolved).points,
      fantasy: scoreFantasyTotal(r.fantasy ?? {}, scorable, details),
    }))
    scored.sort((a, b) => b[sortKey] - a[sortKey] || b.predict + b.fantasy - (a.predict + a.fantasy) || a.name.localeCompare(b.name))
    return scored
  }, [rows, resolved, scorable, details, sortKey])

  const onRoster = !user || board.some((r) => r.user_id === user.id)

  /* --------------------------------- states -------------------------------- */
  if (status === 'unavailable') {
    return <Centered>The league isn’t configured for this build.</Centered>
  }
  if (status === 'loading') {
    return <Centered>Checking your session…</Centered>
  }
  if (status === 'signedOut') {
    return (
      <div className="mx-auto max-w-md py-16 text-center animate-fade-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
          <Trophy size={22} className="text-team" />
        </div>
        <h1 className="mt-5 font-grotesk text-2xl font-bold tracking-tight">The league.</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted">
          Sign in to see how your bracket and fantasy scores stack up against everyone else.
        </p>
        <button
          onClick={() => void signInWithGoogle()}
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-ink px-6 py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-calm hover:-translate-y-0.5"
        >
          Sign in to continue
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <header className="flex items-end justify-between gap-4">
        <div>
          <Label>Homeside · 2026</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-bold tracking-tight sm:text-4xl">League</h1>
        </div>
        <Segmented value={sortKey} onChange={setSortKey} />
      </header>

      {!onRoster && (
        <p className="mt-5 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
          You’re signed in, but not on the league roster yet — ask the organizer to add{' '}
          <span className="font-semibold">{user?.email}</span>.
        </p>
      )}

      {loadError ? (
        <Centered>Couldn’t load the league ({loadError}).</Centered>
      ) : rows === null ? (
        <Centered>Loading the league…</Centered>
      ) : board.length === 0 ? (
        <Centered>No one has joined yet. You’re first — make your picks!</Centered>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-[20px] bg-black/[0.025] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.04] dark:ring-white/10">
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] items-center gap-2 border-b border-black/[0.06] px-4 py-2.5 text-2xs uppercase tracking-label text-faint dark:border-white/10 sm:grid-cols-[3rem_1fr_5rem_5rem]">
              <span>#</span>
              <span>Player</span>
              <button onClick={() => setSortKey('predict')} className={cn('text-right transition-colors', sortKey === 'predict' ? 'text-ink' : 'hover:text-muted')}>
                Predict
              </button>
              <button onClick={() => setSortKey('fantasy')} className={cn('text-right transition-colors', sortKey === 'fantasy' ? 'text-ink' : 'hover:text-muted')}>
                Fantasy
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
                      {isMe && <span className="shrink-0 rounded-full bg-team/15 px-1.5 py-0.5 text-[10px] font-semibold text-team">you</span>}
                    </span>
                    <span className={cn('text-right font-grotesk text-base tnum', sortKey === 'predict' ? 'font-bold text-ink' : 'font-medium text-muted')}>{r.predict}</span>
                    <span className={cn('text-right font-grotesk text-base tnum', sortKey === 'fantasy' ? 'font-bold text-ink' : 'font-medium text-muted')}>{r.fantasy}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <p className="mt-3 px-1 text-2xs text-faint">
            {detailsLoading ? 'Scoring from finished matches…' : 'Scored from real finished matches via ESPN — same math as each game screen.'}
          </p>
        </>
      )}
    </div>
  )
}

function Segmented({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const opts: { key: SortKey; label: string }[] = [
    { key: 'predict', label: 'Predict' },
    { key: 'fantasy', label: 'Fantasy' },
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
