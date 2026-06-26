import { useMemo, useRef, useState } from 'react'
import { GROUP_IDS, TEAMS, teamByCode } from '@/data/teams'
import { computeGroupStandings } from '@/domain/record'
import type { GroupId, Match } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { MatchReport } from '@/components/MatchReport'
import { useApp } from '@/state/store'
import { cn } from '@/lib/utils'

const GLASS = 'bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10'
const STAND_COLS = 'grid grid-cols-[1.9rem_minmax(0,1fr)_1.4rem_1.3rem_1.3rem_1.3rem_2rem_2rem] items-center gap-1'
const kickoffMs = (m: Match) => new Date(m.kickoff).getTime()
const dayLabel = (m: Match) => new Date(m.kickoff).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const timeLabel = (m: Match) => new Date(m.kickoff).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function Schedule() {
  const { matches, homeCode, homeTeam, apiStatus, healthKnown } = useApp()
  const [group, setGroup] = useState<GroupId>(homeTeam?.group ?? 'A')
  const [openId, setOpenId] = useState<string | null>(null)

  const groupCodes = useMemo(() => TEAMS.filter((t) => t.group === group).map((t) => t.code), [group])
  const standings = useMemo(() => computeGroupStandings(matches, group, groupCodes), [matches, group, groupCodes])

  const byDay = useMemo(() => {
    const fixtures = matches
      .filter((m) => m.stage === 'group' && m.group === group && m.homeCode && m.awayCode)
      .sort((a, b) => kickoffMs(a) - kickoffMs(b))
    const out: { label: string; matches: Match[] }[] = []
    for (const m of fixtures) {
      const label = dayLabel(m)
      const last = out[out.length - 1]
      if (last && last.label === label) last.matches.push(m)
      else out.push({ label, matches: [m] })
    }
    return out
  }, [matches, group])

  return (
    <div className="relative z-10 mx-auto max-w-5xl animate-fade-in text-ink">
      <h1 className="font-grotesk text-3xl font-bold tracking-tight">World Cup</h1>
      <p className="mt-1 text-sm text-muted">{homeTeam ? `Following ${homeTeam.name} · Group ${homeTeam.group}` : '2026'}</p>

      <div className="mt-6 max-w-xl">
        <GroupSlider value={group} onChange={(g) => { setGroup(g); setOpenId(null) }} />
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* standings */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Group {group}</h2>
          <div className={cn('overflow-hidden rounded-[20px]', GLASS)}>
            <div className={cn(STAND_COLS, 'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint')}>
              <span />
              <span>Team</span>
              <span className="text-center">GP</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center">GD</span>
              <span className="text-center">PTS</span>
            </div>
            {standings.map((row, i) => {
              const t = teamByCode[row.code]
              const isHome = row.code === homeCode
              const advancing = i < 2
              const eliminated = i === standings.length - 1 && row.played > 0
              return (
                <div
                  key={row.code}
                  className={cn(
                    STAND_COLS,
                    'border-t px-4 py-3 text-[15px]',
                    i === 2 ? 'border-black/[0.12] dark:border-white/15' : 'border-black/5 dark:border-white/[0.07]',
                    isHome && 'bg-team-soft',
                  )}
                >
                  <span className="flex items-center gap-1 tnum">
                    <span className={cn('w-2 text-[10px]', advancing ? 'text-emerald-500' : eliminated ? 'text-red-400' : 'text-transparent')}>{advancing ? '▲' : '▼'}</span>
                    <span className={cn(advancing ? 'font-semibold text-ink' : 'text-faint')}>{row.rank}</span>
                  </span>
                  <span className="flex items-center gap-2.5 truncate">
                    <Flag code={row.code} size={24} />
                    <span className={cn('truncate font-medium', isHome ? 'text-team' : 'text-ink')}>{t?.name ?? row.code}</span>
                  </span>
                  <span className="text-center tnum text-muted">{row.played}</span>
                  <span className="text-center tnum text-muted">{row.win}</span>
                  <span className="text-center tnum text-muted">{row.draw}</span>
                  <span className="text-center tnum text-muted">{row.loss}</span>
                  <span className="text-center tnum text-muted">{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <span className="text-center font-grotesk font-bold tnum text-ink">{row.points}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-2.5 px-1 text-2xs text-faint">Top two advance, plus the eight best third-placed teams.</p>
        </section>

        {/* fixtures & results */}
        <section>
          <h2 className="mb-3 font-grotesk text-lg font-bold">Fixtures &amp; results</h2>
          <div className="space-y-4">
            {byDay.map((day) => (
              <div key={day.label}>
                <p className="mb-2 ml-1 text-2xs font-semibold uppercase tracking-label text-faint">{day.label}</p>
                <div className={cn('overflow-hidden rounded-[20px]', GLASS)}>
                  {day.matches.map((m, i) => {
                    const open = openId === m.id
                    return (
                      <div key={m.id} className={cn(i > 0 && 'border-t border-black/5 dark:border-white/[0.07]')}>
                        <FixtureRow m={m} open={open} onToggle={() => m.status === 'finished' && setOpenId((c) => (c === m.id ? null : m.id))} />
                        {open && (
                          <div className="animate-fade-in border-t border-black/5 dark:border-white/[0.07]">
                            <MatchReport match={m} apiStatus={apiStatus} healthKnown={healthKnown} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function FixtureRow({ m, open, onToggle }: { m: Match; open: boolean; onToggle: () => void }) {
  const home = m.homeCode ? teamByCode[m.homeCode] : null
  const away = m.awayCode ? teamByCode[m.awayCode] : null
  const finished = m.status === 'finished'
  const live = m.status === 'live'
  const hWin = finished && (m.homeScore ?? 0) > (m.awayScore ?? 0)
  const aWin = finished && (m.awayScore ?? 0) > (m.homeScore ?? 0)

  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative flex w-full items-center justify-center px-4 py-3 text-left transition-colors',
        finished ? 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : 'cursor-default',
        (live || open) && 'bg-team-soft',
      )}
    >
      <span className="absolute left-3.5 text-2xs font-semibold sm:left-4">
        {finished ? (
          <span className="text-faint">FT</span>
        ) : live ? (
          <span className="inline-flex items-center gap-1 text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-live-pulse" />{m.minute ? `${m.minute}'` : 'Live'}</span>
        ) : (
          <span className="text-muted">{timeLabel(m)}</span>
        )}
      </span>

      <div className="grid items-center gap-2.5" style={{ gridTemplateColumns: 'minmax(0,8.5rem) auto 3.5rem auto minmax(0,8.5rem)' }}>
        <span className={cn('truncate text-right text-[15px]', aWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{home?.name ?? m.homeCode}</span>
        <Flag code={m.homeCode} size={26} />
        <span className="flex items-center justify-center gap-1.5 font-grotesk text-xl font-bold tnum">
          {finished || live ? (
            <>
              <span className={cn('w-4 text-right', aWin && 'text-faint')}>{m.homeScore}</span>
              <span className="text-faint">-</span>
              <span className={cn('w-4 text-left', hWin && 'text-faint')}>{m.awayScore}</span>
            </>
          ) : (
            <span className="text-sm font-semibold text-faint">vs</span>
          )}
        </span>
        <Flag code={m.awayCode} size={26} />
        <span className={cn('truncate text-[15px]', hWin ? 'font-medium text-muted' : 'font-semibold text-ink')}>{away?.name ?? m.awayCode}</span>
      </div>
    </button>
  )
}

function GroupSlider({ value, onChange }: { value: GroupId; onChange: (g: GroupId) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState(false)
  const n = GROUP_IDS.length
  const idx = Math.max(0, (GROUP_IDS as readonly string[]).indexOf(value))

  const pickAt = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = 4
    const inner = r.width - pad * 2
    const rel = Math.max(0, Math.min(inner - 1, clientX - r.left - pad))
    const i = Math.max(0, Math.min(n - 1, Math.floor((rel / inner) * n)))
    if (GROUP_IDS[i] !== value) onChange(GROUP_IDS[i])
  }

  return (
    <div
      ref={ref}
      className={cn('relative grid touch-none select-none rounded-pill p-1', GLASS)}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}
      onPointerDown={(e) => { setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); pickAt(e.clientX) }}
      onPointerMove={(e) => drag && pickAt(e.clientX)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
    >
      <div
        className="pointer-events-none absolute bottom-1 top-1 rounded-full transition-[left] duration-300 ease-calm"
        style={{
          width: `calc((100% - 0.5rem) / ${n})`,
          left: `calc(0.25rem + (100% - 0.5rem) * ${idx} / ${n})`,
          background: 'var(--team-pure)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,0,0,0.3)',
        }}
      />
      {GROUP_IDS.map((g, i) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={cn('relative z-10 h-9 rounded-full font-grotesk text-sm font-bold transition-colors duration-200', i === idx ? 'text-team-ink' : 'text-muted hover:text-ink')}
        >
          {g}
        </button>
      ))}
    </div>
  )
}
