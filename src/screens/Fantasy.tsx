import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Crown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import {
  COUNTRY_QUOTA,
  FREE_TRANSFERS,
  ROUND_LABEL,
  ROUNDS,
  POS_ABBR,
  SCORING_RULES,
  SLOT_ALLOWS,
  SLOT_LABEL,
  countTransfers,
  countryCounts,
  playerKey,
  scoreRound,
  stageToRound,
  type PosCat,
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
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'

const ROUND_SHORT: Record<Round, string> = { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', FINAL: 'Final' }
/** Pitch formation rows, own goal (top) → attack (bottom). FLEX shares midfield. */
const FORMATION: Slot[][] = [['GK'], ['DEF'], ['MID', 'FLEX'], ['ATT']]
const fmtDate = (ms: number | null) => (ms == null ? '' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

export function Fantasy() {
  const { matches } = useApp()
  const { fantasy, setRoundPick, seedRound, setCaptain, resetFantasy } = useGames()
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

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

  // A stale selection must not outlive a round change or an edit-state flip.
  useEffect(() => { setSelected(null) }, [focus, editable])

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

  // Where a browsed pick lands: the matching empty slot (exact position, else Flex).
  const slotForPos = (pos: PosCat): Slot | null => {
    if (!players.some((p) => p.slot === pos)) return pos as Slot
    if (pos !== 'GK' && !players.some((p) => p.slot === 'FLEX')) return 'FLEX'
    return null
  }
  // In browse mode, a position is addable only while it (or Flex) still has room.
  const canAdd = (pos: PosCat) => (openSlot ? SLOT_ALLOWS[openSlot].includes(pos) : slotForPos(pos) !== null)
  const teamFull = FORMATION.flat().every((s) => players.some((p) => p.slot === s))

  // Shared body for acting on a filled token — rendered in a desktop popover and
  // a mobile bottom sheet. Captain/Vice are real toggles; the captain can never be
  // offered Vice (no silent no-op). Toggle-off re-sets the same pick, which makes
  // the reducer clear captain/vice for that key — no store change needed.
  const TokenActions = ({ slot, onClose }: { slot: Slot; onClose: () => void }) => {
    const pick = players.find((p) => p.slot === slot)
    if (!pick) return null
    const key = playerKey(pick)
    const ps = selScore?.perPlayer[key]
    const isCap = squad?.captain === key
    const lines = ps?.detail.matches.flatMap((m) => m.lines) ?? []
    const clearRole = () => setRoundPick(focus, slot, { ...pick })
    const row = 'flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors'
    return (
      <>
        <div className="flex items-center gap-2.5">
          <Flag code={pick.teamCode} size={28} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-grotesk text-sm font-medium leading-tight">{pick.name}</p>
            <p className="truncate text-2xs text-faint">
              {POS_ABBR[pick.position] ?? pick.position} · {teamByCode[pick.teamCode]?.name ?? pick.teamCode} · {SLOT_LABEL[slot]}
            </p>
          </div>
          <button onClick={onClose} aria-label="Done" className="shrink-0 rounded-full p-1 text-faint hover:bg-black/[0.05] hover:text-ink dark:hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>

        <div className="mt-2.5 flex flex-col gap-0.5">
          <button
            onClick={() => (isCap ? clearRole() : setCaptain(focus, key))}
            aria-pressed={isCap}
            className={cn(row, isCap ? 'bg-team-soft text-team' : 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]')}
          >
            <Crown size={16} className="shrink-0" />
            <span className="flex-1 text-left">Captain <span className="text-faint">·2</span></span>
            {isCap && <Check size={16} className="shrink-0" />}
          </button>

          <div className="my-1 h-px bg-black/5 dark:bg-white/[0.07]" />

          <button onClick={() => { onClose(); setOpenSlot(slot) }} className={cn(row, 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]')}>
            <Pencil size={16} className="shrink-0" />
            <span className="flex-1 text-left">Change player</span>
          </button>

          <button onClick={() => { setRoundPick(focus, slot, null); onClose() }} className={cn(row, 'text-faint hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400')}>
            <Trash2 size={16} className="shrink-0" />
            <span className="flex-1 text-left">Remove</span>
          </button>
        </div>

        {lines.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 border-t border-black/5 pt-2 dark:border-white/[0.07]">
            {lines.map((l, i) => <li key={i} className="text-2xs text-muted">{l}</li>)}
          </ul>
        )}
      </>
    )
  }

  // One pitch token (filled or empty). Closes over the round state + handlers.
  const renderSlot = (slot: Slot) => {
    const pick = players.find((p) => p.slot === slot)
    if (!pick) {
      if (!editable) {
        return (
          <div key={slot} className="flex w-[88px] flex-col items-center sm:w-[104px]">
            <span className="h-[52px] w-[52px] rounded-full border border-dashed border-black/10 dark:border-white/15" />
            <span className="mt-1.5 text-[9px] font-medium uppercase tracking-label text-faint">{SLOT_LABEL[slot]}</span>
          </div>
        )
      }
      return (
        <button key={slot} type="button" onClick={() => setOpenSlot(slot)} className="group flex w-[88px] flex-col items-center sm:w-[104px]">
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-black/[0.12] text-faint transition-colors group-hover:border-ink/30 group-hover:text-muted dark:border-white/15">
            <Plus size={18} />
          </span>
          <span className="mt-1.5 flex w-full items-center justify-center rounded-[10px] bg-black/[0.03] px-1.5 py-1 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.04] dark:ring-white/[0.06]">
            <span className="truncate text-[9px] font-medium uppercase tracking-label text-faint">{SLOT_LABEL[slot]}</span>
          </span>
        </button>
      )
    }
    const key = playerKey(pick)
    const ps = selScore?.perPlayer[key]
    const team = teamByCode[pick.teamCode]
    const isCap = squad?.captain === key
    const out = eliminated.has(pick.teamCode)
    const active = selected === slot
    // Open the popover toward the pitch centre so a side token's menu never spills
    // off the edge: left token opens right, right token opens left, rest centred.
    const popPos = slot === 'MID' ? 'left-0' : slot === 'FLEX' ? 'right-0' : 'left-1/2 -translate-x-1/2'
    return (
      <div key={slot} className="relative flex w-[88px] flex-col items-center sm:w-[104px]">
        <button
          type="button"
          onClick={() => editable && setSelected(active ? null : slot)}
          aria-pressed={active}
          aria-expanded={active}
          className={cn('group flex flex-col items-center', !editable && 'cursor-default', out && 'opacity-60 saturate-0')}
        >
          <span className="relative">
            <span
              className={cn(
                'grid place-items-center rounded-full bg-black/[0.04] p-[3px] ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10',
                isCap && 'ring-2 ring-[var(--team-pure)]',
                active && !isCap && 'ring-2 ring-ink/40',
              )}
            >
              <Flag code={pick.teamCode} size={46} />
            </span>
            {pick.number != null && (
              <span className="absolute -bottom-1 -right-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-canvas px-1 font-grotesk text-[10px] font-semibold tnum text-muted ring-1 ring-inset ring-black/[0.06] dark:ring-white/10">
                {pick.number}
              </span>
            )}
            {isCap && (
              <span className="absolute -left-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-team px-1 font-grotesk text-[9px] font-bold tnum text-team-ink">
                C×2
              </span>
            )}
          </span>
          <span className="mt-1.5 flex w-full flex-col items-center rounded-[10px] bg-black/[0.04] px-1.5 py-1 text-center ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
            <span className="flex w-full items-center justify-center gap-1">
              <span className="truncate font-grotesk text-xs font-medium leading-tight text-ink">{pick.name}</span>
              {ps && <span className="shrink-0 font-grotesk text-xs font-semibold tnum text-team">{ps.final}</span>}
            </span>
            <span className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-label text-faint">
              {out ? 'Eliminated' : `${POS_ABBR[pick.position] ?? pick.position} · ${team?.name ?? pick.teamCode}`}
            </span>
          </span>
        </button>

        {/* desktop: tap-popover anchored under the token (overlays the pitch) */}
        {editable && active && isDesktop && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSelected(null)} aria-hidden />
            <div className={cn('absolute top-[64px] z-30 w-[240px] animate-fade-in rounded-[18px] bg-canvas p-3 text-left ring-1 ring-inset ring-black/[0.08] backdrop-blur-xl dark:ring-white/10', popPos)}>
              <TokenActions slot={slot} onClose={() => setSelected(null)} />
            </div>
          </>
        )}
      </div>
    )
  }

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

      {!isDesktop && openSlot ? (
        <PlayerPicker
          slot={openSlot}
          taken={takenKeys}
          isCountryFull={isCountryFull}
          onClose={() => setOpenSlot(null)}
          onPick={(p) => {
            if (!openSlot) return
            setRoundPick(focus, openSlot, { slot: openSlot, ...p })
            setOpenSlot(null)
          }}
        />
      ) : (
        <>
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

      {/* desktop: pitch on the left, scoring reference on the right — fills the
          width instead of stranding a narrow pitch in the middle of the page */}
      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="lg:w-[468px] lg:shrink-0">
      {/* the five — an Apple pitch in formation (own goal top, attack bottom).
          No overflow-hidden so a token's action popover can extend past the edge. */}
      <div className="panel relative mx-auto w-full max-w-[440px] px-3 py-5 sm:px-5 sm:py-7">
        {/* implied pitch markings — 1px hairlines only, no green, no fill */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-black/[0.05] dark:bg-white/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/[0.08] dark:bg-white/[0.10]" />
          <div className="absolute left-1/2 top-3 h-11 w-1/2 -translate-x-1/2 rounded-b-[10px] border border-t-0 border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute bottom-3 left-1/2 h-11 w-1/2 -translate-x-1/2 rounded-t-[10px] border border-b-0 border-black/[0.05] dark:border-white/[0.06]" />
        </div>

        <p className="relative mb-2 text-center"><span className="text-[9px] font-medium uppercase tracking-label text-faint">Your goal</span></p>

        <div className="relative flex flex-col gap-4 sm:gap-6">
          {FORMATION.map((row, i) => (
            <div key={i} className="flex items-start justify-center gap-3 sm:gap-6">
              {row.map((slot) => renderSlot(slot))}
            </div>
          ))}
        </div>

        <p className="relative mt-2 text-center"><span className="text-[9px] font-medium uppercase tracking-label text-faint">Attack</span></p>
      </div>

      {/* mobile: a bottom sheet to act on the selected token. Portaled to <body>
          so `fixed` escapes the page's transform (animate-fade-in) and the nav. */}
      {editable && selected && !isDesktop &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 animate-slide-up rounded-t-[24px] bg-canvas p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ring-1 ring-inset ring-black/[0.08] dark:ring-white/10">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/15 dark:bg-white/20" />
              <TokenActions slot={selected} onClose={() => setSelected(null)} />
            </div>
          </div>,
          document.body,
        )}

        </div>

        {/* right (desktop): the player pool, FIFA-style — always present. Tapping a
            pitch slot filters it; otherwise picks drop into the first open spot.
            Hidden on mobile, where tapping a slot opens the full-screen picker. */}
        <div className="hidden lg:block lg:flex-1 lg:min-w-0">
          {!editable ? (
            <div className="panel grid min-h-[200px] place-items-center p-8 text-center text-sm text-muted">
              This round is locked and under way.
            </div>
          ) : teamFull && openSlot == null ? (
            <div className="panel grid min-h-[320px] place-items-center p-8 text-center">
              <div className="max-w-[22rem]">
                <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-team-soft text-team">
                  <Check size={22} />
                </span>
                <p className="font-grotesk text-lg font-semibold tracking-tight">Your five is set</p>
                <p className="mt-1.5 text-sm leading-snug text-muted">
                  Tap a player on the pitch to make them captain, change them, or remove them.
                </p>
              </div>
            </div>
          ) : (
            <PlayerPicker
              slot={openSlot}
              embedded
              canAdd={canAdd}
              taken={takenKeys}
              isCountryFull={isCountryFull}
              onClose={() => setOpenSlot(null)}
              onPick={(p) => {
                const target = openSlot ?? slotForPos(p.position)
                if (!target) return
                setRoundPick(focus, target, { slot: target, ...p })
                setOpenSlot(null)
              }}
            />
          )}
        </div>
      </div>

      {/* scoring reference — always visible at the bottom, but compact */}
      <section className="mt-8">
        <Label>How points work</Label>
        <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {SCORING_RULES.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 border-b py-1 text-2xs">
              <span className="text-muted">{r.label}</span>
              <span className="font-medium tnum text-ink">{r.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-2xs text-faint">
          Scored from real ESPN box-score events (goals, assists, cards). Player matching is best-effort by team + name.
          Knockout scoring grades as each real match finishes.
        </p>
      </section>

      <div className="mt-5 flex items-center gap-4">
        {selScore && selScore.transferPenalty > 0 && (
          <span className="text-xs text-amber-600 dark:text-amber-500">Transfer penalty this round: −{selScore.transferPenalty} pts</span>
        )}
        <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">reset everything</button>
      </div>
        </>
      )}
    </div>
  )
}
