import { useEffect, useMemo, useRef, useState } from 'react'
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

/** Left-to-right rounds. R32 has 16 matches, each later round exactly half. */
const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']
const ROUND_LABEL: Record<string, string> = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final' }
/** Clean, representative dash counts for the minimap (not the literal match count,
 *  which looked noisy). The Final shows a trophy instead. */
const MINI_LINES = [6, 5, 4, 3]
/** Vertical rhythm: px per match in the focused (left) round. */
const ROW_H = 82
const GUTTER = 36
const LINE = 'bg-black/20 dark:bg-white/25'

/**
 * True bracket position of every match — an in-order walk of the feeder graph
 * (home/away .source.matchNo) gives the R32 leaves in tournament order; each later
 * match sits at its feeders' average index. Sorting a column by this lines every
 * pair up beside the match it feeds (M89 is fed by M74 + M77, not M73 + M74).
 */
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

export function Predict() {
  const { matches } = useApp()
  const { predictions, setPrediction, clearPredictions } = useGames()

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

  const finalOcc = predicted[104]
  const champCode =
    finalOcc && (predictions[104] === finalOcc.homeCode || predictions[104] === finalOcc.awayCode) ? predictions[104] : null
  const champion = champCode ? teamByCode[champCode] : null

  // Apple-style adaptive window: show two adjacent rounds at a time. `focus` is the
  // left/main round; the next round previews on the right. Advancing slides the
  // next round into the main slot and reflows — later rounds show compactly, so
  // there's no giant half-empty tree to pan.
  const [focus, setFocus] = useState(0) // 0..COLUMNS.length-2
  const leftStage = COLUMNS[focus]
  const rightStage = COLUMNS[focus + 1] as Stage | undefined
  const leftNos = byStage.get(leftStage) ?? []
  const rightNos = rightStage ? byStage.get(rightStage) ?? [] : []
  const minHeight = Math.max(ROW_H, leftNos.length * ROW_H)

  // On navigation, bring the reflowed board up to the top (below the pinned nav) —
  // "move the next round up", as Apple does. Skip the very first render.
  const boardRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const el = boardRef.current
    if (!el) return
    const y = window.scrollY + el.getBoundingClientRect().top - 132
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }, [focus])

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
            <button
              onClick={clearPredictions}
              className="rounded-pill border px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
            >
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

      <BracketNav rounds={COLUMNS} focus={focus} onFocus={setFocus} />

      <div ref={boardRef} className="mx-auto w-full max-w-3xl">
        <div className="mb-3 flex items-center gap-2 px-1 text-2xs font-semibold uppercase tracking-label text-faint">
          <span className="text-ink">{ROUND_LABEL[leftStage]}</span>
          {rightStage && (
            <>
              <ChevronRight size={12} className="text-faint" />
              <span>{ROUND_LABEL[rightStage]}</span>
            </>
          )}
        </div>

        <div className="flex" style={{ minHeight }}>
          {/* left / focused round */}
          <div className="flex flex-1 flex-col">
            {leftNos.map((no, i) => (
              <div key={no} className="relative flex min-h-0 flex-1 items-center">
                {rightStage && (
                  <>
                    <div className={cn('absolute top-1/2 h-px', LINE)} style={{ left: '100%', width: GUTTER / 2 }} />
                    {i % 2 === 0 && (
                      <div className={cn('absolute top-1/2 w-px', LINE)} style={{ left: `calc(100% + ${GUTTER / 2}px)`, height: '100%' }} />
                    )}
                  </>
                )}
                <MatchCard
                  no={no}
                  real={byNo.get(no)}
                  homeCode={predicted[no]?.homeCode ?? null}
                  awayCode={predicted[no]?.awayCode ?? null}
                  pick={predictions[no] ?? null}
                  status={score.perMatch[no] ?? 'unpicked'}
                  onPick={(code) => setPrediction(no, code)}
                />
              </div>
            ))}
          </div>

          {rightStage && (
            <>
              <div className="shrink-0" style={{ width: GUTTER }} />
              <div className="flex flex-1 flex-col">
                {rightNos.map((no) => (
                  <div key={no} className="relative flex min-h-0 flex-1 items-center">
                    <div className={cn('absolute top-1/2 h-px', LINE)} style={{ right: '100%', width: GUTTER / 2 }} />
                    <MatchCard
                      no={no}
                      real={byNo.get(no)}
                      homeCode={predicted[no]?.homeCode ?? null}
                      awayCode={predicted[no]?.awayCode ?? null}
                      pick={predictions[no] ?? null}
                      status={score.perMatch[no] ?? 'unpicked'}
                      onPick={(code) => setPrediction(no, code)}
                      muted
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * The Apple-Sports navigator: tappable round labels over a draggable minimap. Each
 * round is a stack of clean dashes (density falls off R32→SF) and the Final shows a
 * trophy; a lens marks the two rounds on screen. Drag it — or tap a round — to move.
 */
function BracketNav({ rounds, focus, onFocus }: { rounds: Stage[]; focus: number; onFocus: (i: number) => void }) {
  const n = rounds.length
  const maxFocus = n - 2
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const focusFromX = (clientX: number) => {
    const el = trackRef.current
    if (!el) return focus
    const r = el.getBoundingClientRect()
    const seg = Math.floor(((clientX - r.left) / r.width) * n)
    return Math.max(0, Math.min(maxFocus, seg))
  }

  const lensLeft = (focus / n) * 100
  const lensWidth = (2 / n) * 100

  return (
    <div className="sticky top-14 z-20 -mx-5 mb-5 select-none bg-canvas/90 px-5 pb-3 pt-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
      <div className="mb-2 flex px-1">
        {rounds.map((r, i) => (
          <button
            key={r}
            onClick={() => onFocus(Math.min(maxFocus, i))}
            className={cn(
              'flex-1 text-center font-grotesk text-xs font-bold uppercase tracking-label transition-colors',
              i === focus || i === focus + 1 ? 'text-ink' : 'text-faint hover:text-muted',
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          onFocus(focusFromX(e.clientX))
        }}
        onPointerMove={(e) => dragging.current && onFocus(focusFromX(e.clientX))}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="relative h-12 cursor-grab touch-none overflow-hidden rounded-[16px] bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] active:cursor-grabbing dark:bg-white/[0.06] dark:ring-white/10"
      >
        <div className="pointer-events-none absolute inset-0 flex">
          {rounds.map((r, i) => (
            <div key={r} className="flex flex-1 flex-col items-center justify-center gap-[3px] px-3">
              {i === n - 1 ? (
                <Trophy size={18} className="text-muted" />
              ) : (
                Array.from({ length: MINI_LINES[i] ?? 3 }).map((_, k) => (
                  <div key={k} className={cn('h-[2px] w-full rounded-full', LINE)} />
                ))
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
      <Side
        code={homeCode}
        label={def?.home.label}
        score={real?.homeScore}
        picked={pick != null && pick === homeCode}
        status={status}
        winner={real?.winnerCode}
        finished={finished}
        onPick={onPick}
      />
      <div className="my-0.5 h-px bg-black/5 dark:bg-white/[0.07]" />
      <Side
        code={awayCode}
        label={def?.away.label}
        score={real?.awayScore}
        picked={pick != null && pick === awayCode}
        status={status}
        winner={real?.winnerCode}
        finished={finished}
        onPick={onPick}
      />
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
        <span
          className={cn(
            'truncate text-[13px]',
            team ? 'text-ink' : 'text-faint',
            (isWinner || (picked && !finished) || correct) && 'font-semibold',
          )}
        >
          {team ? team.name : label ?? '—'}
        </span>
        {correct && <Check size={12} className="shrink-0 text-emerald-500 dark:text-emerald-400" />}
      </span>
      {score != null && <span className="font-grotesk text-sm font-bold tnum text-ink">{score}</span>}
    </button>
  )
}
