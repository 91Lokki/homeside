import { useState } from 'react'
import { CalendarDays, Home, Trophy } from 'lucide-react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { DATA_META } from '@/data/meta'
import { AppProvider, useApp } from '@/state/store'
import { ThemeProvider } from '@/state/theme'
import { TeamPicker } from '@/components/TeamPicker'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LiveDot } from '@/components/ui/atoms'
import { cn } from '@/lib/utils'
import { HomeBase } from '@/screens/HomeBase'
import { Schedule } from '@/screens/Schedule'
import { Bracket } from '@/screens/Bracket'

export function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const { homeCode, homeTeam, setHomeCode, isLive } = useApp()
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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-baseline gap-2">
            <span className="font-grotesk text-lg font-semibold tracking-tight">homeside</span>
            <span className="label hidden sm:inline">2026</span>
          </div>

          <Nav className="hidden sm:flex" />

          <div className="flex items-center gap-2.5">
            {isLive && (
              <span className="hidden items-center gap-1.5 text-2xs text-muted sm:flex">
                <LiveDot /> live
              </span>
            )}
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-pill border py-1 pl-1 pr-3 transition-colors hover:border-ink/30"
              title="Change home team"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-full font-grotesk text-[10px] font-bold"
                style={{ background: 'var(--team-pure)', color: 'var(--team-ink)' }}
              >
                {homeTeam?.code}
              </span>
              <span className="hidden text-xs font-medium sm:inline">{homeTeam?.name}</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-6 sm:px-8">
        <Routes>
          <Route path="/" element={<HomeBase />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="*" element={<HomeBase />} />
        </Routes>
      </main>

      <footer className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-4 text-2xs text-faint sm:px-8">
          <span>
            {isLive ? 'Live results via API-Football.' : `Snapshot as of ${DATA_META.asOf}.`} Growth reflects real matches
            only.
          </span>
          <span>Homeside · an unofficial companion · original mascots</span>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-canvas/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
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
              <Icon size={19} strokeWidth={2} />
              {t.short}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

const TABS = [
  { to: '/', label: 'Home base', short: 'Home', end: true, icon: Home },
  { to: '/schedule', label: 'Schedule', short: 'Schedule', end: false, icon: CalendarDays },
  { to: '/bracket', label: 'Bracket', short: 'Bracket', end: false, icon: Trophy },
]

function Nav({ className }: { className?: string }) {
  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              'relative rounded-pill px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
              isActive ? 'text-ink' : 'text-faint hover:text-muted',
            )
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
