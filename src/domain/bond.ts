import type { Match, Stage, TeamCode } from './types'
import { finishedFor, liveMatchFor, resultFor, type Result } from './record'

/**
 * Bond — the heart of the app.
 *
 * The mascot grows ONLY from real, finished matches its team has played.
 * Growth is never negative: a win grows the bond most, a draw a little less, and
 * even a loss still nudges it forward — you kept the mascot company through it.
 * There is no manual input anywhere; this function is the single source of truth.
 */

export type Mood = 'new' | 'happy' | 'calm' | 'blue' | 'cheering'

/** XP per result. All positive — the mascot is never punished. */
const RESULT_XP: Record<Result, number> = { W: 3, D: 2, L: 1 }

/** Bonus XP layered on by the stage actually reached (a real achievement). */
const STAGE_BONUS: Record<Stage, number> = {
  group: 0,
  R32: 1,
  R16: 2,
  QF: 4,
  SF: 6,
  F3: 6,
  F: 8,
}

export interface Level {
  level: number
  name: string
  /** Cumulative XP needed to reach this level. */
  threshold: number
}

/** Seven gentle stages of growth. */
export const LEVELS: Level[] = [
  { level: 1, name: 'New friend', threshold: 0 },
  { level: 2, name: 'Settling in', threshold: 3 },
  { level: 3, name: 'Warming up', threshold: 7 },
  { level: 4, name: 'Good company', threshold: 12 },
  { level: 5, name: 'Close bond', threshold: 19 },
  { level: 6, name: 'Inseparable', threshold: 28 },
  { level: 7, name: 'Kindred spirit', threshold: 38 },
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
  /** How many notable squad members are revealed at this bond level. */
  unlockedNotable: number
  lastResult: Result | null
  lastMatch: Match | null
}

/** Total XP earned from a team's real finished matches. */
export function computeXp(matches: Match[], code: TeamCode): number {
  let xp = 0
  for (const m of finishedFor(matches, code)) {
    const r = resultFor(m, code)
    if (!r) continue
    xp += RESULT_XP[r] + (STAGE_BONUS[m.stage] ?? 0)
  }
  return xp
}

export function levelForXp(xp: number): Level {
  let current = LEVELS[0]
  for (const l of LEVELS) if (xp >= l.threshold) current = l
  return current
}

/** How many notable squad members are unlocked at a given level. */
export function unlockedNotableForLevel(level: number): number {
  // One companion joins at each level from 2 upward.
  return Math.max(0, level - 1)
}

export function moodFor(matches: Match[], code: TeamCode): { mood: Mood; lastResult: Result | null; lastMatch: Match | null } {
  const live = liveMatchFor(matches, code)
  if (live) {
    return { mood: 'cheering', lastResult: null, lastMatch: live }
  }
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
    unlockedNotable: unlockedNotableForLevel(level.level),
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
      return 'On the edge of its seat — the match is live.'
  }
}
