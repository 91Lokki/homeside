import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { teamByCode } from '@/data/teams'
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
import { currentRound, eliminatedTeams, isRoundLocked, previousRound } from '@/domain/fantasyRounds'
import { TEAMS } from '@/data/teams'
import type { Match } from '@/domain/types'
import { useMatchDetails } from '@/lib/matchData'
import { PlayerPicker } from '@/components/PlayerPicker'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

export function Fantasy() {
  const { matches } = useApp()
  const { fantasy, setRoundPick, seedRound, setCaptain, setVice, resetFantasy } = useGames()

  const now = Date.now()
  const cur = currentRound(now)
  const [selected, setSelected] = useState<Round>(cur)
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)

  const prev = previousRound(selected)
  const prevPlayers = (prev && fantasy[prev]?.players) || []
  const editable = selected === cur && !isRoundLocked(selected, now)

  // Carry the squad forward into the current round the first time it's opened.
  useEffect(() => {
    if (selected === cur && !fantasy[cur] && prev && fantasy[prev]) seedRound(cur, fantasy[prev]!.players)
  }, [selected, cur, prev, fantasy, seedRound])

  const squad = fantasy[selected]
  const players = squad?.players ?? []
  const quotaMax = COUNTRY_QUOTA[selected]
  const counts = countryCounts(players)
  const eliminated = useMemo(() => eliminatedTeams(matches, TEAMS), [matches])

  // finished knockout matches for everyone in any round's squad → fetch box scores
  const allTeams = useMemo(() => {
    const s = new Set<string>()
    for (const r of ROUNDS) fantasy[r]?.players.forEach((p) => s.add(p.teamCode))
    return s
  }, [fantasy])
  const koMatches = useMemo(
    () => matches.filter((m): m is Match & { apiFixtureId: number } => m.stage !== 'group' && m.status === 'finished' && !!m.apiFixtureId && (allTeams.has(m.homeCode ?? '') || allTeams.has(m.awayCode ?? ''))),
    [matches, allTeams],
  )
  const { details } = useMatchDetails(koMatches.map((m) => m.apiFixtureId))

  const roundScore = useMemo(() => {
    const detailsFor = (round: Round) => (teamCode: string) =>
      koMatches
        .filter((m) => stageToRound(m.stage) === round && (m.homeCode === teamCode || m.awayCode === teamCode) && details[m.apiFixtureId])
        .map((m) => details[m.apiFixtureId])
    const out: Partial<Record<Round, ReturnType<typeof scoreRound>>> = {}
    for (const r of ROUNDS) {
      const sq = fantasy[r]
      if (!sq) continue
      out[r] = scoreRound(r, sq, (previousRound(r) && fantasy[previousRound(r)!]?.players) || [], detailsFor(r))
    }
    return out
  }, [fantasy, koMatches, details])

  const totalPoints = ROUNDS.reduce((a, r) => a + (roundScore[r]?.points ?? 0), 0)
  const selScore = roundScore[selected]
  const picksDone = players.length === 5

  const transfersUsed = prev ? countTransfers(players, prevPlayers) : 0
  const free = FREE_TRANSFERS[selected]
  const paid = Number.isFinite(free) ? Math.max(0, transfersUsed - free) : 0

  // quota check used by the picker (excludes the slot currently being edited)
  const isCountryFull = (teamCode: string) => {
    const editingTeam = openSlot ? players.find((p) => p.slot === openSlot)?.teamCode : undefined
    const c = (counts[teamCode] ?? 0) - (editingTeam === teamCode ? 1 : 0)
    return c >= quotaMax
  }
  const takenKeys = new Set(players.filter((p) => p.slot !== openSlot).map(playerKey))

  return (
    <div className="animate-fade-in">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Knockout fantasy</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Your five</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none">{selScore?.points ?? 0}</p>
            <p className="text-2xs text-faint">{ROUND_LABEL[selected]} pts</p>
          </div>
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none text-team">{totalPoints}</p>
            <p className="text-2xs text-faint">total</p>
          </div>
        </div>
      </div>

      {/* round tabs */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ROUNDS.map((r) => {
          const locked = isRoundLocked(r, now)
          return (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={cn(
                'rounded-pill px-3 py-1.5 text-xs font-medium transition-colors',
                r === selected ? 'bg-team text-team-ink' : 'border text-muted hover:text-ink',
              )}
            >
              {ROUND_LABEL[r]}
              {r === cur && <span className="ml-1 text-[9px] uppercase opacity-70">now</span>}
              {locked && r !== cur && <span className="ml-1 text-[9px] uppercase opacity-50">locked</span>}
            </button>
          )
        })}
      </div>

      {/* status + transfers */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span>
          {editable ? 'Editable now' : selected === cur ? 'Locked (round under way)' : isRoundLocked(selected, now) ? 'Locked — past round' : 'Opens when this round begins'}
        </span>
        <span>
          Max <span className="font-medium text-ink">{quotaMax}</span> per country
        </span>
        {prev && (
          <span>
            Transfers{' '}
            <span className="font-medium text-ink">
              {transfersUsed}
              {Number.isFinite(free) ? ` / ${free} free` : ''}
            </span>
            {paid > 0 && <span className="text-amber-600 dark:text-amber-500"> · −{paid * 3} pts</span>}
          </span>
        )}
        {!prev && <span>Initial squad · unlimited free changes</span>}
      </div>

      {/* the five slots */}
      {!squad && !editable ? (
        <div className="panel p-6 text-sm text-muted">
          This round opens once {prev ? ROUND_LABEL[prev] : 'the tournament'} is under way — you'll carry your squad
          forward and make transfers here.
        </div>
      ) : (
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
              <div key={slot} className={cn('panel flex flex-col p-4', out && 'opacity-60')}>
                <div className="flex items-center justify-between">
                  <Label>{SLOT_LABEL[slot]}</Label>
                  {ps && <span className="font-grotesk text-sm font-semibold text-team tnum">{ps.final}</span>}
                </div>
                {pick ? (
                  <div className="mt-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-grotesk text-base font-medium leading-tight">{pick.name}</p>
                      {(isNominalCap || isCap) && <Badge tone="cap">{isCap ? 'C×2' : 'C'}</Badge>}
                      {isVice && <Badge tone="vice">VC</Badge>}
                    </div>
                    <p className="mt-0.5 text-2xs text-faint">
                      {pick.position} · {team?.name ?? pick.teamCode}
                      {out && <span className="text-faint"> · eliminated</span>}
                    </p>
                    {ps && ps.detail.matches.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {ps.detail.matches.flatMap((m) => m.lines).map((l, i) => (
                          <li key={i} className="text-2xs text-muted">{l}</li>
                        ))}
                      </ul>
                    )}
                    {editable && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs">
                        <button onClick={() => setCaptain(selected, key!)} className={cn('rounded-pill border px-2 py-0.5', isNominalCap ? 'border-team text-team' : 'text-faint hover:text-ink')}>
                          Captain
                        </button>
                        <button onClick={() => setVice(selected, key!)} className={cn('rounded-pill border px-2 py-0.5', isVice ? 'border-team text-team' : 'text-faint hover:text-ink')}>
                          Vice
                        </button>
                        <button onClick={() => setRoundPick(selected, slot, null)} className="ml-auto inline-flex items-center gap-1 text-faint hover:text-ink">
                          <X size={11} /> change
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
      )}

      {/* captain helper */}
      {editable && (
        <p className="mt-3 text-2xs text-faint">
          Choose a Captain (points ×2 this round) and a Vice. If your Captain's team doesn't play this round, the Vice's
          points are doubled instead.{!picksDone && ' Pick all five to complete your squad.'}
        </p>
      )}

      {/* transfer-penalty + reset */}
      <div className="mt-4 flex items-center gap-4">
        {selScore && selScore.transferPenalty > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-500">Transfer penalty this round: −{selScore.transferPenalty} pts</span>
        )}
        <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">reset everything</button>
      </div>

      {/* tracking: eliminated players in the squad */}
      {players.some((p) => eliminated.has(p.teamCode)) && (
        <p className="mt-3 text-2xs text-amber-600 dark:text-amber-500">
          Eliminated (won't score again): {players.filter((p) => eliminated.has(p.teamCode)).map((p) => p.name).join(', ')} — transfer them out next round.
        </p>
      )}

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
          Scored from real Highlightly box-score events. Shootout kicks (+2 / −1) are detected separately from in-play
          penalties and never affect clean sheets. Player matching is best-effort by team + name/number; unmatched
          scorers are logged.
        </p>
      </section>

      {openSlot && (
        <PlayerPicker
          slot={openSlot}
          taken={takenKeys}
          isCountryFull={isCountryFull}
          onClose={() => setOpenSlot(null)}
          onPick={(p) => {
            setRoundPick(selected, openSlot, p)
            setOpenSlot(null)
          }}
        />
      )}
    </div>
  )
}

function Badge({ tone, children }: { tone: 'cap' | 'vice'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold uppercase',
        tone === 'cap' ? 'bg-team text-team-ink' : 'bg-team-soft text-team',
      )}
    >
      {children}
    </span>
  )
}
