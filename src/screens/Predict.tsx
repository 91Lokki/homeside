import { useMemo } from 'react'
import { Check } from 'lucide-react'
import { BRACKET } from '@/data/bracket'
import { TEAMS, teamByCode } from '@/data/teams'
import { resolveBracket, STAGE_LABEL } from '@/domain/bracket'
import { buildPredictedBracket, scorePredictions, type PickStatus } from '@/domain/predict'
import type { ResolvedBracketMatch, Stage, TeamCode } from '@/domain/types'
import { Flag } from '@/components/Flag'
import { Label } from '@/components/ui/atoms'
import { useApp } from '@/state/store'
import { useGames } from '@/state/games'
import { cn } from '@/lib/utils'

const COLUMNS: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F']

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
    for (const arr of m.values()) arr.sort((a, b) => a - b)
    return m
  }, [])

  const finalOcc = predicted[104]
  const champCode = finalOcc && (predictions[104] === finalOcc.homeCode || predictions[104] === finalOcc.awayCode) ? predictions[104] : null
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
            <p className="text-2xs text-faint">pts · {score.correct}/{score.graded} graded</p>
          </div>
          {Object.keys(predictions).length > 0 && (
            <button onClick={clearPredictions} className="rounded-pill border px-3 py-1.5 text-xs text-muted hover:text-ink">
              Reset
            </button>
          )}
        </div>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Tap a team to predict who wins each tie — your picks carry forward to the next round, all the way to a champion.
        As real matches finish, correct picks turn <span className="font-medium text-emerald-600 dark:text-emerald-400">green</span> and
        wrong ones grey. You make every call; nothing is auto-picked or predicted for you.
      </p>

      {champion && (
        <div className="panel mb-6 inline-flex items-center gap-2 px-4 py-2">
          <Label>Your champion</Label>
          <span className="font-grotesk text-lg font-semibold text-team">{champion.name}</span>
        </div>
      )}

      <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((stage) => (
            <div key={stage} className="w-60 shrink-0">
              <p className="mb-3 text-2xs font-medium uppercase tracking-label text-faint">{STAGE_LABEL[stage]}</p>
              <div className={cn('flex flex-col gap-3', stage !== 'R32' && 'justify-around', stage === 'F' && 'h-full justify-center')}>
                {(byStage.get(stage) ?? []).map((no) => (
                  <MatchCard
                    key={no}
                    no={no}
                    real={byNo.get(no)}
                    homeCode={predicted[no]?.homeCode ?? null}
                    awayCode={predicted[no]?.awayCode ?? null}
                    pick={predictions[no] ?? null}
                    status={score.perMatch[no] ?? 'unpicked'}
                    onPick={(code) => setPrediction(no, code)}
                  />
                ))}
              </div>
            </div>
          ))}
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
    <div className="rounded-[14px] bg-black/[0.04] p-1.5 ring-1 ring-inset ring-black/[0.06] backdrop-blur-xl dark:bg-white/[0.06] dark:ring-white/10">
      <div className="mb-0.5 flex items-center justify-between px-1.5">
        <span className="text-[9px] font-medium uppercase tracking-label text-faint">M{no}</span>
        {finished && <span className="text-[9px] uppercase tracking-label text-faint">FT</span>}
      </div>
      <Side code={homeCode} label={def?.home.label} score={real?.homeScore} picked={pick != null && pick === homeCode} status={status} winner={real?.winnerCode} finished={finished} onPick={onPick} />
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

  return (
    <button
      disabled={!code}
      onClick={() => code && onPick(code)}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left transition-colors',
        code && 'hover:bg-black/5 dark:hover:bg-white/10',
        picked && !finished && 'bg-team-soft ring-1 ring-inset ring-team/40',
        correct && 'bg-emerald-500/20',
        wrong && 'opacity-45',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {team ? <Flag code={code} size={18} /> : <span className="h-[18px] w-[18px] shrink-0 rounded-full bg-black/[0.06] dark:bg-white/8" />}
        <span className={cn('truncate text-[13px]', team ? 'text-ink' : 'text-faint', (isWinner || picked) && 'font-semibold')}>
          {team ? team.name : label ?? '—'}
        </span>
        {correct && <Check size={12} className="shrink-0 text-emerald-400" />}
      </span>
      {score != null && <span className="font-grotesk text-sm font-bold tnum text-ink">{score}</span>}
    </button>
  )
}
