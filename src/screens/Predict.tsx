import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import { resolveBracket, STAGE_LABEL } from '@/domain/bracket'
import { buildPredictedBracket, scorePredictions, type PickStatus } from '@/domain/predict'
import type { ResolvedBracketMatch, SlotSource, Stage, TeamCode } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

/** Left-to-right rounds. R32 has 16 matches, each later round exactly half. */
const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']

/** Card + gutter geometry (px). The gutter holds the connecting lines. */
const CARD_W = 232
const GUTTER = 44

/**
 * True bracket position of every match. The R32 ties are not wired as adjacent
 * match numbers (M89 is fed by M74 + M77, not M73 + M74), so ordering a column by
 * matchNo would draw the tree wrong. We walk the feeder graph from the final to
 * get the R32 leaves in tournament order, then place each later match at its
 * feeders' average leaf index — so sorting any column by this value puts every
 * pair directly beside the match it feeds, and the connectors line up.
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

  /** Match numbers per stage in true bracket order — so each adjacent pair sits
   *  beside the match it feeds and the connectors line up. */
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
    finalOcc && (predictions[104] === finalOcc.homeCode || predictions[104] === finalOcc.awayCode)
      ? predictions[104]
      : null
  const champion = champCode ? teamByCode[champCode] : null

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

      <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
        {/* Column header row — aligned to the round columns below. */}
        <div className="flex min-w-max">
          {COLUMNS.map((stage, ci) => (
            <div
              key={stage}
              className="shrink-0"
              style={{ width: CARD_W, marginRight: ci < COLUMNS.length - 1 ? GUTTER : 0 }}
            >
              <p className="mb-3 px-1 text-2xs font-medium uppercase tracking-label text-faint">
                {STAGE_LABEL[stage]}
                <span className="ml-1.5 text-faint/60">{(byStage.get(stage) ?? []).length}</span>
              </p>
            </div>
          ))}
        </div>

        {/* The bracket tree: equal-height flex columns; each match is a flex-1
            slot that centers its card. Because each round has exactly half the
            slots of the previous one, every next-round card lands on the midpoint
            of its two feeders automatically. Connectors are drawn per slot. */}
        <div className="flex min-w-max" style={{ minHeight: 16 * 64 }}>
          {COLUMNS.map((stage, ci) => {
            const nos = byStage.get(stage) ?? []
            const isFirst = ci === 0
            const isLast = ci === COLUMNS.length - 1
            return (
              <div
                key={stage}
                className="flex shrink-0 flex-col"
                style={{ width: CARD_W, marginRight: isLast ? 0 : GUTTER }}
              >
                {nos.map((no, i) => (
                  <div key={no} className="relative flex min-h-0 flex-1 items-center">
                    {/* Connectors live in the gutters around the card. */}
                    <Connectors
                      isFirstRound={isFirst}
                      isLastRound={isLast}
                      isTopOfPair={i % 2 === 0}
                    />
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
            )
          })}
        </div>
      </div>
    </div>
  )
}

const LINE = 'absolute bg-black/15 dark:bg-white/20'

/**
 * The classic bracket "tree" wiring for one match slot, drawn with thin
 * absolutely-positioned divs that sit in the gutters left and right of the card:
 *
 *  - right stub  : a horizontal line out of the card's right edge (every match
 *                  except the Final) reaching halfway across the right gutter.
 *  - vertical    : on the TOP match of each pair, a vertical line at the mid-gutter
 *                  running from this slot's centre down a full slot-height to the
 *                  bottom match's centre — joining the pair.
 *  - left stub   : a horizontal line into the card's left edge (every match except
 *                  the first round) from the mid-gutter, completing the join.
 *
 * Because paired slots are equal-height flex-1 siblings, "down one slot-height"
 * lands exactly on the sibling's centre, so the lines meet pixel-cleanly in both
 * light and dark.
 */
function Connectors({
  isFirstRound,
  isLastRound,
  isTopOfPair,
}: {
  isFirstRound: boolean
  isLastRound: boolean
  isTopOfPair: boolean
}) {
  const half = GUTTER / 2
  return (
    <>
      {/* Left stub: from mid-left-gutter into the card. */}
      {!isFirstRound && (
        <div
          className={cn(LINE, 'h-px')}
          style={{ right: '100%', width: half, top: '50%' }}
        />
      )}

      {/* Right stub: from the card's right edge out to mid-right-gutter. */}
      {!isLastRound && (
        <div
          className={cn(LINE, 'h-px')}
          style={{ left: '100%', width: half, top: '50%' }}
        />
      )}

      {/* Vertical joiner: drawn once per pair, on the top slot, reaching down to
          the bottom slot's centre (exactly one slot-height away). */}
      {!isLastRound && isTopOfPair && (
        <div
          className={cn(LINE, 'w-px')}
          style={{ left: `calc(100% + ${half}px)`, top: '50%', height: '100%' }}
        />
      )}
    </>
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
}: {
  no: number
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
    <div className="relative z-10 w-full rounded-[16px] bg-black/[0.04] p-1.5 ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10">
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
