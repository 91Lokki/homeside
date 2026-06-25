import { MapPin } from 'lucide-react'
import { SQUADS } from '@/data/squads'
import { teamByCode } from '@/data/teams'
import { computeBond, MAX_LEVEL, moodLine } from '@/domain/bond'
import { nextMatchFor, recordFor, resultFor } from '@/domain/record'
import type { Match } from '@/domain/types'
import { AmbientField } from '@/components/AmbientField'
import { Mascot } from '@/components/mascot/Mascot'
import { FormDots, Label, Score } from '@/components/ui/atoms'
import { localDay, localTime, relativeKickoff } from '@/lib/time'
import { useApp } from '@/state/store'
import { useTheme } from '@/state/theme'
import { cn } from '@/lib/utils'

export function HomeBase() {
  const { homeTeam, matches } = useApp()
  const { isDark } = useTheme()
  if (!homeTeam) return null

  const code = homeTeam.code
  const bond = computeBond(matches, code)
  const record = recordFor(matches, code)
  const squad = SQUADS[code]
  const next = nextMatchFor(matches, code)

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Home base · Group {homeTeam.group}</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">{homeTeam.name}</h1>
          {homeTeam.nameTC && <span className="font-tc text-sm text-faint">{homeTeam.nameTC}</span>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        {/* --- mascot + ambiance --- */}
        <section className="panel relative flex flex-col items-center overflow-hidden px-6 pb-7 pt-10">
          <div className="pointer-events-none absolute inset-0 opacity-90">
            <AmbientField seed={code} color={homeTeam.color} isDark={isDark} />
          </div>

          <div className="relative">
            <Mascot
              code={code}
              color={homeTeam.color}
              color2={homeTeam.color2}
              symbol={homeTeam.symbol}
              level={bond.level}
              mood={bond.mood}
              size={300}
            />
          </div>

          <div className="relative mt-4 w-full max-w-sm">
            <div className="flex items-baseline justify-between">
              <span className="font-grotesk text-lg font-medium">{bond.levelName}</span>
              <span className="label">
                Level {bond.level}
                <span className="text-faint"> / {MAX_LEVEL}</span>
              </span>
            </div>

            {/* bond progress — the single team-colored bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-team transition-[width] duration-700 ease-calm"
                style={{ width: `${Math.round(bond.progress * 100)}%` }}
              />
            </div>
            <p className="mt-2.5 text-center text-xs text-muted">
              {moodLine(bond.mood)}{' '}
              {bond.xpForNextLevel != null ? (
                <span className="text-faint">· {bond.xpForNextLevel - bond.xpIntoLevel} to next bond</span>
              ) : (
                <span className="text-faint">· fully grown</span>
              )}
            </p>
          </div>
        </section>

        {/* --- the facts: record, fixture, star --- */}
        <div className="flex flex-col gap-5">
          <RecordCard record={record} played={bond.playedCount} />

          {next ? <NextCard match={next} code={code} /> : <LastCard matches={matches} code={code} />}

          {squad && <StarCard star={squad.star} />}
        </div>
      </div>

      {squad && <SquadStrip notable={squad.notable} />}
    </div>
  )
}

function RecordCard({ record, played }: { record: ReturnType<typeof recordFor>; played: number }) {
  const cells = [
    { k: 'Won', v: record.win },
    { k: 'Drawn', v: record.draw },
    { k: 'Lost', v: record.loss },
  ]
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <Label>Real record</Label>
        <span className="text-2xs text-faint">{played} played</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {cells.map((c, i) => (
          <div key={c.k} className={cn('flex flex-col gap-1', i === 0 && record.win > 0 && 'text-team')}>
            <span className="font-grotesk text-3xl font-medium tnum leading-none">{c.v}</span>
            <span className="label">{c.k}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-2xs text-faint">Goals {record.gf}–{record.ga}</span>
        <FormDots form={record.form} accent />
      </div>
    </section>
  )
}

function opponentOf(m: Match, code: string) {
  const oc = m.homeCode === code ? m.awayCode : m.homeCode
  return oc ? teamByCode[oc] ?? null : null
}

function NextCard({ match, code }: { match: Match; code: string }) {
  const opp = opponentOf(match, code)
  return (
    <section className="panel p-5">
      <div className="flex items-center justify-between">
        <Label>Next match</Label>
        <span className="text-2xs text-team">{relativeKickoff(match.kickoff)}</span>
      </div>
      <p className="mt-3 font-grotesk text-xl font-medium">
        vs {opp?.name ?? match.awayLabel ?? '—'}
      </p>
      <p className="mt-1 text-sm text-muted">
        {localDay(match.kickoff)} · {localTime(match.kickoff)}
      </p>
      {match.city && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-2xs text-faint">
          <MapPin size={12} /> {match.venue}, {match.city}
        </p>
      )}
    </section>
  )
}

function LastCard({ matches, code }: { matches: Match[]; code: string }) {
  const bond = computeBond(matches, code)
  const m = bond.lastMatch
  if (!m) {
    return (
      <section className="panel p-5">
        <Label>Up next</Label>
        <p className="mt-3 text-sm text-muted">The season hasn&rsquo;t kicked off for this team yet. Your mascot is waiting.</p>
      </section>
    )
  }
  const opp = opponentOf(m, code)
  const isHome = m.homeCode === code
  const r = resultFor(m, code)
  return (
    <section className="panel p-5">
      <Label>Latest result</Label>
      <div className="mt-3 flex items-center justify-between">
        <p className="font-grotesk text-xl font-medium">vs {opp?.name ?? '—'}</p>
        <Score home={isHome ? m.homeScore : m.awayScore} away={isHome ? m.awayScore : m.homeScore} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {r === 'W' ? 'A win — the mascot is glowing.' : r === 'D' ? 'A draw — taken in stride.' : 'A tough one — you stayed close.'}
      </p>
    </section>
  )
}

function StarCard({ star }: { star: { name: string; position: string; club?: string; number?: number | null } }) {
  return (
    <section className="panel flex items-center justify-between p-5">
      <div>
        <Label>Star to follow</Label>
        <p className="mt-2 font-grotesk text-xl font-medium">{star.name}</p>
        <p className="mt-0.5 text-sm text-muted">
          {star.position}
          {star.club ? ` · ${star.club}` : ''}
        </p>
      </div>
      {star.number != null && (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-team-soft font-grotesk text-lg font-semibold text-team tnum">
          {star.number}
        </span>
      )}
    </section>
  )
}

function SquadStrip({ notable }: { notable: { name: string; position: string; number?: number | null }[] }) {
  if (notable.length === 0) return null
  return (
    <section className="mt-5">
      <Label>Squad to follow</Label>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {notable.map((p) => (
          <div key={p.name} className="rounded-card border bg-surface p-3">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="mt-0.5 text-2xs text-faint">
              {p.position}
              {p.number != null ? ` · ${p.number}` : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
