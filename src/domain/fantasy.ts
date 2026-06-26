import type { MatchDetail } from '@/lib/api'
import type { TeamCode } from './types'

/**
 * 5-player fantasy. Scoring comes ONLY from real Highlightly box-score events
 * (goals/assists/cards) + team clean sheets, over finished KNOCKOUT matches.
 * A pick stops scoring once its team is eliminated (no further matches exist).
 */

export type Slot = 'ST' | 'F' | 'M' | 'D' | 'GK'
export const SLOTS: Slot[] = ['ST', 'F', 'M', 'D', 'GK']
export const SLOT_LABEL: Record<Slot, string> = {
  ST: 'Striker',
  F: 'Forward',
  M: 'Midfielder',
  D: 'Defender',
  GK: 'Goalkeeper',
}
/** Which roster position each slot draws from. */
export const SLOT_POSITION: Record<Slot, 'FW' | 'MF' | 'DF' | 'GK'> = { ST: 'FW', F: 'FW', M: 'MF', D: 'DF', GK: 'GK' }

export interface FantasyPick {
  slot: Slot
  name: string
  teamCode: TeamCode
  position: string
  number: number | null
}
export type FantasyTeam = Partial<Record<Slot, FantasyPick>>

/* ------------------------------ scoring table ----------------------------- */
// Goal value by position (defenders/keepers score rarer → worth more).
const GOAL_POINTS: Record<string, number> = { GK: 6, DF: 6, MF: 5, FW: 4 }
const CLEAN_SHEET: Record<string, number> = { GK: 4, DF: 4, MF: 1, FW: 0 }
const ASSIST = 3
const YELLOW = -1
const RED = -3
const OWN_GOAL = -2

export const SCORING_RULES: { label: string; value: string }[] = [
  { label: 'Goal', value: 'FW +4 · MF +5 · DF/GK +6' },
  { label: 'Assist', value: '+3' },
  { label: 'Clean sheet (team concedes 0)', value: 'GK/DF +4 · MF +1' },
  { label: 'Yellow card', value: '−1' },
  { label: 'Red card', value: '−3' },
  { label: 'Own goal', value: '−2' },
]

function normPos(p: string): 'GK' | 'DF' | 'MF' | 'FW' {
  const s = (p || '').toUpperCase()
  if (s.startsWith('G')) return 'GK'
  if (s.startsWith('D')) return 'DF'
  if (s.startsWith('M')) return 'MF'
  return 'FW'
}

/* ------------------------------ name matching ----------------------------- */
function norm(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
const surnameOf = (n: string) => n.split(' ').slice(-1)[0] ?? ''

/** Match an event's player (name + optional shirt number) to a pick. Scoped by
 *  the caller to the pick's own team, so surname collisions are unlikely. */
function matchPlayer(evName: string, evNumber: number | null, pick: FantasyPick): boolean {
  if (pick.number != null && evNumber != null && evNumber === pick.number) return true
  const a = norm(evName)
  const b = norm(pick.name)
  if (!a || !b) return false
  if (a === b) return true
  if (surnameOf(a) && surnameOf(a) === surnameOf(b)) {
    const aFirst = a.split(' ')[0]
    const bFirst = b.split(' ')[0]
    if (aFirst.length <= 1) return aFirst[0] === bFirst[0] // "T. Maseko" → initial check
    return true
  }
  return false
}
const matchAssist = (assist: string, pick: FantasyPick) => matchPlayer(assist, null, pick)

export interface PickScore {
  points: number
  matches: { fixtureId: number; points: number; lines: string[] }[]
  /** All goal scorers for the pick's team (so a 0-scoring pick is auditable). */
  teamGoalScorers: string[]
}

/**
 * Score one pick over its team's finished KO matches. Robust: scoped to the
 * team, number-then-surname matching, never throws (returns 0 on any error and
 * warns), and logs when a pick matched nothing while its team scored.
 */
export function scorePick(pick: FantasyPick, koDetails: MatchDetail[]): PickScore {
  const pos = normPos(pick.position)
  const out: PickScore = { points: 0, matches: [], teamGoalScorers: [] }
  try {
    for (const d of koDetails) {
      if (d.home !== pick.teamCode && d.away !== pick.teamCode) continue
      let mp = 0
      const lines: string[] = []
      const teamEvents = d.events.filter((e) => e.teamCode === pick.teamCode)
      for (const e of teamEvents) {
        const t = (e.type || '').toLowerCase()
        const isGoal = t === 'goal' || t === 'penalty' || t.includes('var goal confirmed')
        if (isGoal) out.teamGoalScorers.push(e.player)
        const mine = matchPlayer(e.player, e.playerNumber, pick)
        if (isGoal && mine) {
          const g = GOAL_POINTS[pos] ?? 4
          mp += g
          lines.push(`Goal +${g}`)
        } else if (t.includes('own goal') && mine) {
          mp += OWN_GOAL
          lines.push(`Own goal ${OWN_GOAL}`)
        } else if (t.includes('yellow') && mine) {
          mp += YELLOW
          lines.push(`Yellow ${YELLOW}`)
        } else if (t.includes('red') && mine) {
          mp += RED
          lines.push(`Red ${RED}`)
        }
        if (isGoal && e.assist && matchAssist(e.assist, pick)) {
          mp += ASSIST
          lines.push(`Assist +${ASSIST}`)
        }
      }
      const ts = d.teamStats[pick.teamCode]
      if (ts?.cleanSheet) {
        const cs = CLEAN_SHEET[pos] ?? 0
        if (cs > 0) {
          mp += cs
          lines.push(`Clean sheet +${cs}`)
        }
      }
      if (lines.length) out.matches.push({ fixtureId: d.fixtureId, points: mp, lines })
      out.points += mp
    }
    if (out.points === 0 && out.teamGoalScorers.length > 0) {
      // surface a possible silent mismatch (full rosters → name-match risk)
      // eslint-disable-next-line no-console
      console.warn(`[fantasy] ${pick.name} (${pick.teamCode}) scored 0; team goal events: ${out.teamGoalScorers.join(', ')}`)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[fantasy] scoring error for', pick.name, err)
    return { points: 0, matches: [], teamGoalScorers: [] }
  }
  return out
}
