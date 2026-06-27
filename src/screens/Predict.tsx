import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import { buildPredictedBracket, scorePredictions, type PickStatus } from '@/domain/predict'
import type { ResolvedBracketMatch, SlotSource, Stage, TeamCode } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

/** Left-to-right knockout rounds (no GS — Predict is about picking winners). */
const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']
const ROUND_LABEL: Record<string, string> = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final' }
/** Minimap dash counts per round (the Final shows a trophy). */
const MINI_LINES = [5, 4, 3, 2]
const ROW_H = 84
const GUTTER = 36
const DESK_CARD_W = 224
const DESK_COL_W = DESK_CARD_W + GUTTER
const CONN = 'border-black/25 dark:border-white/30'
const STUB = 'bg-black/25 dark:bg-white/30'

/** True bracket position of every match (in-order walk of the feeder graph), so a
 *  column sorted by it puts each pair beside the match it feeds. */
const BRACKET_POS: Record<number, number> = (() => {
  const byNo = new Map(BRACKET.map((b) => [b.matchNo, b]))
  const feeders = (no: number): number[] => {
    const b = byNo.get(no)
    if (!b) return []
    return [b.home.source, b.away.source]
      .filter((s): s is Extract<SlotSource, { matchNo: number }> => s.kind === 'matchWinner' || s.kind === 'matchLoser')
      .map((s) => s.matchNo)
  }
  const leaves = (no: number): number[] => {
    const f = feeders(no)
    return f.length ? f.flatMap(leaves) : [no]
  }
  const finalNo = BRACKET.find((b) => b.stage === 'F')?.matchNo ?? 104
  const idx = new Map(leaves(finalNo).map((n, i) => [n, i]))
  const pos = (no: number): number => {
    const f = feeders(no)
    return f.length ? f.reduce((s, n) => s + pos(n), 0) / f.length : idx.get(no) ?? 0
  }
  const out: Record<number, number> = {}
  for (const b of BRACKET) out[b.matchNo] = pos(b.matchNo)
  return out
})()

function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = () => setMatch(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])
  return match
}

