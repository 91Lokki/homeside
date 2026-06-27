import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import type { Team } from '@/domain/types'
import { readableInkOn, rgba, teamFillColor } from '@/lib/prng'
import { useTheme } from '@/state/theme'
import { cn } from '@/lib/utils'
import { Flag } from './Flag'
import { Mascot } from './mascot/Mascot'
import { Label } from './ui/atoms'

// One glass treatment, adapting to light/dark via the same tokens as the rest of
// the app — so this screen is no longer permanently dark.
const GLASS = 'bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10'

/** A soft top wash in a team's color that reads on either theme (or none). */
function teamWash(color: string | undefined, isDark: boolean): string | undefined {
  if (!color) return undefined
  return `linear-gradient(180deg, ${rgba(color, isDark ? 0.22 : 0.12)} 0%, transparent 42%)`
}

export function TeamPicker({
  current,
  onPick,
  onClose,
}: {
  current: string | null
  onPick: (code: string) => void
  onClose?: () => void
}) {
  const { isDark } = useTheme()
  const [query, setQuery] = useState('')
  const [preview, setPreview] = useState<Team | null>(null)

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return GROUP_IDS.map((g) => ({
      id: g,
      teams: TEAMS.filter(
        (t) => t.group === g && (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q) || (t.nameTC ?? '').includes(q)),
      ),
    })).filter((grp) => grp.teams.length > 0)
  }, [query])

  if (preview) {
    return <MeetView team={preview} onBack={() => setPreview(null)} onConfirm={() => onPick(preview.code)} isCurrent={preview.code === current} />
  }

  const wash = teamWash(current ? teamByCode[current]?.color : undefined, isDark)

  return (
    <div className="relative min-h-dvh bg-canvas text-ink animate-fade-in">
      {wash && <div className="pointer-events-none fixed inset-0 z-0" style={{ background: wash }} />}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <Label>Homeside · 2026</Label>
            <h1 className="mt-3 font-grotesk text-4xl font-bold tracking-tight sm:text-5xl">Pick a home team.</h1>
            <p className="mt-3 text-muted">
              Choose one nation to follow all summer. It becomes your home base — a little mascot to keep company as the
              team plays its real matches.
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:text-ink', GLASS)}>
              <X size={16} />
            </button>
          )}
        </div>

        <div className={cn('mt-8 flex items-center gap-2 rounded-pill px-4 py-3', GLASS)}>
          <Search size={16} className="text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 48 teams…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
        </div>

        <div className="mt-10 space-y-8">
          {grouped.map((grp) => (
            <section key={grp.id}>
              <p className="ml-1 text-2xs font-semibold uppercase tracking-label text-faint">Group {grp.id}</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {grp.teams.map((t) => (
                  <button
                    key={t.code}
                    onClick={() => setPreview(t)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition hover:bg-black/[0.07] dark:hover:bg-white/[0.1]',
                      GLASS,
                      t.code === current && 'ring-2 ring-ink/40 dark:ring-white/50',
                    )}
                  >
                    <Flag code={t.code} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-tight text-ink">{t.name}</span>
                      {t.nameTC && <span className="block truncate font-tc text-xs text-faint">{t.nameTC}</span>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function MeetView({ team, onBack, onConfirm, isCurrent }: { team: Team; onBack: () => void; onConfirm: () => void; isCurrent: boolean }) {
  const { isDark } = useTheme()
  const btnBg = teamFillColor(team.color, team.color2, isDark)
  const ink = readableInkOn(btnBg)

  return (
    <div className="relative min-h-dvh bg-canvas text-ink animate-fade-in">
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: teamWash(team.color, isDark) }} />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12 sm:px-10">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> All teams
        </button>

        <div className="grid items-center gap-10 sm:grid-cols-2">
          <div className="order-2 flex justify-center sm:order-1">
            <Mascot code={team.code} color={team.color} color2={team.color2} symbol={team.symbol} mood="new" size={260} />
          </div>

          <div className="order-1 sm:order-2">
            <p className="text-2xs font-semibold uppercase tracking-label text-faint">Group {team.group} · your home team</p>
            <div className="mt-3 flex items-center gap-3.5">
              <Flag code={team.code} size={44} />
              <h1 className="font-grotesk text-4xl font-bold tracking-tight">{team.name}</h1>
            </div>
            {team.nameTC && <p className="mt-1 font-tc text-lg text-muted">{team.nameTC}</p>}

            <p className="mt-5 max-w-sm text-muted">
              This is your home base — its little mascot, tinted in {team.name}&rsquo;s colours and shaped by its{' '}
              <span className="text-ink">{team.symbol.toLowerCase()}</span>, plus an ability card built from real stats. Then
              play the bracket prediction and fantasy games.
            </p>

            <button
              onClick={onConfirm}
              style={{ background: btnBg, color: ink }}
              className="mt-8 rounded-pill px-6 py-3 text-sm font-bold transition-transform duration-300 ease-calm hover:-translate-y-0.5"
            >
              {isCurrent ? 'Back to home base' : 'Begin the season together'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
