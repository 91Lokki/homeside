import { BRACKET } from '@/data/bracket'
import { SEED_MATCHES } from '@/data/fixtures'
import { resolveBracket } from './bracket'
import { computeQualification } from './record'
import type { Match, Team, TeamCode } from './types'
import { ROUNDS, stageToRound, type Round } from './fantasy'

/** Earliest scheduled kickoff (ms) of a round, from the fixed bracket wiring. */
export function roundFirstKickoff(round: Round): number | null {
  const ks = BRACKET.filter((b) => stageToRound(b.stage) === round && b.kickoff)
    .map((b) => new Date(b.kickoff as string).getTime())
    .filter((t) => !Number.isNaN(t))
  return ks.length ? Math.min(...ks) : null
}

/* ------------------------------ match windows ----------------------------- */
// Used to poll real results faster only while a knockout match is actually on,
// so end-of-match updates land within a couple of minutes — and we sit idle
// (near-zero API budget) the rest of the time.

/** A knockout match is "live" from a few minutes before kickoff until well past
 *  full time (covers 90' + stoppage + extra time + a shootout + the result lag). */
const LEAD_MS = 5 * 60 * 1000
const WINDOW_MS = 170 * 60 * 1000 // ~2h50 after kickoff

/** Every knockout kickoff (ms), ascending. */
export function knockoutKickoffs(): number[] {
  return BRACKET.filter((b) => stageToRound(b.stage) && b.kickoff)
    .map((b) => new Date(b.kickoff as string).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
}

/** UTC calendar dates (YYYY-MM-DD) of any knockout match whose live window covers
 *  `now`. Usually one date; two only around a UTC midnight. Empty when nothing's on. */
export function activeMatchDates(now: number = Date.now()): string[] {
  const dates = new Set<string>()
  for (const k of knockoutKickoffs()) {
    if (now >= k - LEAD_MS && now <= k + WINDOW_MS) dates.add(new Date(k).toISOString().slice(0, 10))
  }
  return [...dates]
}

/** True while at least one knockout match is in its live window. */
export function inMatchWindow(now: number = Date.now()): boolean {
  return activeMatchDates(now).length > 0
}

/** Every scheduled kickoff (ms) across the whole tournament — group stage (seed)
 *  and knockouts (bracket) — ascending. */
function allKickoffs(): number[] {
  const seed = SEED_MATCHES.map((m) => new Date(m.kickoff).getTime())
  const ko = BRACKET.filter((b) => b.kickoff).map((b) => new Date(b.kickoff as string).getTime())
  return [...seed, ...ko].filter((t) => !Number.isNaN(t)).sort((a, b) => a - b)
}

/** UTC calendar dates (YYYY-MM-DD) of ANY match — group or knockout — whose live
 *  window covers `now`. This widens the fast live poll to group-stage games too, so
 *  their score and clock update in near-real-time (ESPN is free/unlimited). */
export function liveMatchDates(now: number = Date.now()): string[] {
  const dates = new Set<string>()
  for (const k of allKickoffs()) {
    if (now >= k - LEAD_MS && now <= k + WINDOW_MS) dates.add(new Date(k).toISOString().slice(0, 10))
  }
  return [...dates]
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
  const qualification = computeQualification(matches, teams)
  for (const [code, status] of qualification) {
    if (status === 'out') out.add(code)
  }
  for (const m of resolved) {
    if (m.status === 'finished' && m.winnerCode && m.stage !== 'SF') {
      const loser = m.homeCode === m.winnerCode ? m.awayCode : m.homeCode
      if (loser) out.add(loser)
    }
  }
  return out
}
