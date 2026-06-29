import type { BracketMatch, ResolvedBracketMatch, Stage, TeamCode } from './types'

/** User's predicted winner per bracket match number. */
export const PICKED_AT_KEY = '__pickedAt'
export const LOCKED_AT_KEY = '__lockedAt'
export const LOCK_FLAG = '__locked'
export const EARLY_LOCK_MULTIPLIER = 1.4
export type Predictions = Record<number, TeamCode> & {
  [PICKED_AT_KEY]?: Record<string, number>
  [LOCKED_AT_KEY]?: number
}

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

export type PickStatus = 'correct' | 'wrong' | 'pending' | 'unpicked' | 'late'

export interface PredictScore {
  points: number
  basePoints: number
  earlyLockBonus: number
  correct: number
  graded: number
  perMatch: Record<number, PickStatus>
}

/**
 * Grade predictions against REAL finished results only. A pick is valid only if
 * it was recorded before that match's kickoff; late picks stay visible but score
 * nothing. Never inspects or invents future outcomes.
 */
export function scorePredictions(predictions: Predictions, resolved: ResolvedBracketMatch[]): PredictScore {
  let points = 0
  let basePoints = 0
  let earlyLockBonus = 0
  let correct = 0
  let graded = 0
  const perMatch: Record<number, PickStatus> = {}

  for (const m of resolved) {
    const pick = predictions[m.matchNo]
    if (!pick) {
      perMatch[m.matchNo] = 'unpicked'
      continue
    }
    if (isLatePrediction(predictions, m)) {
      perMatch[m.matchNo] = 'late'
      continue
    }
    if (m.status === 'finished' && m.winnerCode) {
      graded++
      if (pick === m.winnerCode) {
        correct++
        const base = ROUND_POINTS[m.stage] ?? 1
        const bonus = hasEarlyLockBonus(predictions, m) ? roundTenth(base * (EARLY_LOCK_MULTIPLIER - 1)) : 0
        basePoints += base
        earlyLockBonus = roundTenth(earlyLockBonus + bonus)
        points = roundTenth(points + base + bonus)
        perMatch[m.matchNo] = 'correct'
      } else {
        perMatch[m.matchNo] = 'wrong'
      }
    } else {
      perMatch[m.matchNo] = 'pending'
    }
  }
  return { points, basePoints, earlyLockBonus, correct, graded, perMatch }
}

export function pickedAtFor(predictions: Predictions, matchNo: number): number | null {
  const ts = predictions[PICKED_AT_KEY]?.[String(matchNo)]
  return typeof ts === 'number' && Number.isFinite(ts) ? ts : null
}

export function lockedAtFor(predictions: Predictions): number | null {
  const ts = predictions[LOCKED_AT_KEY]
  return typeof ts === 'number' && Number.isFinite(ts) ? ts : null
}

export function kickoffMs(match: { kickoff?: string }): number | null {
  if (!match.kickoff) return null
  const ms = new Date(match.kickoff).getTime()
  return Number.isFinite(ms) ? ms : null
}

export function hasMatchStarted(match: { kickoff?: string }, now: number = Date.now()): boolean {
  const deadline = kickoffMs(match)
  return deadline != null && now >= deadline
}

export function isLatePrediction(predictions: Predictions, match: { matchNo: number; kickoff?: string }): boolean {
  const deadline = kickoffMs(match)
  if (deadline == null) return false
  const pickedAt = pickedAtFor(predictions, match.matchNo)
  return pickedAt == null || pickedAt > deadline
}

export function hasEarlyLockBonus(predictions: Predictions, match: { kickoff?: string }): boolean {
  const deadline = kickoffMs(match)
  const lockedAt = lockedAtFor(predictions)
  return deadline != null && lockedAt != null && lockedAt <= deadline
}

export function stampMissingPredictionTimes(
  preds: Predictions,
  bracket: Array<Pick<BracketMatch, 'matchNo' | 'kickoff'>>,
  at: number = Date.now(),
): Predictions {
  const pickedAt = { ...(preds[PICKED_AT_KEY] ?? {}) }
  const firstKickoff = Math.min(...bracket.map((m) => kickoffMs(m)).filter((ms): ms is number => ms != null))
  const legacyAt = Number.isFinite(firstKickoff) ? firstKickoff - 1 : at
  const numericMatches = bracket.filter((m) => preds[m.matchNo] != null)
  const numericPickedTimes = numericMatches
    .map((m) => pickedAt[String(m.matchNo)])
    .filter((ts): ts is number => typeof ts === 'number' && Number.isFinite(ts))
  const uniquePickedTimes = new Set(numericPickedTimes)
  const lockedAt = lockedAtFor(preds)
  const hadBadBulkStamp =
    (preds as Record<string, unknown>)[LOCK_FLAG] === true &&
    numericMatches.length > 0 &&
    numericPickedTimes.length === numericMatches.length &&
    uniquePickedTimes.size === 1 &&
    lockedAt === numericPickedTimes[0] &&
    numericPickedTimes[0] > legacyAt
  let changed = false

  for (const m of bracket) {
    if (preds[m.matchNo] != null && (pickedAt[String(m.matchNo)] == null || hadBadBulkStamp)) {
      pickedAt[String(m.matchNo)] = legacyAt
      changed = true
    }
  }
  if ((preds as Record<string, unknown>)[LOCK_FLAG] === true && (preds[LOCKED_AT_KEY] == null || hadBadBulkStamp)) {
    changed = true
  }
  return changed
    ? ({ ...preds, [PICKED_AT_KEY]: pickedAt, [LOCKED_AT_KEY]: hadBadBulkStamp ? legacyAt : preds[LOCKED_AT_KEY] ?? legacyAt } as Predictions)
    : preds
}

function roundTenth(n: number): number {
  return Math.round(n * 10) / 10
}

export interface PredictedOccupants {
  homeCode: TeamCode | null
  awayCode: TeamCode | null
}

/**
 * Build the user's OWN predicted bracket: R32 slots come from real group results
 * (resolveBracket), and later slots are filled by the user's predicted feeder
 * winner until a feeder has a real finished result. Once a match is finished,
 * the real winner/loser advances so new or late users can still pick later ties.
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
      if (w != null) {
        // Reject a stale pick that is no longer one of the feeder's (known) occupants.
        const f = out[ref.matchNo]
        if (f && f.homeCode != null && f.awayCode != null && w !== f.homeCode && w !== f.awayCode) return null
        return w
      }
      const real = realByNo.get(ref.matchNo)
      return real?.status === 'finished' ? real.winnerCode ?? null : null
    }
    if (kind === 'matchLoser' && ref.matchNo != null) {
      const src = out[ref.matchNo]
      const w = predictions[ref.matchNo]
      if (w != null) {
        if (!src || src.homeCode == null || src.awayCode == null) return null
        if (w !== src.homeCode && w !== src.awayCode) return null // stale
        return src.homeCode === w ? src.awayCode : src.homeCode
      }
      const real = realByNo.get(ref.matchNo)
      if (real?.status !== 'finished' || real.winnerCode == null || real.homeCode == null || real.awayCode == null) return null
      return real.homeCode === real.winnerCode ? real.awayCode : real.homeCode
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
