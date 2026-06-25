import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SEED_MATCHES } from '@/data/fixtures'
import { teamByCode } from '@/data/teams'
import type { Match, Team } from '@/domain/types'
import { fetchResults, mergeMatches } from '@/lib/api'
import { useTeamColor, useTheme } from './theme'

const TEAM_KEY = 'homeside.team'
// Low-frequency results updater (NOT live): refresh on load, then every few
// hours. World Cup results change a handful of times a day at most.
const REFRESH_MS = 3 * 60 * 60 * 1000 // 3 hours
const STALE_MS = 60 * 60 * 1000 // refetch on tab focus only if older than 1 hour

interface AppCtx {
  homeCode: string | null
  homeTeam: Team | null
  setHomeCode: (code: string | null) => void
  matches: Match[]
  /** true once real results from the API have been merged over the seed */
  connected: boolean
  lastUpdated: number | null
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { isDark } = useTheme()
  const [homeCode, setHomeCodeState] = useState<string | null>(() => localStorage.getItem(TEAM_KEY))
  const [results, setResults] = useState<Match[] | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const lastFetch = useRef(0)
  const timer = useRef<number | null>(null)

  const setHomeCode = useCallback((code: string | null) => {
    setHomeCodeState(code)
    if (code) localStorage.setItem(TEAM_KEY, code)
    else localStorage.removeItem(TEAM_KEY)
  }, [])

  // Pull real finished results occasionally. No in-match polling.
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const r = await fetchResults()
      if (cancelled) return
      lastFetch.current = Date.now()
      if (r) {
        setResults(r)
        setLastUpdated(Date.now())
      }
    }

    void refresh()
    timer.current = window.setInterval(() => void refresh(), REFRESH_MS)

    // If the tab has been away for a while, top up on return (still low-frequency).
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetch.current > STALE_MS) {
        void refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      if (timer.current) window.clearInterval(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Real finished results overlay the seed snapshot; with no key we keep the seed.
  const matches = useMemo(() => (results ? mergeMatches(SEED_MATCHES, results) : SEED_MATCHES), [results])
  const homeTeam = homeCode ? teamByCode[homeCode] ?? null : null

  useTeamColor(homeTeam?.color, isDark)

  const value = useMemo<AppCtx>(
    () => ({ homeCode, homeTeam, setHomeCode, matches, connected: results !== null, lastUpdated }),
    [homeCode, homeTeam, setHomeCode, matches, results, lastUpdated],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}
