import { teamByCode } from '@/data/teams'
import type { Match, Stage, TeamCode } from './types'
import { finishedFor, resultFor, type Result } from './record'

/**
 * Bond — now performance-driven.
 *
 * Bond depth reflects HOW WELL the team is doing this tournament, from real
 * finished matches only. A win deepens it most; a convincing win (big goal
 * difference) and beating a higher-seeded opponent add more; reaching the
 * knockouts adds more again. A loss never subtracts — it just adds very little.
 * There is no manual input anywhere; this is the single source of truth.
 */

export type Mood = 'new' | 'happy' | 'calm' | 'blue' | 'cheering'

/** Base per result. Wins deepen most; a loss adds only a token (never punished). */
const RESULT_BASE: Record<Result, number> = { W: 3, D: 1, L: 0.5 }

/** Worth of the opponent faced, by their seeding pot (1 = strongest). */
const POT_WEIGHT: Record<number, number> = { 1: 1, 2: 0.6, 3: 0.3, 4: 0.1 }

/** Reaching a knockout stage is itself a sign of doing well. */
const STAGE_BONUS: Record<Stage, number> = { group: 0, R32: 1, R16: 2, QF: 4, SF: 6, F3: 6, F: 8 }

function potOf(code: TeamCode | null): number {
  return (code && teamByCode[code]?.pot) || 3
}

/** Bond contribution of a single finished match, from the team's perspective. */
export function matchContribution(m: Match, code: TeamCode): number {
  const r = resultFor(m, code)
  if (!r) return 0
  const isHome = m.homeCode === code
  const own = (isHome ? m.homeScore : m.awayScore) ?? 0
  const opp = (isHome ? m.awayScore : m.homeScore) ?? 0
  const margin = Math.abs(own - opp)
  const oppPot = potOf(isHome ? m.awayCode : m.homeCode)

  let xp = RESULT_BASE[r]
  if (r === 'W') {
    xp += Math.min(Math.max(margin - 1, 0), 3) * 0.5 // convincing-win bonus, capped at +1.5
    xp += POT_WEIGHT[oppPot] ?? 0.3 // quality of the opponent beaten
  } else if (r === 'D') {
    xp += (POT_WEIGHT[oppPot] ?? 0.3) * 0.5 // credit for holding a strong side
  }
  xp += STAGE_BONUS[m.stage] ?? 0
  return xp
}

export function computeXp(matches: Match[], code: TeamCode): number {
  let xp = 0
  for (const m of finishedFor(matches, code)) xp += matchContribution(m, code)
  return xp
}

export interface Level {
  level: number
  name: string
  threshold: number
}

/** Seven gentle stages — the names read as the team's spirits/form, not effort. */
export const LEVELS: Level[] = [
  { level: 1, name: 'Just arrived', threshold: 0 },
  { level: 2, name: 'Settling in', threshold: 3 },
  { level: 3, name: 'Finding form', threshold: 7 },
  { level: 4, name: 'In good spirits', threshold: 12 },
  { level: 5, name: 'On a roll', threshold: 19 },
  { level: 6, name: 'Soaring', threshold: 29 },
  { level: 7, name: 'Living the dream', threshold: 42 },
]

export const MAX_LEVEL = LEVELS.length

export interface BondState {
  xp: number
  level: number
  levelName: string
  /** 0..1 progress toward the next level (1 when maxed). */
  progress: number
  xpIntoLevel: number
  xpForNextLevel: number | null
  mood: Mood
  playedCount: number
  lastResult: Result | null
  lastMatch: Match | null
}

export function levelForXp(xp: number): Level {
  let current = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.threshold) current = l
  return current
}

export function moodFor(
  matches: Match[],
  code: TeamCode,
): { mood: Mood; lastResult: Result | null; lastMatch: Match | null } {
  // Mood reflects the most recent FINISHED result only — there is no live state.
  const finished = finishedFor(matches, code)
  if (finished.length === 0) return { mood: 'new', lastResult: null, lastMatch: null }
  const last = finished[finished.length - 1]
  const r = resultFor(last, code)
  const mood: Mood = r === 'W' ? 'happy' : r === 'D' ? 'calm' : 'blue'
  return { mood, lastResult: r, lastMatch: last }
}

export function computeBond(matches: Match[], code: TeamCode): BondState {
  const xp = computeXp(matches, code)
  const level = levelForXp(xp)
  const idx = level.level - 1
  const next = LEVELS[idx + 1] ?? null
  const base = level.threshold
  const xpIntoLevel = xp - base
  const xpForNextLevel = next ? next.threshold - base : null
  const progress = next ? Math.min(1, xpIntoLevel / (next.threshold - base)) : 1
  const { mood, lastResult, lastMatch } = moodFor(matches, code)

  return {
    xp,
    level: level.level,
    levelName: level.name,
    progress,
    xpIntoLevel,
    xpForNextLevel,
    mood,
    playedCount: finishedFor(matches, code).length,
    lastResult,
    lastMatch,
  }
}

/** A short, warm line describing the mascot's current mood. */
export function moodLine(mood: Mood): string {
  switch (mood) {
    case 'new':
      return 'Just met you. Curious about the season ahead.'
    case 'happy':
      return 'Glowing after the win — lighter on its feet today.'
    case 'calm':
      return 'A measured draw. Content, taking it in stride.'
    case 'blue':
      return 'A little blue after the result. Glad you stayed.'
    case 'cheering':
      return 'On the edge of its seat.'
  }
}
