import { useState } from 'react'
import { CalendarDays, GitFork, Hexagon, Trophy, Users } from 'lucide-react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { DATA_META } from '@/data/meta'
import { AppProvider, useApp } from '@/state/store'
import { GamesProvider } from '@/state/games'
import { AuthProvider } from '@/state/auth'
import { ThemeProvider, useTheme } from '@/state/theme'
import { LangProvider } from '@/state/lang'
import { authEnabled } from '@/lib/supabase'
import { useT } from '@/lib/useT'
import { useTName } from '@/lib/useTName'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TeamPicker } from '@/components/TeamPicker'
import { AuthButton } from '@/components/AuthButton'
import { RequireAuth } from '@/components/RequireAuth'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LangToggle } from '@/components/ui/LangToggle'
import { cn } from '@/lib/utils'
import { Predict } from '@/screens/Predict'
import { Fantasy } from '@/screens/Fantasy'
import { Team } from '@/screens/Team'
import { Schedule } from '@/screens/Schedule'
import { Gallery } from '@/screens/Gallery'
import { Leaderboard } from '@/screens/Leaderboard'

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <AppProvider>
              <GamesProvider>
                <BrowserRouter>
                  <Shell />
                </BrowserRouter>
              </GamesProvider>
            </AppProvider>
          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function Shell() {
  const { homeCode, homeTeam, setHomeCode, connected } = useApp()
  const { isDark } = useTheme()
  const t = useT()
  const tName = useTName()
  const [pickerOpen, setPickerOpen] = useState(false)

  // Onboarding gate — no home team yet, or the user chose to change it.
  if (!homeCode || pickerOpen) {
    return (
      <TeamPicker
        current={homeCode}
        onPick={(code) => {
          setHomeCode(code)
          setPickerOpen(false)
        }}
        onClose={homeCode ? () => setPickerOpen(false) : undefined}
      />
    )
  }

  const TABS = [
    { to: '/predict', label: t.navPredict, short: t.navPredict, end: false, icon: GitFork },
    { to: '/fantasy', label: t.navFantasy, short: t.navFantasy, end: false, icon: Users },
    { to: '/team', label: t.navTeam, short: t.navTeam, end: false, icon: Hexagon },
    { to: '/schedule', label: t.navSchedule, short: t.navScheduleShort, end: false, icon: CalendarDays },
    ...(authEnabled ? [{ to: '/league', label: t.navLeague, short: t.navLeague, end: false, icon: Trophy }] : []),
  ]

  return (
    <div className="relative flex min-h-dvh flex-col text-ink">
      <div className="app-backdrop app-backdrop--light" style={{ opacity: isDark ? 0 : 1 }} aria-hidden />
      <div className="app-backdrop app-backdrop--dark" style={{ opacity: isDark ? 1 : 0 }} aria-hidden />
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-black/[0.03] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-baseline gap-2">
            <span className="font-grotesk text-lg font-semibold tracking-tight">homeside</span>
            <span className="label hidden sm:inline">2026</span>
          </div>

          <Nav tabs={TABS} className="hidden sm:flex" />

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-pill border py-1 pl-1 pr-1 transition-colors hover:border-ink/30 sm:pr-3"
              title={t.navTeam}
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full font-grotesk text-[10px] font-bold"
                style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}
              >
                {homeTeam?.code}
              </span>
              <span className="hidden text-xs font-medium sm:inline">{tName(homeTeam)}</span>
            </button>
            <AuthButton />
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-6 sm:px-8">
        <Routes>
          <Route path="/" element={<Navigate to="/schedule" replace />} />
          <Route path="/predict" element={<RequireAuth><Predict /></RequireAuth>} />
          <Route path="/fantasy" element={<RequireAuth><Fantasy /></RequireAuth>} />
          <Route path="/team" element={<Team />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/gallery" element={<Gallery />} />
          {authEnabled && <Route path="/league" element={<Leaderboard />} />}
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-black/[0.06] pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-2xs text-faint sm:px-8">
          <span>
            {connected ? t.footerConnected : t.footerSnapshot(DATA_META.asOf)} {t.footerNoSim}
          </span>
          <span>{t.footerCredit}</span>
        </div>
      </footer>

      <BottomNav tabs={TABS} />
    </div>
  )
}

interface Tab { to: string; label: string; short: string; end: boolean; icon: React.ElementType }

function BottomNav({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-black/[0.03] backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-white/[0.04] sm:hidden">
      <div className="flex items-stretch justify-around">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors', isActive ? 'text-team' : 'text-faint')
              }
            >
              <Icon size={18} strokeWidth={2} />
              {t.short}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

function Nav({ tabs, className }: { tabs: Tab[]; className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn('relative rounded-pill px-3 py-1.5 text-sm font-medium transition-colors', isActive ? 'text-ink' : 'text-faint hover:text-muted')
          }
        >
          {({ isActive }) => (
            <>
              {t.label}
              {isActive && <span className="absolute inset-x-3 -bottom-[13px] hidden h-0.5 rounded-full bg-team sm:block" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
