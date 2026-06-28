import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { accentOn, readableInkOn, rgba } from '@/lib/prng'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeCtx {
  mode: ThemeMode
  isDark: boolean
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

const Ctx = createContext<ThemeCtx | null>(null)
const KEY = 'homeside.theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => (localStorage.getItem(KEY) as ThemeMode) || 'system')
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = mode === 'system' ? systemDark : mode === 'dark'

  // Toggle the `dark` class, and — on every change after the first paint — briefly
  // add `.theme-transition` so the whole UI eases between palettes instead of
  // snapping. The first run just sets the class (no transition on load).
  //
  // ORDER MATTERS: theme-transition must be added BEFORE dark is toggled, then a
  // forced reflow lets the browser capture pre-toggle computed values so the
  // transition animates from old → new. Adding it after the toggle means the
  // CSS vars have already snapped and there is nothing left to animate.
  const firstPaint = useRef(true)
  useEffect(() => {
    const root = document.documentElement
    if (firstPaint.current) {
      firstPaint.current = false
      root.classList.toggle('dark', isDark)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.toggle('dark', isDark)
      return
    }
    root.classList.add('theme-transition')
    // Force a style recalculation so the browser records the current computed
    // values before the dark class (and its CSS vars) change.
    void root.offsetHeight
    root.classList.toggle('dark', isDark)
    const t = window.setTimeout(() => root.classList.remove('theme-transition'), 800)
    return () => window.clearTimeout(t)
  }, [isDark])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(KEY, m)
  }, [])

  const toggle = useCallback(() => {
    setMode(isDark ? 'light' : 'dark')
  }, [isDark, setMode])

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, setMode, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useTheme must be used within ThemeProvider')
  return v
}

/**
 * Paint the app with a team's color. Sets the true color (--team-pure, for
 * fills) and a contrast-safe accent (--team, for text/lines) plus a soft tint
 * and readable ink. Pass null to fall back to neutral.
 */
export function useTeamColor(color: string | null | undefined, isDark: boolean) {
  useEffect(() => {
    const root = document.documentElement
    if (!color) {
      root.style.removeProperty('--team')
      root.style.removeProperty('--team-pure')
      root.style.removeProperty('--team-soft')
      root.style.removeProperty('--team-ink')
      return
    }
    const accent = accentOn(color, isDark)
    root.style.setProperty('--team', accent)
    root.style.setProperty('--team-pure', color)
    root.style.setProperty('--team-soft', rgba(color, isDark ? 0.16 : 0.1))
    root.style.setProperty('--team-ink', readableInkOn(color))
  }, [color, isDark])
}
