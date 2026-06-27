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

const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']
/** Minimap dash counts per round (the Final shows a trophy). */
const MINI_LINES = [5, 4, 3, 2]
const CARD_W = 172
const GUTTER = 26
const COL_W = CARD_W + GUTTER
const ROW_H = 124
const CONN = 'border-black/15 dark:border-white/20'
const STUB = 'bg-black/15 dark:bg-white/20'

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '')
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')

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

  // One continuous, connected bracket; navigating slides it left (smooth scroll).
  const scrollRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ left: 0, client: 1, full: 1 })
  useEffect(() => {
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
  const lensWidth = Math.min(100, Math.max(16, (box.client / box.full) * 100))
  const lensLeft = maxScroll > 0 ? (box.left / maxScroll) * (100 - lensWidth) : 0
  const activeRound = maxScroll > 0 ? Math.min(COLUMNS.length - 1, Math.round(box.left / COL_W)) : 0

  const goToRound = (i: number) => {
    const sc = scrollRef.current
    if (!sc) return
    sc.scrollTo({ left: Math.min(maxScroll, i * COL_W), behavior: 'smooth' }) // slide the board left
    const el = sc.querySelector<HTMLElement>(`[data-round-start="${COLUMNS[i]}"]`)
    if (el) {
      const y = window.scrollY + el.getBoundingClientRect().top - 150
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    }
  }
  const scrubTo = (frac: number) => scrollRef.current?.scrollTo({ left: frac * maxScroll })

  const cardProps = (no: number) => ({
    no,
    real: byNo.get(no),
    homeCode: predicted[no]?.homeCode ?? null,
    awayCode: predicted[no]?.awayCode ?? null,
    pick: predictions[no] ?? null,
    status: score.perMatch[no] ?? ('unpicked' as PickStatus),
    onPick: (code: TeamCode) => setPrediction(no, code),
  })

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

      {/* Navigator — minimap + lens on mobile; plain round labels on desktop. */}
      <div className="sticky top-14 z-20 -mx-5 mb-4 select-none bg-canvas/90 px-5 pb-3 pt-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
        {isDesktop ? (
          <div className="mx-auto flex max-w-fit">
            {COLUMNS.map((r, i) => (
              <Fragment key={r}>
                <button
                  onClick={() => goToRound(i)}
                  style={{ width: CARD_W }}
                  className={cn(
                    'shrink-0 text-center font-grotesk text-xs font-bold uppercase tracking-label transition-colors',
                    i === activeRound ? 'text-ink' : 'text-faint hover:text-muted',
                  )}
                >
                  {r}
                </button>
                {i < COLUMNS.length - 1 && <div className="shrink-0" style={{ width: GUTTER }} />}
              </Fragment>
            ))}
          </div>
        ) : (
          <BracketNav rounds={COLUMNS} lensLeft={lensLeft} lensWidth={lensWidth} activeRound={activeRound} onSeek={scrubTo} onTapRound={goToRound} />
        )}
      </div>

      <div ref={scrollRef} className="-mx-5 overflow-x-auto px-5 pb-6 sm:mx-0 sm:px-0">
        <div className="mx-auto flex w-max" style={{ minHeight: cols[0].nos.length * ROW_H }}>
          {cols.map((col, ci) => (
            <Fragment key={col.stage}>
              <div className="flex shrink-0 flex-col" style={{ width: CARD_W }}>
                {col.nos.map((no, i) => (
                  <Slot key={no} hasNext={ci < cols.length - 1} hasPrev={ci > 0} topOfPair={i % 2 === 0}>
                    <MatchCard {...cardProps(no)} anchor={i === 0 ? col.stage : undefined} />
                  </Slot>
                ))}
              </div>
              {ci < cols.length - 1 && <div className="shrink-0" style={{ width: GUTTER }} />}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

/** One match cell with its slim, lightly-rounded bracket connectors in the gutters. */
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
      {hasPrev && <div className={cn('pointer-events-none absolute top-1/2 h-px', STUB)} style={{ right: '100%', width: GUTTER / 2 }} />}
      {hasNext &&
        (topOfPair ? (
          <div className={cn('pointer-events-none absolute rounded-tr-[5px] border-t border-r', CONN)} style={{ left: '100%', top: '50%', width: GUTTER / 2, height: '50%' }} />
        ) : (
          <div className={cn('pointer-events-none absolute rounded-br-[5px] border-b border-r', CONN)} style={{ left: '100%', top: 0, width: GUTTER / 2, height: '50%' }} />
        ))}
      {children}
    </div>
  )
}

/** Mobile navigator: round labels over a draggable minimap (clean dashes, trophy). */
function BracketNav({
  rounds,
  lensLeft,
  lensWidth,
  activeRound,
  onSeek,
  onTapRound,
}: {
  rounds: Stage[]
  lensLeft: number
  lensWidth: number
  activeRound: number
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
    <>
      <div className="mb-2 flex px-1">
        {rounds.map((r, i) => (
          <button
            key={r}
            onClick={() => onTapRound(i)}
            className={cn('flex-1 text-center font-grotesk text-xs font-bold uppercase tracking-label transition-colors', i === activeRound || i === activeRound + 1 ? 'text-ink' : 'text-faint hover:text-muted')}
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
        className="relative h-11 cursor-grab touch-none overflow-hidden rounded-[14px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] active:cursor-grabbing dark:bg-white/[0.06] dark:ring-white/10"
      >
        <div className="pointer-events-none absolute inset-0 flex">
          {rounds.map((r, i) => (
            <div key={r} className="flex flex-1 flex-col items-center justify-center gap-[3px] px-3">
              {i === n - 1 ? (
                <Trophy size={16} className="text-muted" />
              ) : (
                Array.from({ length: MINI_LINES[i] ?? 2 }).map((_, k) => <div key={k} className={cn('h-[2px] w-full rounded-full', STUB)} />)
              )}
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-1 flex items-center justify-between rounded-[11px] bg-black/[0.06] px-1 ring-2 ring-inset ring-black/40 transition-[left] duration-200 ease-calm dark:bg-white/15 dark:ring-white/70"
          style={{ left: `${lensLeft}%`, width: `${lensWidth}%` }}
        >
          <ChevronLeft size={13} className="text-muted" />
          <ChevronRight size={13} className="text-muted" />
        </div>
      </div>
    </>
  )
}

function MatchCard({
  no,
  anchor,
  real,
  homeCode,
  awayCode,
  pick,
  status,
  onPick,
}: {
  no: number
  anchor?: Stage
  real: ResolvedBracketMatch | undefined
  homeCode: TeamCode | null
  awayCode: TeamCode | null
  pick: TeamCode | null
  status: PickStatus
  onPick: (code: TeamCode) => void
}) {
  const def = BRACKET.find((b) => b.matchNo === no)
  const finished = real?.status === 'finished'
  return (
    <div data-round-start={anchor} style={{ scrollMarginTop: 150 }} className="w-full overflow-hidden rounded-[14px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10">
      <div className="px-3 pb-1 pt-2 text-2xs text-faint">
        {finished ? `Full-time · ${fmtDate(def?.kickoff)}` : `${fmtDate(def?.kickoff)} · ${fmtTime(def?.kickoff)}`}
      </div>
      <Side code={homeCode} score={real?.homeScore} picked={pick != null && pick === homeCode} status={status} winner={real?.winnerCode} finished={finished} onPick={onPick} />
      <div className="mx-3 h-px bg-black/5 dark:bg-white/[0.07]" />
      <Side code={awayCode} score={real?.awayScore} picked={pick != null && pick === awayCode} status={status} winner={real?.winnerCode} finished={finished} onPick={onPick} />
    </div>
  )
}

function Side({
  code,
  score,
  picked,
  status,
  winner,
  finished,
  onPick,
}: {
  code: TeamCode | null
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
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
        code && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
        picked && !finished && 'bg-team-soft',
        correct && 'bg-emerald-500/15',
        wrong && 'opacity-40',
        dim && !wrong && 'opacity-45',
      )}
    >
      {team ? (
        <Flag code={code} size={22} className="shrink-0" />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
      )}
      <span className={cn('flex-1 truncate text-[15px]', team ? 'font-semibold text-ink' : 'text-faint', (isWinner || (picked && !finished) || correct) && 'font-semibold')}>
        {team ? team.name : 'TBD'}
      </span>
      {correct && <Check size={13} className="shrink-0 text-emerald-500 dark:text-emerald-400" />}
      {score != null && <span className="font-grotesk text-sm font-bold tnum text-ink">{score}</span>}
    </button>
  )
}
