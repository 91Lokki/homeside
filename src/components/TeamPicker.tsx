import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import type { Team } from '@/domain/types'
import { readableInkOn } from '@/lib/prng'
import { cn } from '@/lib/utils'
import { Flag } from './Flag'
import { Mascot } from './mascot/Mascot'
import { Label } from './ui/atoms'

const NEUTRAL_BG = 'linear-gradient(180deg, #18181f 0%, #0c0c14 52%, #08080c 100%)'
const teamBg = (color: string) => `linear-gradient(180deg, color-mix(in srgb, ${color} 42%, #0b0b14) 0%, #0a0a12 52%, #08080c 100%)`

export function TeamPicker({
  current,
  onPick,
  onClose,
}: {
  current: string | null
  onPick: (code: string) => void
  onClose?: () => void
}) {
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

  const bg = current && teamByCode[current] ? teamBg(teamByCode[current]!.color) : NEUTRAL_BG

  return (
    <div className="relative min-h-dvh text-white animate-fade-in">
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: bg }} />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <Label>Homeside · 2026</Label>
            <h1 className="mt-3 font-grotesk text-4xl font-bold tracking-tight sm:text-5xl">Pick a home team.</h1>
            <p className="mt-3 text-white/65">
              Choose one nation to follow all summer. It becomes your home base — a little mascot to keep company as the
              team plays its real matches.
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 ring-1 ring-inset ring-white/15 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-8 flex items-center gap-2 rounded-pill bg-white/[0.06] px-4 py-3 ring-1 ring-inset ring-white/12 backdrop-blur-xl">
          <Search size={16} className="text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 48 teams…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </div>

        <div className="mt-10 space-y-8">
          {grouped.map((grp) => (
            <section key={grp.id}>
              <p className="ml-1 text-2xs font-semibold uppercase tracking-label text-white/40">Group {grp.id}</p>
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {grp.teams.map((t) => (
                  <button
                    key={t.code}
                    onClick={() => setPreview(t)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3.5 py-3 text-left ring-1 ring-inset ring-white/10 backdrop-blur-xl transition hover:bg-white/[0.1]',
                      t.code === current && 'ring-2 ring-white/70',
                    )}
                  >
                    <Flag code={t.code} size={30} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold leading-tight text-white">{t.name}</span>
                      {t.nameTC && <span className="block truncate font-tc text-xs text-white/45">{t.nameTC}</span>}
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
  const ink = readableInkOn(team.color)

  return (
    <div className="relative min-h-dvh text-white animate-fade-in">
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: teamBg(team.color) }} />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12 sm:px-10">
        <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <ArrowLeft size={15} /> All teams
        </button>

        <div className="grid items-center gap-10 sm:grid-cols-2">
          <div className="order-2 flex justify-center sm:order-1">
            <Mascot code={team.code} color={team.color} color2={team.color2} symbol={team.symbol} mood="new" size={260} />
          </div>

          <div className="order-1 sm:order-2">
            <p className="text-2xs font-semibold uppercase tracking-label text-white/45">Group {team.group} · your home team</p>
            <div className="mt-3 flex items-center gap-3.5">
              <Flag code={team.code} size={44} />
              <h1 className="font-grotesk text-4xl font-bold tracking-tight">{team.name}</h1>
            </div>
            {team.nameTC && <p className="mt-1 font-tc text-lg text-white/55">{team.nameTC}</p>}

            <p className="mt-5 max-w-sm text-white/70">
              This is your home base — its little mascot, tinted in {team.name}&rsquo;s colours and shaped by its{' '}
              <span className="text-white">{team.symbol.toLowerCase()}</span>, plus an ability card built from real stats. Then
              play the bracket prediction and fantasy games.
            </p>

            <button
              onClick={onConfirm}
              style={{ background: team.color, color: ink }}
              className="mt-8 rounded-pill px-6 py-3 text-sm font-bold shadow-lg transition-transform duration-300 ease-calm hover:-translate-y-0.5"
            >
              {isCurrent ? 'Back to home base' : 'Begin the season together'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
