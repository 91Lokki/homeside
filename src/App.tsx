import { useState } from 'react'
import { CalendarDays, GitFork, Hexagon, Home as HomeIcon, Users } from 'lucide-react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { DATA_META } from '@/data/meta'
import { AppProvider, useApp } from '@/state/store'
import { GamesProvider } from '@/state/games'
import { ThemeProvider } from '@/state/theme'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TeamPicker } from '@/components/TeamPicker'
import { cn } from '@/lib/utils'
import { Home } from '@/screens/Home'
import { Predict } from '@/screens/Predict'
import { Fantasy } from '@/screens/Fantasy'
import { Team } from '@/screens/Team'
import { Schedule } from '@/screens/Schedule'
import { Gallery } from '@/screens/Gallery'

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProvider>
          <GamesProvider>
            <BrowserRouter>
              <Shell />
            </BrowserRouter>
          </GamesProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function Shell() {
  const { homeCode, homeTeam, setHomeCode, connected } = useApp()
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

  return (
    <div className="relative flex min-h-dvh flex-col text-white">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--team-pure) 38%, #0b0b14) 0%, #0a0a12 55%, #08080c 100%)' }}
      />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-white/[0.04] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-baseline gap-2">
            <span className="font-grotesk text-lg font-semibold tracking-tight">homeside</span>
            <span className="label hidden sm:inline">2026</span>
          </div>

          <Nav className="hidden sm:flex" />

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-pill border py-1 pl-1 pr-3 transition-colors hover:border-ink/30"
              title="Change team"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full font-grotesk text-[10px] font-bold"
                style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}
              >
                {homeTeam?.code}
              </span>
              <span className="hidden text-xs font-medium sm:inline">{homeTeam?.name}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-6 sm:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/fantasy" element={<Fantasy />} />
          <Route path="/team" element={<Team />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="relative z-10 border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-2xs text-faint sm:px-8">
          <span>
            {connected ? 'Real results & stats via ESPN.' : `Snapshot as of ${DATA_META.asOf}.`} Scored from real
            finished matches only — no simulation.
          </span>
          <span>Homeside · an unofficial 2026 companion</span>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

const TABS = [
  { to: '/', label: 'Home', short: 'Home', end: true, icon: HomeIcon },
  { to: '/predict', label: 'Predict', short: 'Predict', end: false, icon: GitFork },
  { to: '/fantasy', label: 'Fantasy', short: 'Fantasy', end: false, icon: Users },
  { to: '/team', label: 'Team', short: 'Team', end: false, icon: Hexagon },
  { to: '/schedule', label: 'Schedule', short: 'Sched', end: false, icon: CalendarDays },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-white/[0.04] backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="flex items-stretch justify-around">
        {TABS.map((t) => {
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

function Nav({ className }: { className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {TABS.map((t) => (
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
