import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, Check, Crown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { keyPlayerById, type KeyPlayerArchetype } from '@/data/keyPlayers'
import { TEAMS, teamByCode } from '@/data/teams'
import {
  COUNTRY_QUOTA,
  FREE_TRANSFERS,
  ROUNDS,
  SLOT_ALLOWS,
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
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { PlayerPicker } from '@/components/PlayerPicker'
import { KnockoutProgress, type ProgressNode } from '@/components/KnockoutProgress'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useT } from '@/lib/useT'
import { useTName } from '@/lib/useTName'
import { cn } from '@/lib/utils'

const ROUND_SHORT: Record<Round, string> = { R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF', FINAL: 'Final' }
const FORMATION: Slot[][] = [['GK'], ['DEF'], ['MID', 'FLEX'], ['ATT']]
const fmtDate = (ms: number | null) => (ms == null ? '' : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))

const ARCHETYPE_BADGE: Record<KeyPlayerArchetype, string> = {
  Scorer: 'text-rose-700/70 ring-rose-500/15 dark:text-rose-200/70 dark:ring-rose-300/15',
  Creator: 'text-sky-700/70 ring-sky-500/15 dark:text-sky-200/70 dark:ring-sky-300/15',
  Guardian: 'text-emerald-700/70 ring-emerald-500/15 dark:text-emerald-200/70 dark:ring-emerald-300/15',
}

function KeyPlayerCue({
  archetypes,
  compact = false,
  showBadges = true,
}: {
  archetypes: KeyPlayerArchetype[]
  compact?: boolean
  showBadges?: boolean
}) {
  return (
    <span className={cn('inline-flex max-w-full flex-wrap items-center justify-center gap-0.5', compact ? 'leading-none' : 'gap-y-1')}>
      <span aria-label="Key player" className={cn('shrink-0 text-team/70', compact ? 'text-[9px]' : 'text-[10px]')}>
        ★
      </span>
      {showBadges && archetypes.map((a) => (
        <span
          key={a}
          className={cn(
            'shrink-0 rounded-[6px] bg-black/[0.025] px-1 py-[1px] font-grotesk text-[8px] font-semibold leading-none ring-1 ring-inset dark:bg-white/[0.035]',
            ARCHETYPE_BADGE[a],
          )}
        >
          {a}
        </span>
      ))}
    </span>
  )
}

