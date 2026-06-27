import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, Check, Crown, Pencil, Plus, Trash2, X } from 'lucide-react'
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
  type FantasyPick,
  type PosCat,
  type Round,
  type RoundSquad,
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
  const { fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain, resetFantasy } = useGames()
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  // FIFA-style modes: 'view' shows the scoring panel; 'transfer' opens the pool and
  // edits a local DRAFT that only commits on Save (so abandoning discards cleanly).
  const [mode, setMode] = useState<'view' | 'transfer'>('view')
  const [draft, setDraft] = useState<RoundSquad | null>(null)
  const emptySquad = (): RoundSquad => ({ players: [], captain: null, vice: null })

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

  // A stale selection (or an in-progress draft) must not outlive a round change or
  // an edit-state flip — abandon the draft and fall back to view mode.
  useEffect(() => {
    setSelected(null)
    setMode('view')
    setDraft(null)
    setOpenSlot(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, editable])

  const prev = previousRound(focus)
  const prevPlayers = (prev && fantasy[prev]?.players) || []

  // Carry the squad forward into the focus round the first time it opens.
  useEffect(() => {
    if (editable && !fantasy[focus] && prev && fantasy[prev]) seedRound(focus, fantasy[prev]!.players)
  }, [editable, focus, prev, fantasy, seedRound])

  // While transferring, the pitch/pool/token-actions all read the local draft;
  // otherwise the committed squad. One indirection keeps every downstream read intact.
  const committed = fantasy[focus]
  const transferring = mode === 'transfer' && draft != null
  const squad = transferring ? draft : committed
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

  // ---- transfer draft (local; commits only on Save) ----
  const cloneSquad = (s: RoundSquad | undefined) =>
    ({ players: (s?.players ?? []).map((p) => ({ ...p })), captain: s?.captain ?? null, vice: s?.vice ?? null })
  const draftPick = (slot: Slot, pick: FantasyPick | null) =>
    setDraft((d) => {
      const cur = d ?? emptySquad()
      const removed = cur.players.find((p) => p.slot === slot)
      const next = cur.players.filter((p) => p.slot !== slot)
      if (pick) next.push(pick)
      let { captain, vice } = cur
      if (removed) {
        const k = playerKey(removed)
        if (captain === k) captain = null
        if (vice === k) vice = null
      }
      return { players: next, captain, vice }
    })
  const draftCaptain = (key: string) => setDraft((d) => (d ? { ...d, captain: d.captain === key ? null : key } : d))
  const startTransfers = () => { setDraft(cloneSquad(committed)); setMode('transfer'); setSelected(null); setOpenSlot(null) }
  const saveTransfers = () => { if (draft) setRoundSquad(focus, draft); setMode('view'); setDraft(null); setSelected(null); setOpenSlot(null) }
  const cancelTransfers = () => { setMode('view'); setDraft(null); setSelected(null); setOpenSlot(null) }
  const resetDraft = () => { setDraft(cloneSquad(committed)); setSelected(null); setOpenSlot(null) }
  // Captain works in both modes: drafted while transferring, committed in view.
  const toggleCaptain = (slot: Slot, key: string, isCap: boolean) => {
    if (transferring) { draftCaptain(key); return }
    if (isCap) setRoundPick(focus, slot, { ...players.find((p) => p.slot === slot)! })
    else setCaptain(focus, key)
  }

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
            onClick={() => toggleCaptain(slot, key, isCap)}
            aria-pressed={isCap}
            className={cn(row, isCap ? 'bg-team-soft text-team' : 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]')}
          >
            <Crown size={16} className="shrink-0" />
            <span className="flex-1 text-left">Captain <span className="text-faint">·2</span></span>
            {isCap && <Check size={16} className="shrink-0" />}
          </button>

          {transferring && (
            <>
              <div className="my-1 h-px bg-black/5 dark:bg-white/[0.07]" />

              <button onClick={() => { onClose(); setOpenSlot(slot) }} className={cn(row, 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]')}>
                <Pencil size={16} className="shrink-0" />
                <span className="flex-1 text-left">Change player</span>
              </button>

              <button onClick={() => { draftPick(slot, null); onClose() }} className={cn(row, 'text-faint hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400')}>
                <Trash2 size={16} className="shrink-0" />
                <span className="flex-1 text-left">Remove</span>
              </button>
            </>
          )}
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
      if (!transferring) {
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
          className={cn('group flex w-full flex-col items-center', !editable && 'cursor-default', out && 'opacity-60 saturate-0')}
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
          <span className="mt-1.5 flex w-full max-w-full flex-col items-center overflow-hidden rounded-[10px] bg-black/[0.04] px-1.5 py-1 text-center ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10">
            <span className="flex w-full min-w-0 items-center justify-center gap-1">
              <span className="min-w-0 truncate font-grotesk text-xs font-medium leading-tight text-ink">{pick.name}</span>
              {ps && <span className="shrink-0 font-grotesk text-xs font-semibold tnum text-team">{ps.final}</span>}
            </span>
            <span className="mt-0.5 w-full truncate text-[9px] font-medium uppercase tracking-label text-faint">
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

  // The scoring reference — fills the same 640px frame as the pool so it aligns
  // with the pitch in view mode.
  const HowToScore = () => (
    <section className="panel flex w-full flex-col overflow-hidden lg:h-[640px]">
      <div className="border-b border-black/5 px-5 py-4 dark:border-white/[0.07]">
        <h2 className="font-grotesk text-xl font-bold tracking-tight">How to score</h2>
        <p className="mt-1 text-2xs text-faint">Real ESPN box-score events, graded as each match finishes. Captain scores ×2.</p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-black/5 overflow-y-auto overscroll-contain dark:divide-white/[0.07]">
        {SCORING_RULES.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <span className="text-sm text-muted">{r.label}</span>
            <span className="shrink-0 font-grotesk text-sm font-medium tnum text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-black/5 px-5 py-3 text-2xs text-faint dark:border-white/[0.07]">
        Player matching is best-effort by team + name.
      </p>
    </section>
  )

  return (
    <div className={cn('animate-fade-in', editable && 'max-lg:pb-28')}>
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

      {!isDesktop && transferring && openSlot ? (
        <PlayerPicker
          slot={openSlot}
          taken={takenKeys}
          isCountryFull={isCountryFull}
          onClose={() => setOpenSlot(null)}
          onPick={(p) => {
            if (!openSlot) return
            draftPick(openSlot, { slot: openSlot, ...p })
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
          No overflow-hidden so a token's action popover can extend past the edge.
          On desktop it's a fixed height so it lines up with the player pool box. */}
      <div className="panel relative mx-auto flex w-full max-w-[440px] flex-col px-3 py-5 sm:px-5 sm:py-7 lg:h-[640px]">
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

        <div className="relative flex flex-1 flex-col justify-between gap-4 py-1 sm:gap-6">
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
            <div className="panel grid h-[640px] place-items-center p-8 text-center text-sm text-muted">
              This round is locked and under way.
            </div>
          ) : transferring ? (
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
                draftPick(target, { slot: target, ...p })
                setOpenSlot(null)
              }}
            />
          ) : (
            <HowToScore />
          )}
        </div>
      </div>

      {/* mobile: the scoring panel sits below the pitch in view mode */}
      {!transferring && <div className="mt-8 lg:hidden"><HowToScore /></div>}

      {/* view mode — desktop: a centred CTA below the two columns */}
      {!transferring && (
        <div className="mt-8 hidden flex-col items-center gap-3 lg:flex">
          {editable && (
            <button
              onClick={startTransfers}
              className="inline-flex items-center justify-center gap-2 rounded-pill bg-team px-7 py-3 font-grotesk text-sm font-semibold text-team-ink transition-opacity hover:opacity-90"
            >
              <ArrowLeftRight size={16} /> {players.length === 0 ? 'Pick your five' : 'Make transfers'}
            </button>
          )}
          <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">reset everything</button>
        </div>
      )}

      {/* view mode — mobile: a tiny in-flow reset link (the CTA itself floats, below) */}
      {!transferring && (
        <div className="mt-6 flex justify-center lg:hidden">
          <button onClick={resetFantasy} className="text-2xs text-faint hover:text-ink">reset everything</button>
        </div>
      )}

      {/* view mode — mobile: floating "Make transfers" so it's always reachable */}
      {!transferring && editable && !isDesktop && !selected &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-canvas/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/10 lg:hidden">
            <button
              onClick={startTransfers}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-team px-5 py-3 font-grotesk text-sm font-semibold text-team-ink"
            >
              <ArrowLeftRight size={16} /> {players.length === 0 ? 'Pick your five' : 'Make transfers'}
            </button>
          </div>,
          document.body,
        )}

      {/* transfer mode: desktop sticky Save/Reset bar */}
      {transferring && (
        <div className="sticky bottom-4 z-30 mt-6 hidden lg:block">
          <div className="panel flex items-center justify-between gap-4 px-5 py-3">
            <div className="text-xs text-muted">
              {prev ? (
                <>
                  Transfers <span className="font-medium tnum text-ink">{transfersUsed}{Number.isFinite(free) ? ` / ${free} free` : ''}</span>
                  {paid > 0 && <span className="text-amber-600 dark:text-amber-500"> · −{paid * 3} pts on save</span>}
                </>
              ) : (
                <span>Unlimited changes — build your five</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={resetDraft} className="rounded-pill px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.1] hover:text-ink dark:ring-white/15">Reset</button>
              <button onClick={cancelTransfers} className="rounded-pill px-4 py-2.5 text-sm font-medium text-muted hover:text-ink">Cancel</button>
              <button onClick={saveTransfers} className="inline-flex items-center gap-2 rounded-pill bg-team px-5 py-2.5 text-sm font-semibold text-team-ink hover:opacity-90">
                <Check size={16} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* transfer mode: mobile fixed Save/Reset bar (portaled; only when no sheet/picker is up) */}
      {transferring && !isDesktop && !openSlot && !selected &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.06] bg-canvas/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:border-white/10 lg:hidden">
            <div className="mb-2 text-center text-2xs text-muted">
              {prev ? (
                <>
                  Transfers <span className="font-medium tnum text-ink">{transfersUsed}{Number.isFinite(free) ? ` / ${free}` : ''}</span>
                  {paid > 0 && <span className="text-amber-600 dark:text-amber-500"> · −{paid * 3} pts</span>}
                </>
              ) : (
                <span>Unlimited changes</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={resetDraft} className="flex-1 rounded-pill px-4 py-3 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.1] dark:ring-white/15">Reset</button>
              <button onClick={saveTransfers} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-pill bg-team px-4 py-3 text-sm font-semibold text-team-ink">
                <Check size={16} /> Save
              </button>
            </div>
          </div>,
          document.body,
        )}
        </>
      )}
    </div>
  )
}
