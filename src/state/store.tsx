import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SEED_MATCHES } from '@/data/fixtures'
import { teamByCode } from '@/data/teams'
import type { Match, Team } from '@/domain/types'
import { fetchResultsWithHealth, mergeMatches, type ApiHealth, type ApiStatus } from '@/lib/api'
import { liveMatchDates } from '@/domain/fantasyRounds'
import { useTeamColor, useTheme } from './theme'

const TEAM_KEY = 'homeside.team'
// Baseline results feed: refresh on load, then every few hours. Most days nothing
// is on, so this stays near-zero against the daily API budget.
const REFRESH_MS = 3 * 60 * 60 * 1000 // 3 hours
const STALE_MS = 60 * 60 * 1000 // refetch on tab focus only if older than 1 hour
// While ANY match is on (and the tab is open), poll that day's results this often
// so the live score tracks the game closely. ESPN is free/unlimited, so we can
// afford a brisk cadence; the match clock itself ticks every second on the client
// (see Schedule), re-anchored to the feed on each poll.
const LIVE_MS = 10 * 1000 // 10 seconds

/** Merge freshly-fetched matches into the accumulated set by stable id. */
function upsertById(base: Match[], incoming: Match[]): Match[] {
  const out = base.slice()
  const idx = new Map(out.map((m, i) => [m.id, i]))
  for (const m of incoming) {
    const i = idx.get(m.id)
    if (i != null) out[i] = m
    else {
      idx.set(m.id, out.length)
      out.push(m)
    }
  }
  return out
}

interface AppCtx {
  homeCode: string | null
  homeTeam: Team | null
  setHomeCode: (code: string | null) => void
  matches: Match[]
  /** true once real results from the API have been merged over the seed */
  connected: boolean
  lastUpdated: number | null
  /** what the live feed is doing right now, so screens can be honest about it */
  apiStatus: ApiStatus
  apiReason?: string
  /** false until the first fetch has actually reported the feed status, so the
   *  UI never asserts "no key" before we've checked */
  healthKnown: boolean
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { isDark } = useTheme()
  const [homeCode, setHomeCodeState] = useState<string | null>(() => localStorage.getItem(TEAM_KEY))
  const [results, setResults] = useState<Match[] | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [health, setHealth] = useState<ApiHealth | null>(null) // null = not fetched yet
  const lastFetch = useRef(0)
  const timer = useRef<number | null>(null)

  const setHomeCode = useCallback((code: string | null) => {
    setHomeCodeState(code)
    if (code) localStorage.setItem(TEAM_KEY, code)
    else localStorage.removeItem(TEAM_KEY)
  }, [])

  // Baseline: the whole results feed, occasionally. Plus a fast loop that only
  // does anything while a match (group or knockout) is on AND the tab is visible —
  // so the live score and clock track the game in near-real-time.
  useEffect(() => {
    let cancelled = false
    const liveTimer = { current: null as number | null }

    const baseline = async () => {
      const { matches: r, health: h } = await fetchResultsWithHealth()
      if (cancelled) return
      lastFetch.current = Date.now()
      setHealth(h)
      if (r) {
        setResults(r)
        setLastUpdated(Date.now())
      }
    }

    const live = async () => {
      if (document.visibilityState !== 'visible') return
      const dates = liveMatchDates(Date.now())
      if (!dates.length) return
      const got: Match[] = []
      let lastHealth: ApiHealth | null = null
      for (const d of dates) {
        const { matches: r, health: h } = await fetchResultsWithHealth(d)
        lastHealth = h
        if (r) got.push(...r)
      }
      if (cancelled) return
      if (lastHealth) setHealth(lastHealth) // keep apiStatus truthful during the live window
      if (got.length === 0) return
      lastFetch.current = Date.now()
      setResults((prev) => upsertById(prev ?? [], got))
      setLastUpdated(Date.now())
    }

    void baseline()
    void live() // don't wait a full interval to pick up a match that's already on
    timer.current = window.setInterval(() => void baseline(), REFRESH_MS)
    liveTimer.current = window.setInterval(() => void live(), LIVE_MS)

    // On return to the tab: top up the baseline if stale, and grab fresh results
    // immediately if a match is on right now.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetch.current > STALE_MS) void baseline()
      void live()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timer.current) window.clearInterval(timer.current)
      if (liveTimer.current) window.clearInterval(liveTimer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Real finished results overlay the seed snapshot; with no key we keep the seed.
  const matches = useMemo(() => (results ? mergeMatches(SEED_MATCHES, results) : SEED_MATCHES), [results])
  const homeTeam = homeCode ? teamByCode[homeCode] ?? null : null

  useTeamColor(homeTeam?.color, isDark)

  const value = useMemo<AppCtx>(
    () => ({
      homeCode,
      homeTeam,
      setHomeCode,
      matches,
      connected: results !== null,
      lastUpdated,
      apiStatus: health?.status ?? 'no-key',
      apiReason: health?.reason,
      healthKnown: health !== null,
    }),
    [homeCode, homeTeam, setHomeCode, matches, results, lastUpdated, health],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}
