import { useMemo, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import { GROUP_IDS, TEAMS } from '@/data/teams'
import { SQUADS } from '@/data/squads'
import type { Team } from '@/domain/types'
import { readableInkOn } from '@/lib/prng'
import { cn } from '@/lib/utils'
import { Mascot } from './mascot/Mascot'
import { Label } from './ui/atoms'

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

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <Label>Homeside · 2026</Label>
          <h1 className="mt-3 font-grotesk text-4xl font-medium tracking-tight sm:text-5xl">Pick a home team.</h1>
          <p className="mt-3 text-muted">
            Choose one nation to follow all summer. It becomes your home base — a little mascot to keep company as the
            team plays its real matches.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-muted hover:text-ink">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-pill border bg-surface px-4 py-2.5">
        <Search size={16} className="text-faint" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 48 teams…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>

      <div className="mt-10 space-y-9">
        {grouped.map((grp) => (
          <section key={grp.id}>
            <Label className="ml-1">Group {grp.id}</Label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {grp.teams.map((t) => (
                <button
                  key={t.code}
                  onClick={() => setPreview(t)}
                  className={cn(
                    'group flex items-center gap-3 rounded-card border bg-surface px-3.5 py-3 text-left transition-colors hover:border-ink/30',
                    t.code === current && 'border-team bg-team-soft',
                  )}
                >
                  <span className="grid h-8 w-9 shrink-0 place-items-center rounded-[7px] bg-sunken font-grotesk text-[11px] font-semibold tracking-wide text-muted">
                    {t.code}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium leading-tight">{t.name}</span>
                    {t.nameTC && <span className="block truncate font-tc text-xs text-faint">{t.nameTC}</span>}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function MeetView({ team, onBack, onConfirm, isCurrent }: { team: Team; onBack: () => void; onConfirm: () => void; isCurrent: boolean }) {
  const squad = SQUADS[team.code]
  const ink = readableInkOn(team.color)

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-10 animate-fade-in">
      <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
        <ArrowLeft size={15} /> All teams
      </button>

      <div className="grid items-center gap-10 sm:grid-cols-2">
        <div className="order-2 flex justify-center sm:order-1">
          <Mascot code={team.code} color={team.color} color2={team.color2} symbol={team.symbol} level={2} mood="new" size={300} />
        </div>

        <div className="order-1 sm:order-2">
          <Label>Group {team.group} · meet your mascot</Label>
          <h1 className="mt-3 font-grotesk text-4xl font-medium tracking-tight">{team.name}</h1>
          {team.nameTC && <p className="mt-1 font-tc text-lg text-muted">{team.nameTC}</p>}

          <p className="mt-5 max-w-sm text-muted">
            A calm companion, tinted in {team.name}&rsquo;s colors and shaped by its{' '}
            <span className="text-ink">{team.symbol.toLowerCase()}</span>. It grows only as the team plays — win, draw, or
            lose, you&rsquo;ll keep it company.
          </p>

          {squad && (
            <p className="mt-5 text-sm">
              <span className="text-faint">Star to follow · </span>
              <span className="font-medium">{squad.star.name}</span>
              <span className="text-faint"> · {squad.star.position}</span>
            </p>
          )}

          <button
            onClick={onConfirm}
            style={{ background: team.color, color: ink }}
            className="mt-8 rounded-pill px-6 py-3 text-sm font-semibold transition-transform duration-300 ease-calm hover:-translate-y-0.5"
          >
            {isCurrent ? 'Back to home base' : 'Begin the season together'}
          </button>
        </div>
      </div>
    </div>
  )
}
