import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { SEED_MATCHES } from '@/data/fixtures'
import { teamByCode } from '@/data/teams'
import type { Match, Team } from '@/domain/types'
import { fetchLiveMatches, mergeMatches } from '@/lib/api'
import { useTeamColor, useTheme } from './theme'

const TEAM_KEY = 'homeside.team'
const POLL_MS = 45_000

interface AppCtx {
  homeCode: string | null
  homeTeam: Team | null
  setHomeCode: (code: string | null) => void
  matches: Match[]
  /** true once live data has actually been merged in */
  isLive: boolean
  lastUpdated: number | null
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { isDark } = useTheme()
  const [homeCode, setHomeCodeState] = useState<string | null>(() => localStorage.getItem(TEAM_KEY))
  const [live, setLive] = useState<Match[] | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  const setHomeCode = useCallback((code: string | null) => {
    setHomeCodeState(code)
    if (code) localStorage.setItem(TEAM_KEY, code)
    else localStorage.removeItem(TEAM_KEY)
  }, [])

  // Live polling — pauses when the tab is hidden (calm + rate-limit friendly).
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      const result = await fetchLiveMatches()
      if (cancelled) return
      if (result) {
        setLive(result)
        setLastUpdated(Date.now())
      }
    }
    const start = () => {
      void tick()
      timer.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') void tick()
      }, POLL_MS)
    }
    start()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      if (timer.current) window.clearInterval(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const matches = useMemo(() => (live ? mergeMatches(SEED_MATCHES, live) : SEED_MATCHES), [live])
  const homeTeam = homeCode ? teamByCode[homeCode] ?? null : null

  useTeamColor(homeTeam?.color, isDark)

  const value = useMemo<AppCtx>(
    () => ({ homeCode, homeTeam, setHomeCode, matches, isLive: live !== null, lastUpdated }),
    [homeCode, homeTeam, setHomeCode, matches, live, lastUpdated],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used within AppProvider')
  return v
}
