import type { BracketMatch, ResolvedBracketMatch, Stage, TeamCode } from './types'

/** User's predicted winner per bracket match number. */
export type Predictions = Record<number, TeamCode>

/** Points for a correct pick, weighted by how deep the round is. */
export const ROUND_POINTS: Record<Stage, number> = {
  group: 0,
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 5,
  F3: 1,
  F: 8,
}

export type PickStatus = 'correct' | 'wrong' | 'pending' | 'unpicked'

export interface PredictScore {
  points: number
  correct: number
  graded: number
  perMatch: Record<number, PickStatus>
}

/**
 * Grade predictions against REAL finished results only. A pick is graded once
 * that real match is finished; correct → points (round-weighted). Never inspects
 * or invents future outcomes.
 */
export function scorePredictions(predictions: Predictions, resolved: ResolvedBracketMatch[]): PredictScore {
  let points = 0
  let correct = 0
  let graded = 0
  const perMatch: Record<number, PickStatus> = {}

  for (const m of resolved) {
    const pick = predictions[m.matchNo]
    if (!pick) {
      perMatch[m.matchNo] = 'unpicked'
      continue
    }
    if (m.status === 'finished' && m.winnerCode) {
      graded++
      if (pick === m.winnerCode) {
        correct++
        points += ROUND_POINTS[m.stage] ?? 1
        perMatch[m.matchNo] = 'correct'
      } else {
        perMatch[m.matchNo] = 'wrong'
      }
    } else {
      perMatch[m.matchNo] = 'pending'
    }
  }
  return { points, correct, graded, perMatch }
}

export interface PredictedOccupants {
  homeCode: TeamCode | null
  awayCode: TeamCode | null
}

/**
 * Build the user's OWN predicted bracket: R32 slots come from real group results
 * (resolveBracket), and each later slot is filled by the user's predicted winner
 * of the feeding match — so picks propagate forward to the champion.
 */
export function buildPredictedBracket(
  bracket: BracketMatch[],
  resolved: ResolvedBracketMatch[],
  predictions: Predictions,
): Record<number, PredictedOccupants> {
  const realByNo = new Map(resolved.map((m) => [m.matchNo, m]))
  const out: Record<number, PredictedOccupants> = {}
  const ordered = [...bracket].sort((a, b) => a.matchNo - b.matchNo)

  const occ = (kind: string, ref: { matchNo?: number }, side: 'home' | 'away', no: number): TeamCode | null => {
    if (kind === 'matchWinner' && ref.matchNo != null) {
      const w = predictions[ref.matchNo]
      if (w == null) return null
      // Reject a stale pick that is no longer one of the feeder's (known) occupants.
      const f = out[ref.matchNo]
      if (f && f.homeCode != null && f.awayCode != null && w !== f.homeCode && w !== f.awayCode) return null
      return w
    }
    if (kind === 'matchLoser' && ref.matchNo != null) {
      const src = out[ref.matchNo]
      const w = predictions[ref.matchNo]
      if (!src || !w || src.homeCode == null || src.awayCode == null) return null
      if (w !== src.homeCode && w !== src.awayCode) return null // stale
      return src.homeCode === w ? src.awayCode : src.homeCode
    }
    // group-derived slot (winner / runnerUp / third) — use the REAL resolved team
    const real = realByNo.get(no)
    return side === 'home' ? real?.homeCode ?? null : real?.awayCode ?? null
  }

  for (const m of ordered) {
    out[m.matchNo] = {
      homeCode: occ(m.home.source.kind, m.home.source as { matchNo?: number }, 'home', m.matchNo),
      awayCode: occ(m.away.source.kind, m.away.source as { matchNo?: number }, 'away', m.matchNo),
    }
  }
  return out
}