export function Fantasy() {
  const { matches } = useApp()
  const { fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain } = useGames()
  const [openSlot, setOpenSlot] = useState<Slot | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [mode, setMode] = useState<'view' | 'transfer'>('view')
  const [draft, setDraft] = useState<RoundSquad | null>(null)
  const emptySquad = (): RoundSquad => ({ players: [], captain: null })
  const t = useT()
  const tName = useTName()

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const cur = currentRound(now)

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

  const inPlay = [...ROUNDS].reverse().find((r) => isRoundLocked(r, now) && !roundFullyDone(r))
  const focus: Round = inPlay ?? cur
  const editable = focus === cur && !isRoundLocked(focus, now)

  useEffect(() => {
    setSelected(null)
    setMode('view')
    setDraft(null)
    setOpenSlot(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, editable])

  const prev = previousRound(focus)
  const prevPlayers = (prev && fantasy[prev]?.players) || []

  useEffect(() => {
    if (editable && !fantasy[focus] && prev && fantasy[prev]) seedRound(focus, fantasy[prev]!.players)
  }, [editable, focus, prev, fantasy, seedRound])

  const committed = fantasy[focus]
  const transferring = mode === 'transfer' && draft != null
  const squad = transferring ? draft : committed
  const players = squad?.players ?? []
  const quotaMax = COUNTRY_QUOTA[focus]
  const counts = countryCounts(players)
  const eliminated = useMemo(() => eliminatedTeams(matches, TEAMS), [matches])

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

  const slotForPos = (pos: PosCat): Slot | null => {
    if (!players.some((p) => p.slot === pos)) return pos as Slot
    if (pos !== 'GK' && !players.some((p) => p.slot === 'FLEX')) return 'FLEX'
    return null
  }
  const canAdd = (pos: PosCat) => (openSlot ? SLOT_ALLOWS[openSlot].includes(pos) : slotForPos(pos) !== null)

  const cloneSquad = (s: RoundSquad | undefined) =>
    ({ players: (s?.players ?? []).map((p) => ({ ...p })), captain: s?.captain ?? null })
  const draftPick = (slot: Slot, pick: FantasyPick | null) =>
    setDraft((d) => {
      const c = d ?? emptySquad()
      const removed = c.players.find((p) => p.slot === slot)
      const next = c.players.filter((p) => p.slot !== slot)
      if (pick) next.push(pick)
      let { captain } = c
      if (removed && captain === playerKey(removed)) captain = null
      return { players: next, captain }
    })
  const draftCaptain = (key: string) => setDraft((d) => (d ? { ...d, captain: d.captain === key ? null : key } : d))
  const startTransfers = () => { setDraft(cloneSquad(committed)); setMode('transfer'); setSelected(null); setOpenSlot(null) }
  const saveTransfers = () => { if (draft) setRoundSquad(focus, draft); setMode('view'); setDraft(null); setSelected(null); setOpenSlot(null) }
  const cancelTransfers = () => { setMode('view'); setDraft(null); setSelected(null); setOpenSlot(null) }
  const resetDraft = () => { setDraft(cloneSquad(committed)); setSelected(null); setOpenSlot(null) }
  const toggleCaptain = (slot: Slot, key: string, isCap: boolean) => {
    if (transferring) { draftCaptain(key); return }
    if (isCap) setRoundPick(focus, slot, { ...players.find((p) => p.slot === slot)! })
    else setCaptain(focus, key)
  }

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
          <PlayerAvatar teamCode={pick.teamCode} name={pick.name} number={pick.number} size={28} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-grotesk text-sm font-medium leading-tight">{pick.name}</p>
            <p className="truncate text-2xs text-faint">
              {t.fantasyPosAbbr[pick.position] ?? pick.position} · {tName(teamByCode[pick.teamCode], pick.teamCode)} · {t.fantasySlotLabel[slot]}
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
            <span className="flex-1 text-left">{t.fantasyCaptain} <span className="text-faint">·2</span></span>
            {isCap && <Check size={16} className="shrink-0" />}
          </button>

          {transferring && (
            <>
              <div className="my-1 h-px bg-black/5 dark:bg-white/[0.07]" />
              <button onClick={() => { onClose(); setOpenSlot(slot) }} className={cn(row, 'text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.05]')}>
                <Pencil size={16} className="shrink-0" />
                <span className="flex-1 text-left">{t.fantasyChangePlayer}</span>
              </button>
              <button onClick={() => { draftPick(slot, null); onClose() }} className={cn(row, 'text-faint hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400')}>
                <Trash2 size={16} className="shrink-0" />
                <span className="flex-1 text-left">{t.fantasyRemove}</span>
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

  const renderSlot = (slot: Slot) => {
    const pick = players.find((p) => p.slot === slot)
    if (!pick) {
      if (!transferring) {
        return (
          <div key={slot} className="flex w-[88px] flex-col items-center sm:w-[104px]">
            <span className="h-[52px] w-[52px] rounded-full border border-dashed border-black/10 dark:border-white/15" />
            <span className="mt-1.5 text-[9px] font-medium uppercase tracking-label text-faint">{t.fantasySlotLabel[slot]}</span>
          </div>
        )
      }
      return (
        <button key={slot} type="button" onClick={() => setOpenSlot(slot)} className="group flex w-[88px] flex-col items-center sm:w-[104px]">
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-dashed border-black/[0.12] text-faint transition-colors group-hover:border-ink/30 group-hover:text-muted dark:border-white/15">
            <Plus size={18} />
          </span>
          <span className="mt-1.5 flex w-full items-center justify-center rounded-[10px] bg-black/[0.03] px-1.5 py-1 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.04] dark:ring-white/[0.06]">
            <span className="truncate text-[9px] font-medium uppercase tracking-label text-faint">{t.fantasySlotLabel[slot]}</span>
          </span>
        </button>
      )
    }
    const key = playerKey(pick)
    const keyMeta = keyPlayerById[key]
    const ps = selScore?.perPlayer[key]
    const isCap = squad?.captain === key
    const out = eliminated.has(pick.teamCode)
    const active = selected === slot
    const popPos = slot === 'MID' ? 'left-0' : slot === 'FLEX' ? 'right-0' : 'left-1/2 -translate-x-1/2'
    return (
      <div key={slot} className="relative flex w-[78px] flex-col items-center sm:w-[92px]">
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
              <PlayerAvatar teamCode={pick.teamCode} name={pick.name} number={pick.number} size={46} flagBadge={false} />
            </span>
            <span className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full bg-canvas ring-1 ring-inset ring-black/[0.06] dark:ring-white/10">
              <Flag code={pick.teamCode} size={14} />
            </span>
            {isCap && (
              <span className="absolute -left-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-team px-1 font-grotesk text-[9px] font-bold tnum text-team-ink">
                C×2
              </span>
            )}
          </span>
          <span className="mt-1.5 flex w-auto min-w-[62px] max-w-[86px] flex-col items-center overflow-hidden rounded-[8px] bg-black/[0.04] px-2 py-0.5 text-center ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10 sm:max-w-[94px]">
            <span className="flex w-full min-w-0 items-center justify-center gap-1">
              <span className="min-w-0 truncate font-grotesk text-[11px] font-medium leading-tight text-ink">{pick.name}</span>
              {keyMeta && <KeyPlayerCue archetypes={keyMeta.archetypes} compact showBadges={false} />}
              {ps && <span className="shrink-0 font-grotesk text-xs font-semibold tnum text-team">{ps.final}</span>}
            </span>
            {keyMeta && keyMeta.archetypes.length > 0 && (
              <span className="mt-px flex max-w-full flex-wrap justify-center gap-0.5">
                {keyMeta.archetypes.map((a) => (
                  <span key={a} className={cn('shrink-0 rounded-[6px] bg-black/[0.025] px-1 py-[1px] font-grotesk text-[8px] font-semibold leading-none ring-1 ring-inset dark:bg-white/[0.035]', ARCHETYPE_BADGE[a])}>{a}</span>
                ))}
              </span>
            )}
            <span className="mt-px w-full truncate text-[8px] font-medium uppercase tracking-label text-faint">
              {out ? t.teamEliminated : `${pick.number != null ? `#${pick.number} · ` : ''}${t.fantasyPosAbbr[pick.position] ?? pick.position}`}
            </span>
          </span>
        </button>

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

  const HowToScore = () => (
    <section className="panel flex w-full flex-col overflow-hidden lg:h-[640px]">
      <div className="border-b border-black/5 px-5 py-4 dark:border-white/[0.07]">
        <h2 className="font-grotesk text-xl font-bold tracking-tight">{t.fantasyHowToScore}</h2>
        <p className="mt-1 text-2xs text-faint">{t.fantasyHowSub}</p>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-black/5 overflow-y-auto overscroll-contain dark:divide-white/[0.07]">
        {t.fantasyScoringRules.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <span className="text-sm text-muted">{r.label}</span>
            <span className="shrink-0 font-grotesk text-sm font-medium tnum text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-black/5 px-5 py-3 text-2xs text-faint dark:border-white/[0.07]">
        {t.fantasyPlayerMatching}
      </p>
    </section>
  )

  return (
    <div className={cn('animate-fade-in', editable && 'max-lg:pb-[calc(7.5rem+env(safe-area-inset-bottom))]')}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>{t.fantasyLabel}</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">{t.fantasyTitle}</h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none">{selScore?.points ?? 0}</p>
            <p className="text-2xs text-faint">{t.fantasyRoundLabel[focus]} pts</p>
          </div>
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none text-team">{totalPoints}</p>
            <p className="text-2xs text-faint">{t.fantasyTotal}</p>
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
      <KnockoutProgress nodes={progressNodes} />

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        <span className="font-medium text-ink">{t.fantasyRoundLabel[focus]}</span>
        <span>{editable ? (prev ? t.fantasyTransfersOpen : t.fantasyBuildFive) : t.fantasyLocked}</span>
        <span>{t.fantasyMaxCountry(quotaMax)}</span>
        {prev ? (
          <span>
            {t.fantasyTransfersUsed(transfersUsed, Number.isFinite(free) ? free : null)}
            {paid > 0 && <span className="text-amber-600 dark:text-amber-500">{t.fantasyPaidPts(paid * 3)}</span>}
          </span>
        ) : (
          <span>{t.fantasyUnlimited}</span>
        )}
      </div>

      <div className="lg:flex lg:items-start lg:gap-8">
        <div className="lg:w-[468px] lg:shrink-0">
      <div className="panel relative mx-auto flex w-full max-w-[440px] flex-col px-3 py-5 sm:px-5 sm:py-7 lg:h-[640px]">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-3 rounded-[14px] border border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-black/[0.05] dark:bg-white/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/[0.08] dark:bg-white/[0.10]" />
          <div className="absolute left-1/2 top-3 h-11 w-1/2 -translate-x-1/2 rounded-b-[10px] border border-t-0 border-black/[0.05] dark:border-white/[0.06]" />
          <div className="absolute bottom-3 left-1/2 h-11 w-1/2 -translate-x-1/2 rounded-t-[10px] border border-b-0 border-black/[0.05] dark:border-white/[0.06]" />
        </div>

        <p className="relative mb-2 text-center"><span className="text-[9px] font-medium uppercase tracking-label text-faint">{t.fantasyGoalEnd}</span></p>

        <div className="relative flex flex-1 flex-col justify-between gap-4 py-1 sm:gap-6">
          {FORMATION.map((row, i) => (
            <div key={i} className="flex items-start justify-center gap-3 sm:gap-6">
              {row.map((slot) => renderSlot(slot))}
            </div>
          ))}
        </div>

        <p className="relative mt-2 text-center"><span className="text-[9px] font-medium uppercase tracking-label text-faint">{t.fantasyAttackEnd}</span></p>
      </div>

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

        <div className="hidden lg:block lg:flex-1 lg:min-w-0">
          {!editable ? (
            <div className="panel grid h-[640px] place-items-center p-8 text-center text-sm text-muted">
              {t.fantasyRoundLocked}
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

      {!transferring && <div className="mt-8 lg:hidden"><HowToScore /></div>}

      {!transferring && (
        <div className="mt-8 hidden flex-col items-center gap-3 lg:flex">
          {editable && (
            <button
              onClick={startTransfers}
              className="inline-flex items-center justify-center gap-2 rounded-pill bg-team px-7 py-3 font-grotesk text-sm font-semibold text-team-ink transition-opacity hover:opacity-90"
            >
              <ArrowLeftRight size={16} /> {players.length === 0 ? t.fantasyPickFive : t.fantasyMakeTransfers}
            </button>
          )}
        </div>
      )}

      {!transferring && editable && !isDesktop && !selected &&
        createPortal(
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-y border-black/[0.06] bg-canvas/95 px-4 py-3 backdrop-blur-xl dark:border-white/10 lg:hidden">
            <button
              onClick={startTransfers}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-team px-5 py-3 font-grotesk text-sm font-semibold text-team-ink"
            >
              <ArrowLeftRight size={16} /> {players.length === 0 ? t.fantasyPickFive : t.fantasyMakeTransfers}
            </button>
          </div>,
          document.body,
        )}

      {transferring && (
        <div className="sticky bottom-4 z-30 mt-6 hidden lg:block">
          <div className="panel flex items-center justify-between gap-4 px-5 py-3">
            <div className="text-xs text-muted">
              {prev ? (
                <>
                  {t.fantasyTransfersUsed(transfersUsed, Number.isFinite(free) ? free : null)}
                  {paid > 0 && <span className="text-amber-600 dark:text-amber-500">{t.fantasyPtsOnSave(paid * 3)}</span>}
                </>
              ) : (
                <span>{t.fantasyUnlimitedBuild}</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={resetDraft} className="rounded-pill px-4 py-2.5 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.1] hover:text-ink dark:ring-white/15">{t.fantasyReset}</button>
              <button onClick={cancelTransfers} className="rounded-pill px-4 py-2.5 text-sm font-medium text-muted hover:text-ink">{t.fantasyCancel}</button>
              <button onClick={saveTransfers} className="inline-flex items-center gap-2 rounded-pill bg-team px-5 py-2.5 text-sm font-semibold text-team-ink hover:opacity-90">
                <Check size={16} /> {t.fantasySave}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferring && !isDesktop && !openSlot && !selected &&
        createPortal(
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-y border-black/[0.06] bg-canvas/95 px-4 py-3 backdrop-blur-xl dark:border-white/10 lg:hidden">
            <div className="mb-2 text-center text-2xs text-muted">
              {prev ? (
                <>
                  {t.fantasyTransfersUsed(transfersUsed, Number.isFinite(free) ? free : null)}
                  {paid > 0 && <span className="text-amber-600 dark:text-amber-500">{t.fantasyPaidPts(paid * 3)}</span>}
                </>
              ) : (
                <span>{t.fantasyUnlimitedMobile}</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={resetDraft} className="flex-1 rounded-pill px-4 py-3 text-sm font-medium text-muted ring-1 ring-inset ring-black/[0.1] dark:ring-white/15">{t.fantasyReset}</button>
              <button onClick={saveTransfers} className="inline-flex flex-[2] items-center justify-center gap-2 rounded-pill bg-team px-4 py-3 text-sm font-semibold text-team-ink">
                <Check size={16} /> {t.fantasySave}
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
