import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import {
  COUNTRY_QUOTA,
  FREE_TRANSFERS,
  ROUND_LABEL,
  ROUNDS,
  SCORING_RULES,
  SLOTS,
  SLOT_LABEL,
  countTransfers,
  countryCounts,
  playerKey,
  scoreRound,
  stageToRound,
  type Round,
  type Slot,
} from '@/domain/fantasy'
import { currentRound, eliminatedTeams, isRoundLocked, previousRound, roundFirstKickoff } from '@/domain/fantasyRounds'
import type { Match } from '@/domain/types'
import { useMatchDetails } from '@/lib/matchData'
import { Flag } from '@/components/Flag'
import { PlayerPicker } from '@/components/PlayerPicker'
import { KnockoutProgress, type ProgressNode } from '@/components/KnockoutProgress'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

const ROUND_SHORT: Record<Round, string> = { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', FINAL: 'Final' }
const fmtDate = (ms: number | null) => (ms == null ? '' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

export function Fantasy() {
  const { matches } = useApp()
  const { fantasy, setRoundPick, seedRound, setCaptain, setVice, resetFantasy } = useGames()
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)

  // A slow clock so the timeline flips to LIVE at kickoff even between data polls.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])
  const cur = currentRound(now)

  // How many matches each round has, and how many have finished, to tell a
  // round that's still being played from one that's fully done.
  const roundMatchCount = useMemo(() => {
    const c: Partial<Record<Round, number>> = {}
    for (const b of BRACKET) {
      const r = stageToRound(b.stage)
      if (r) c[r] = (c[r] ?? 0) + 1
    }
    return c
  }, [])
  const roundFinished = (r: Round) => matches.filter((m) => stageToRound(m.stage) === r && m.status === 'finished').length
  const roundFullyDone = (r: Round) => isRoundLocked(r, now) && roundFinished(r) >= (roundMatchCount[r] ?? 99)

  // The round in focus: the round currently being played (locked, not finished),
  // otherwise the next round you manage. The five carry forward to it.
  const inPlay = [...ROUNDS].reverse().find((r) => isRoundLocked(r, now) && !roundFullyDone(r))
  const focus: Round = inPlay ?? cur
  const editable = focus === cur && !isRoundLocked(focus, now)

  const prev = previousRound(focus)
  const prevPlayers = (prev && fantasy[prev]?.players) || []

  // Carry the squad forward into the focus round the first time it opens.
  useEffect(() => {
    if (editable && !fantasy[focus] && prev && fantasy[prev]) seedRound(focus, fantasy[prev]!.players)
  }, [editable, focus, prev, fantasy, seedRound])

  const squad = fantasy[focus]
  const players = squad?.players ?? []
  const quotaMax = COUNTRY_QUOTA[focus]
  const counts = countryCounts(players)
  const eliminated = useMemo(() => eliminatedTeams(matches, TEAMS), [matches])

  // box scores for everyone across every round's squad
  const allTeams = useMemo(() => {
    const s = new Set<string>()
    for (const r of ROUNDS) fantasy[r]?.players.forEach((p) => s.add(p.teamCode))
    return s
  }, [fantasy])
  const koMatches = useMemo(
    () =>
      matches.filter(
        (m): m is Match & { apiFixtureId: number } =>
          m.stage !== 'group' && m.status === 'finished' && !!m.apiFixtureId && (allTeams.has(m.homeCode ?? '') || allTeams.has(m.awayCode ?? '')),
      ),
    [matches, allTeams],
  )
  const { details } = useMatchDetails(koMatches.map((m) => m.apiFixtureId))

  const roundScore = useMemo(() => {
    const detailsFor = (round: Round) => (teamCode: string) =>
      koMatches.filter((m) => stageToRound(m.stage) === round && (m.homeCode === teamCode || m.awayCode === teamCode) && details[m.apiFixtureId]).map((m) => details[m.apiFixtureId])
    const out: Partial<Record<Round, ReturnType<typeof scoreRound>>> = {}
    for (const r of ROUNDS) {
      const sq = fantasy[r]
      if (!sq) continue
      out[r] = scoreRound(r, sq, (previousRound(r) && fantasy[previousRound(r)!]?.players) || [], detailsFor(r))
    }
    return out
  }, [fantasy, koMatches, details])

  const totalPoints = ROUNDS.reduce((a, r) => a + (roundScore[r]?.points ?? 0), 0)
  const selScore = roundScore[focus]

  const progressNodes: ProgressNode[] = ROUNDS.map((r) => {
    const done = roundFullyDone(r)
    const live = isRoundLocked(r, now) && !done
    const state = done ? 'done' : live ? 'live' : r === focus ? 'focus' : 'upcoming'
    return { round: r, label: ROUND_SHORT[r], state, points: roundScore[r]?.points, dateLabel: fmtDate(roundFirstKickoff(r)) }
  })

  const transfersUsed = prev ? countTransfers(players, prevPlayers) : 0
  const free = FREE_TRANSFERS[focus]
  const paid = Number.isFinite(free) ? Math.max(0, transfersUsed - free) : 0

  const isCountryFull = (teamCode: string) => {
    const editingTeam = openSlot ? players.find((p) => p.slot === openSlot)?.teamCode : undefined
    return (counts[teamCode] ?? 0) - (editingTeam === teamCode ? 1 : 0) >= quotaMax
  }
  const takenKeys = new Set(players.filter((p) => p.slot !== openSlot).map(playerKey))

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Knockout fantasy</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Your five through the bracket</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none">{selScore?.points ?? 0}</p>
            <p className="text-2xs text-faint">{ROUND_LABEL[focus]} pts</p>
          </div>
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none text-team">{totalPoints}</p>
            <p className="text-2xs text-faint">total</p>
          </div>
        </div>
      </div>

      {/* knockout progress bar — a timeline, not a switcher */}
      <KnockoutProgress nodes={progressNodes} />

      {/* status line */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="font-medium text-ink">{ROUND_LABEL[focus]}</span>
        <span>{editable ? (prev ? 'transfers open' : 'build your five') : 'locked — under way'}</span>
        <span>
          Max <span className="font-medium text-ink">{quotaMax}</span> / country
        </span>
        {prev ? (
          <span>
            Transfers <span className="font-medium text-ink">{transfersUsed}{Number.isFinite(free) ? ` / ${free} free` : ''}</span>
            {paid > 0 && <span className="text-amber-600 dark:text-amber-500"> · −{paid * 3} pts</span>}
          </span>
        ) : (
          <span>unlimited free changes</span>
        )}
      </div>

      {/* the continuous five */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {SLOTS.map((slot) => {
          const pick = players.find((p) => p.slot === slot)
          const key = pick ? playerKey(pick) : null
          const ps = key ? selScore?.perPlayer[key] : undefined
          const team = pick ? teamByCode[pick.teamCode] : null
          const isCap = key && selScore?.effectiveCaptain === key
          const isNominalCap = key && squad?.captain === key
          const isVice = key && squad?.vice === key
          const out = pick ? eliminated.has(pick.teamCode) : false
          return (
            <div key={slot} className={cn('panel flex flex-col p-4', out && 'opacity-70')}>
              <div className="flex items-center justify-between">
                <Label>{SLOT_LABEL[slot]}</Label>
                {ps && <span className="font-grotesk text-sm font-semibold text-team tnum">{ps.final}</span>}
              </div>
              {pick ? (
                <div className="mt-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-grotesk text-base font-medium leading-tight">{pick.name}</p>
                    {(isNominalCap || isCap) && <Badge tone="cap">{isCap ? 'C×2' : 'C'}</Badge>}
                    {isVice && <Badge tone="vice">VC</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-2xs text-faint">
                    <Flag code={pick.teamCode} size={15} />
                    {pick.position} · {team?.name ?? pick.teamCode}
                  </p>
                  {out && (
                    <span className="mt-2 inline-block rounded-[5px] bg-sunken px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-label text-faint">
                      Eliminated
                    </span>
                  )}
                  {ps && ps.detail.matches.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {ps.detail.matches.flatMap((m) => m.lines).map((l, i) => (
                        <li key={i} className="text-2xs text-muted">{l}</li>
                      ))}
                    </ul>
                  )}
                  {editable && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs">
                      <button onClick={() => setCaptain(focus, key!)} className={cn('rounded-pill border px-2 py-0.5', isNominalCap ? 'border-team text-team' : 'text-faint hover:text-ink')}>
                        Captain
                      </button>
                      <button onClick={() => setVice(focus, key!)} className={cn('rounded-pill border px-2 py-0.5', isVice ? 'border-team text-team' : 'text-faint hover:text-ink')}>
                        Vice
                      </button>
                      <button onClick={() => setRoundPick(focus, slot, null)} className="ml-auto inline-flex items-center gap-1 text-faint hover:text-ink">
                        <X size={11} /> {out ? 'replace' : 'change'}
                      </button>
                    </div>
                  )}
                </div>
              ) : editable ? (
                <button
                  onClick={() => setOpenSlot(slot)}
                  className="mt-2 flex flex-1 flex-col items-center justify-center gap-1.5 rounded-card border border-dashed py-6 text-faint transition-colors hover:border-ink/30 hover:text-muted"
                >
                  <Plus size={18} />
                  <span className="text-2xs">add {SLOT_LABEL[slot].toLowerCase()}</span>
                </button>
              ) : (
                <p className="mt-2 flex-1 text-2xs text-faint">empty</p>
              )}
            </div>
          )
        })}
      </div>

      {editable && (
        <p className="mt-3 text-2xs text-faint">
          {prev
            ? 'Your five carry over — transfer out anyone (eliminated or not) for this round, then set your Captain.'
            : 'Pick your five, then choose a Captain (×2) and Vice. They carry through every knockout round.'}{' '}
          If the Captain's team doesn't play this round, the Vice is doubled instead.
        </p>
      )}

      <div className="mt-4 flex items-center gap-4">
        {selScore && selScore.transferPenalty > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-500">Transfer penalty this round: −{selScore.transferPenalty} pts</span>
        )}
        <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">reset everything</button>
      </div>

      {/* scoring legend */}
      <section className="mt-8">
        <Label>How points work</Label>
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {SCORING_RULES.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b py-1.5 text-sm">
              <span className="text-muted">{r.label}</span>
              <span className="font-medium tnum">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-2xs text-faint">
          Scored from real ESPN box-score events (goals, assists, cards). Player matching is best-effort by team +
          name. Knockout scoring grades as each real match finishes.
        </p>
      </section>

      {openSlot && (
        <PlayerPicker
          slot={openSlot}
          taken={takenKeys}
          isCountryFull={isCountryFull}
          onClose={() => setOpenSlot(null)}
          onPick={(p) => {
            setRoundPick(focus, openSlot, p)
            setOpenSlot(null)
          }}
        />
      )}
    </div>
  )
}

function Badge({ tone, children }: { tone: 'cap' | 'vice'; children: React.ReactNode }) {
  return (
    <span className={cn('rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold uppercase', tone === 'cap' ? 'bg-team text-team-ink' : 'bg-team-soft text-team')}>
      {children}
    </span>
  )
}
