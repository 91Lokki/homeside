import type { Match, TeamCode } from './types'
import { finishedFor, resultFor, type Result } from './record'

/**
 * Mascot expression. The bond/leveling system is gone; the mascot is now just a
 * small accent whose face reflects the team's most recent real result.
 */
export type Mood = 'new' | 'happy' | 'calm' | 'blue'

export function moodFor(matches: Match[], code: TeamCode): { mood: Mood; lastResult: Result | null; lastMatch: Match | null } {
  const finished = finishedFor(matches, code)
  if (finished.length === 0) return { mood: 'new', lastResult: null, lastMatch: null }
  const last = finished[finished.length - 1]
  const r = resultFor(last, code)
  const mood: Mood = r === 'W' ? 'happy' : r === 'D' ? 'calm' : 'blue'
  return { mood, lastResult: r, lastMatch: last }
}

/** A short, warm line for the mascot accent. */
export function moodLine(mood: Mood): string {
  switch (mood) {
    case 'new':
      return 'Waiting for the next match.'
    case 'happy':
      return 'Glowing after the win.'
    case 'calm':
      return 'A measured draw — taking it in stride.'
    case 'blue':
      return 'A little blue after the result.'
  }
}
