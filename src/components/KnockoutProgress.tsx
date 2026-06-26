import { Check, Trophy } from 'lucide-react'
import type { Round } from '@/domain/fantasy'
import { cn } from '@/lib/utils'

export type RoundState = 'done' | 'live' | 'focus' | 'upcoming'

export interface ProgressNode {
  round: Round
  label: string
  state: RoundState
  points?: number
  dateLabel?: string
}

/**
 * The knockout run as a timeline (not a switcher): a single animated track that
 * fills as the tournament advances, a pulsing node for a round in play, a trophy
 * at the Final. Motion only — the design system forbids gradients and shadows.
 */
export function KnockoutProgress({ nodes }: { nodes: ProgressNode[] }) {
  const n = nodes.length
  const live = nodes.some((x) => x.state === 'live')
  const allDone = n > 0 && nodes.every((x) => x.state === 'done')
  const activeIndex = Math.max(0, nodes.findIndex((x) => x.state === 'live' || x.state === 'focus'))
  const fillPct = allDone ? 100 : n > 1 ? (activeIndex / (n - 1)) * 100 : 0

  return (
    <div className="mb-7">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">{allDone ? 'Champions crowned' : 'Knockout run'}</span>
        {live && (
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-team-soft px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-label text-team">
            <span className="relative grid h-1.5 w-1.5 place-items-center">
              <span className="absolute inset-0 rounded-full bg-team animate-ping" />
              <span className="h-1.5 w-1.5 rounded-full bg-team" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="relative">
        {/* base track + animated fill, drawn between the first and last node centres */}
        <div className="absolute left-[18px] right-[18px] top-[18px] h-[2px] -translate-y-1/2 rounded-full bg-hairline" />
        <div
          className="absolute left-[18px] top-[18px] h-[2px] -translate-y-1/2 rounded-full bg-team transition-[width] duration-700 ease-calm"
          style={{ width: `calc((100% - 36px) * ${fillPct / 100})` }}
        />

        <div className="relative flex items-start justify-between">
          {nodes.map((node) => (
            <Node key={node.round} node={node} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Node({ node }: { node: ProgressNode }) {
  const { state, round, label, points, dateLabel } = node
  const isFinal = round === 'FINAL'
  const filled = state === 'done' || state === 'live'

  return (
    <div className="flex w-9 flex-col items-center">
      <div className="relative grid h-9 w-9 place-items-center">
        {state === 'live' && <span className="absolute inset-0 rounded-full bg-team/25 animate-ping" />}
        <div
          className={cn(
            'relative grid h-9 w-9 place-items-center rounded-full font-grotesk text-[11px] font-semibold transition-colors duration-500',
            filled && 'bg-team text-team-ink',
            state === 'focus' && 'border-2 border-team bg-surface text-team',
            state === 'upcoming' && 'border border-hairline bg-surface text-faint',
          )}
        >
          {isFinal ? <Trophy size={14} /> : state === 'done' ? <Check size={15} strokeWidth={2.5} /> : label}
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center text-center leading-tight">
        <span className={cn('font-grotesk text-2xs font-medium', state === 'upcoming' ? 'text-faint' : 'text-muted')}>
          {isFinal ? 'Final' : label}
        </span>
        <span className="mt-0.5 text-[10px] tnum">
          {state === 'done' ? (
            <span className="font-semibold text-team">{points ?? 0} pts</span>
          ) : state === 'live' ? (
            <span className="font-semibold uppercase tracking-label text-team">live</span>
          ) : (
            <span className="text-faint">{dateLabel ?? ''}</span>
          )}
        </span>
      </div>
    </div>
  )
}
