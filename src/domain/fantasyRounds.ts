import { BRACKET } from '@/data/bracket'
import { resolveBracket } from './bracket'
import type { Match, Team, TeamCode } from './types'
import { ROUNDS, stageToRound, type Round } from './fantasy'

/** Earliest scheduled kickoff (ms) of a round, from the fixed bracket wiring. */
export function roundFirstKickoff(round: Round): number | null {
  const ks = BRACKET.filter((b) => stageToRound(b.stage) === round && b.kickoff)
    .map((b) => new Date(b.kickoff as string).getTime())
    .filter((t) => !Number.isNaN(t))
  return ks.length ? Math.min(...ks) : null
}

/** A round locks once its first match has kicked off. */
export function isRoundLocked(round: Round, now: number = Date.now()): boolean {
  const k = roundFirstKickoff(round)
  return k != null && k <= now
}

/** The round currently open for editing (first not-yet-locked round). */
export function currentRound(now: number = Date.now()): Round {
  for (const r of ROUNDS) if (!isRoundLocked(r, now)) return r
  return 'FINAL'
}

export function previousRound(round: Round): Round | null {
  const i = ROUNDS.indexOf(round)
  return i > 0 ? ROUNDS[i - 1] : null
}

/**
 * Teams with no remaining World Cup match. A semi-final loser is NOT eliminated
 * (they play the third-place play-off); the F3/F losers are.
 */
export function eliminatedTeams(matches: Match[], teams: Team[]): Set<TeamCode> {
  const resolved = resolveBracket(BRACKET, teams, matches)
  const out = new Set<TeamCode>()
  for (const m of resolved) {
    if (m.status === 'finished' && m.winnerCode && m.stage !== 'SF') {
      const loser = m.homeCode === m.winnerCode ? m.awayCode : m.homeCode
      if (loser) out.add(loser)
    }
  }
  return out
}