export function Predict() {
  const { matches } = useApp()
  const { predictions, setPrediction, clearPredictions } = useGames()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const resolved = useMemo(() => resolveBracket(BRACKET, TEAMS, matches), [matches])
  const byNo = useMemo(() => new Map(resolved.map((m) => [m.matchNo, m])), [resolved])
  const predicted = useMemo(() => buildPredictedBracket(BRACKET, resolved, predictions), [resolved, predictions])
  const score = useMemo(() => scorePredictions(predictions, resolved), [predictions, resolved])

  const byStage = useMemo(() => {
    const m = new Map<Stage, number[]>()
    for (const b of BRACKET) {
      const arr = m.get(b.stage) ?? []
      arr.push(b.matchNo)
      m.set(b.stage, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => BRACKET_POS[a] - BRACKET_POS[b])
    return m
  }, [])
  const cols = useMemo(() => COLUMNS.map((stage) => ({ stage, nos: byStage.get(stage) ?? [] })), [byStage])

  const finalOcc = predicted[104]
  const champCode =
    finalOcc && (predictions[104] === finalOcc.homeCode || predictions[104] === finalOcc.awayCode) ? predictions[104] : null
  const champion = champCode ? teamByCode[champCode] : null

  const cardProps = (no: number) => ({
    no,
    real: byNo.get(no),
    homeCode: predicted[no]?.homeCode ?? null,
    awayCode: predicted[no]?.awayCode ?? null,
    pick: predictions[no] ?? null,
    status: score.perMatch[no] ?? ('unpicked' as PickStatus),
    onPick: (code: TeamCode) => setPrediction(no, code),
  })

  // ---- mobile: two-round adaptive window + slide animation ----
  const [focus, setFocus] = useState(0) // 0..maxFocus
  const maxFocus = COLUMNS.length - 2
  const dir = useRef(1)
  const goFocus = (f: number) => {
    const next = Math.max(0, Math.min(maxFocus, f))
    dir.current = next >= focus ? 1 : -1
    setFocus(next)
  }
  const mobileBoardRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const el = mobileBoardRef.current
    if (!el) return
    const y = window.scrollY + el.getBoundingClientRect().top - 130
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }, [focus])

  // ---- desktop: full bracket, scrubber mirrors horizontal scroll ----
  const scrollRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ left: 0, client: 1, full: 1 })
  useEffect(() => {
    if (!isDesktop) return
    const el = scrollRef.current
    if (!el) return
    const measure = () => setBox({ left: el.scrollLeft, client: el.clientWidth, full: el.scrollWidth })
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [isDesktop])
  const maxScroll = Math.max(0, box.full - box.client)
  const deskLensW = Math.min(100, Math.max(18, (box.client / box.full) * 100))
  const deskLensL = maxScroll > 0 ? (box.left / maxScroll) * (100 - deskLensW) : 0
  const deskActive = maxScroll > 0 ? Math.round(box.left / DESK_COL_W) : 0

  // scrubber props differ per layout
  const nav = isDesktop
    ? {
        lensLeft: deskLensL,
        lensWidth: deskLensW,
        highlight: new Set([deskActive, deskActive + 1]),
        onSeek: (frac: number) => scrollRef.current?.scrollTo({ left: frac * maxScroll }),
        onTapRound: (i: number) => scrollRef.current?.scrollTo({ left: Math.min(maxScroll, i * DESK_COL_W), behavior: 'smooth' }),
      }
    : {
        lensLeft: (focus / COLUMNS.length) * 100,
        lensWidth: (2 / COLUMNS.length) * 100,
        highlight: new Set([focus, focus + 1]),
        onSeek: (frac: number) => goFocus(Math.round(frac * maxFocus)),
        onTapRound: (i: number) => goFocus(Math.min(maxFocus, i)),
      }

  return (
    <div className="animate-fade-in">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Predict the bracket</Label>
          <h1 className="mt-2 font-grotesk text-3xl font-medium tracking-tight">Pick every winner</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-grotesk text-2xl font-semibold tnum leading-none">{score.points}</p>
            <p className="text-2xs text-faint">
              pts · {score.correct}/{score.graded} graded
            </p>
          </div>
          {Object.keys(predictions).length > 0 && (
            <button onClick={clearPredictions} className="rounded-pill border px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink">
              Reset
            </button>
          )}
        </div>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Tap a team to predict who wins each tie — your picks carry forward to the next round, all the way to a champion.
        As real matches finish, correct picks turn{' '}
        <span className="font-medium text-emerald-600 dark:text-emerald-400">green</span> and wrong ones grey. You make
        every call; nothing is auto-picked or predicted for you.
      </p>

      {champion && (
        <div className="panel mb-6 inline-flex items-center gap-2 px-4 py-2">
          <Label>Your champion</Label>
          <Flag code={champCode} size={20} />
          <span className="font-grotesk text-lg font-semibold text-team">{champion.name}</span>
        </div>
      )}

      <BracketNav rounds={COLUMNS} {...nav} />

      {isDesktop ? (
        <div ref={scrollRef} className="-mx-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
          <div className="flex" style={{ minHeight: cols[0].nos.length * ROW_H }}>
            {cols.map((col, ci) => (
              <Fragment key={col.stage}>
                <div className="flex shrink-0 flex-col" style={{ width: DESK_CARD_W }}>
                  {col.nos.map((no, i) => (
                    <Slot key={no} hasNext={ci < cols.length - 1} hasPrev={ci > 0} topOfPair={i % 2 === 0}>
                      <MatchCard {...cardProps(no)} />
                    </Slot>
                  ))}
                </div>
                {ci < cols.length - 1 && <div className="shrink-0" style={{ width: GUTTER }} />}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div ref={mobileBoardRef} className="mx-auto w-full max-w-xl">
          <div className="mb-3 flex items-center gap-2 px-1 text-2xs font-semibold uppercase tracking-label text-faint">
            <span className="text-ink">{ROUND_LABEL[COLUMNS[focus]]}</span>
            <ChevronRight size={12} className="text-faint" />
            <span>{ROUND_LABEL[COLUMNS[focus + 1]]}</span>
          </div>
          <div key={focus} className={dir.current >= 0 ? 'animate-round-in-right' : 'animate-round-in-left'}>
            <div className="flex" style={{ minHeight: cols[focus].nos.length * ROW_H }}>
              <div className="flex flex-1 flex-col">
                {cols[focus].nos.map((no, i) => (
                  <Slot key={no} hasNext hasPrev={false} topOfPair={i % 2 === 0}>
                    <MatchCard {...cardProps(no)} />
                  </Slot>
                ))}
              </div>
              <div className="shrink-0" style={{ width: GUTTER }} />
              <div className="flex flex-1 flex-col">
                {cols[focus + 1].nos.map((no) => (
                  <Slot key={no} hasNext={false} hasPrev topOfPair={false}>
                    <MatchCard {...cardProps(no)} muted />
                  </Slot>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** One match cell with its rounded bracket connectors in the gutters. */
function Slot({
  hasNext,
  hasPrev,
  topOfPair,
  children,
}: {
  hasNext: boolean
  hasPrev: boolean
  topOfPair: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-0 flex-1 items-center">
      {/* connector INTO this card from the previous round (straight stub) */}
      {hasPrev && <div className={cn('pointer-events-none absolute top-1/2 h-px', STUB)} style={{ right: '100%', width: GUTTER / 2 }} />}
      {/* rounded elbow OUT to the next round — half the pair each */}
      {hasNext &&
        (topOfPair ? (
          <div className={cn('pointer-events-none absolute rounded-tr-[12px] border-t border-r', CONN)} style={{ left: '100%', top: '50%', width: GUTTER / 2, height: '50%' }} />
        ) : (
          <div className={cn('pointer-events-none absolute rounded-br-[12px] border-b border-r', CONN)} style={{ left: '100%', top: 0, width: GUTTER / 2, height: '50%' }} />
        ))}
      {children}
    </div>
  )
}

/**
 * The navigator: round labels over a draggable minimap (clean dashes per round,
 * a trophy for the Final). The lens marks the rounds on screen; drag it or tap a
 * round to move. Same control on mobile (drives the window) and desktop (scroll).
 */
function BracketNav({
  rounds,
  lensLeft,
  lensWidth,
  highlight,
  onSeek,
  onTapRound,
}: {
  rounds: Stage[]
  lensLeft: number
  lensWidth: number
  highlight: Set<number>
  onSeek: (frac: number) => void
  onTapRound: (i: number) => void
}) {
  const n = rounds.length
  const trackRef = useRef<HTMLDivElement>(null)
  const grab = useRef<number | null>(null)

  const fracFromX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const lensPx = (lensWidth / 100) * r.width
    const usable = Math.max(1, r.width - lensPx)
    const left = Math.max(0, Math.min(usable, clientX - r.left - (grab.current ?? lensPx / 2)))
    return left / usable
  }

  return (
    <div className="sticky top-14 z-20 -mx-5 mb-5 select-none bg-canvas/90 px-5 pb-3 pt-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
      <div className="mb-2 flex px-1">
        {rounds.map((r, i) => (
          <button
            key={r}
            onClick={() => onTapRound(i)}
            className={cn(
              'flex-1 text-center font-grotesk text-xs font-bold uppercase tracking-label transition-colors',
              highlight.has(i) ? 'text-ink' : 'text-faint hover:text-muted',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          const el = trackRef.current!
          const r = el.getBoundingClientRect()
          const lensPx = (lensWidth / 100) * r.width
          const lensLeftPx = (lensLeft / 100) * r.width
          const x = e.clientX - r.left
          grab.current = x >= lensLeftPx && x <= lensLeftPx + lensPx ? x - lensLeftPx : lensPx / 2
          el.setPointerCapture(e.pointerId)
          onSeek(fracFromX(e.clientX))
        }}
        onPointerMove={(e) => grab.current != null && onSeek(fracFromX(e.clientX))}
        onPointerUp={() => (grab.current = null)}
        onPointerCancel={() => (grab.current = null)}
        className="relative h-12 cursor-grab touch-none overflow-hidden rounded-[16px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] active:cursor-grabbing dark:bg-white/[0.06] dark:ring-white/10"
      >
        <div className="pointer-events-none absolute inset-0 flex">
          {rounds.map((r, i) => (
            <div key={r} className="flex flex-1 flex-col items-center justify-center gap-[3px] px-3">
              {i === n - 1 ? (
                <Trophy size={18} className="text-muted" />
              ) : (
                Array.from({ length: MINI_LINES[i] ?? 2 }).map((_, k) => <div key={k} className={cn('h-[2px] w-full rounded-full', STUB)} />)
              )}
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-1 flex items-center justify-between rounded-[12px] bg-black/[0.06] px-1 ring-2 ring-inset ring-black/40 transition-[left] duration-200 ease-calm dark:bg-white/15 dark:ring-white/70"
          style={{ left: `${lensLeft}%`, width: `${lensWidth}%` }}
        >
          <ChevronLeft size={14} className="text-muted" />
          <ChevronRight size={14} className="text-muted" />
        </div>
      </div>
    </div>
  )
}

function MatchCard({
  no,
  real,
  homeCode,
  awayCode,
  pick,
  status,
  onPick,
  muted,
}: {
  no: number
  real: ResolvedBracketMatch | undefined
  homeCode: TeamCode | null
  awayCode: TeamCode | null
  pick: TeamCode | null
  status: PickStatus
  onPick: (code: TeamCode) => void
  muted?: boolean
}) {
  const def = BRACKET.find((b) => b.matchNo === no)
  const finished = real?.status === 'finished'
  return (
    <div
      className={cn(
        'relative z-10 w-full rounded-[16px] p-1.5 ring-1 ring-inset backdrop-blur-xl',
        muted
          ? 'bg-black/[0.02] ring-black/[0.05] dark:bg-white/[0.03] dark:ring-white/[0.07]'
          : 'bg-black/[0.04] ring-black/[0.06] dark:bg-white/[0.06] dark:ring-white/10',
      )}
    >
      <div className="mb-1 flex items-center justify-between px-1.5">
        <span className="text-[9px] font-medium uppercase tracking-label text-faint">M{no}</span>
        {finished && (
          <span className="rounded-full bg-black/[0.04] px-1.5 py-px text-[9px] font-semibold uppercase tracking-label text-faint dark:bg-white/10">
            FT
          </span>
        )}
      </div>
      <Side code={homeCode} label={def?.home.label} score={real?.homeScore} picked={pick != null && pick === homeCode} status={status} winner={real?.winnerCode} finished={finished} onPick={onPick} />
      <div className="my-0.5 h-px bg-black/5 dark:bg-white/[0.07]" />
      <Side code={awayCode} label={def?.away.label} score={real?.awayScore} picked={pick != null && pick === awayCode} status={status} winner={real?.winnerCode} finished={finished} onPick={onPick} />
    </div>
  )
}

function Side({
  code,
  label,
  score,
  picked,
  status,
  winner,
  finished,
  onPick,
}: {
  code: TeamCode | null
  label?: string
  score: number | null | undefined
  picked: boolean
  status: PickStatus
  winner: TeamCode | null | undefined
  finished?: boolean
  onPick: (code: TeamCode) => void
}) {
  const team = code ? teamByCode[code] : null
  const isWinner = finished && winner === code
  const correct = picked && status === 'correct'
  const wrong = picked && status === 'wrong'
  const dim = finished && !isWinner

  return (
    <button
      disabled={!code}
      onClick={() => code && onPick(code)}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left transition-colors',
        code && 'hover:bg-black/5 dark:hover:bg-white/10',
        picked && !finished && 'bg-team-soft ring-1 ring-inset ring-team/40',
        correct && 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30',
        wrong && 'opacity-40',
        dim && !wrong && 'opacity-45',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {team ? (
          <Flag code={code} size={18} />
        ) : (
          <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
        )}
        <span className={cn('truncate text-[13px]', team ? 'text-ink' : 'text-faint', (isWinner || (picked && !finished) || correct) && 'font-semibold')}>
          {team ? team.name : label ?? '—'}
        </span>
        {correct && <Check size={12} className="shrink-0 text-emerald-500 dark:text-emerald-400" />}
      </span>
      {score != null && <span className="font-grotesk text-sm font-bold tnum text-ink">{score}</span>}
    </button>
  )
}
