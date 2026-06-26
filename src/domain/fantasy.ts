import type { MatchDetail } from '@/lib/api'
import type { Stage, TeamCode } from './types'

/**
 * 5-player knockout fantasy (solo). Scoring uses ONLY signals reliably present in
 * the live ESPN feed: goals (by position), assists, clean sheets, cards, own goals,
 * in-play penalties scored/missed, shootout kicks scored/missed, and GK saves (team
 * stat). No appearance/minutes points (the data can't reliably supply them).
 * Nothing is ever fabricated.
 */

/* ------------------------------ positions & slots ------------------------- */
export type PosCat = 'GK' | 'DEF' | 'MID' | 'ATT'
export type Slot = 'GK' | 'DEF' | 'MID' | 'ATT' | 'FLEX'
export const SLOTS: Slot[] = ['GK', 'DEF', 'MID', 'ATT', 'FLEX']
export const SLOT_LABEL: Record<Slot, string> = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward', FLEX: 'Flex' }
/** Short position label shown on chips/rows (forwards read as FWD, not ATT). */
export const POS_ABBR: Record<PosCat, string> = { GK: 'GK', DEF: 'DEF', MID: 'MID', ATT: 'FWD' }
/** Position categories each slot accepts (Flex = any outfielder). */
export const SLOT_ALLOWS: Record<Slot, PosCat[]> = { GK: ['GK'], DEF: ['DEF'], MID: ['MID'], ATT: ['ATT'], FLEX: ['DEF', 'MID', 'ATT'] }

/** Map a roster position (GK/DF/MF/FW) to the game's category. All forwards = ATT. */
export function posCat(p: string): PosCat {
  const u = (p || '').toUpperCase()
  if (u.startsWith('G')) return 'GK'
  if (u.startsWith('D')) return 'DEF'
  if (u.startsWith('M')) return 'MID'
  return 'ATT'
}

/* --------------------------------- rounds --------------------------------- */
export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL'
export const ROUNDS: Round[] = ['R32', 'R16', 'QF', 'SF', 'FINAL']
export const ROUND_LABEL: Record<Round, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  FINAL: 'Final stage',
}
/** Free transfers granted before each round (R32 = the unlimited initial build). */
export const FREE_TRANSFERS: Record<Round, number> = { R32: Infinity, R16: 2, QF: 2, SF: 2, FINAL: 5 }
/** Max players from one country, per round. */
export const COUNTRY_QUOTA: Record<Round, number> = { R32: 2, R16: 2, QF: 3, SF: 4, FINAL: 5 }
export const EXTRA_TRANSFER_COST = 3

/** Final stage = third-place play-off + final. */
export function stageToRound(stage: Stage): Round | null {
  if (stage === 'R32') return 'R32'
  if (stage === 'R16') return 'R16'
  if (stage === 'QF') return 'QF'
  if (stage === 'SF') return 'SF'
  if (stage === 'F3' || stage === 'F') return 'FINAL'
  return null
}

export interface FantasyPick {
  slot: Slot
  name: string
  teamCode: TeamCode
  position: PosCat
  number: number | null
}
export interface RoundSquad {
  /** up to 5 picks, one per slot */
  players: FantasyPick[]
  captain: string | null
  vice: string | null
}
/** Unique per player. Includes the shirt number because some squads list two
 *  different players under the same single name (e.g. Brazil's two "Danilo"s). */
export const playerKey = (p: { teamCode: string; name: string; number?: number | null }) =>
  `${p.teamCode}·${p.name}·${p.number ?? ''}`

/* ------------------------------ scoring table ----------------------------- */
const GOAL_POINTS: Record<PosCat, number> = { GK: 6, DEF: 6, MID: 5, ATT: 4 }
const CLEAN_SHEET: Record<PosCat, number> = { GK: 4, DEF: 4, MID: 1, ATT: 0 }
const ASSIST = 3
const YELLOW = -1
const RED = -3
const OWN_GOAL = -2
const PEN_MISS_INPLAY = -2
const SHOOTOUT_SCORED = 2
const SHOOTOUT_MISSED = -1

export const SCORING_RULES: { label: string; value: string }[] = [
  { label: 'Goal', value: 'ATT +4 · MID +5 · DEF/GK +6' },
  { label: 'Assist', value: '+3' },
  { label: 'Clean sheet (team concedes 0)', value: 'DEF/GK +4 · MID +1' },
  { label: 'GK saves', value: '+1 per 3' },
  { label: 'In-play penalty scored', value: 'goal points by position' },
  { label: 'In-play penalty missed', value: '−2' },
  { label: 'Shootout kick scored', value: '+2' },
  { label: 'Shootout kick missed', value: '−1' },
  { label: 'Yellow card', value: '−1' },
  { label: 'Red card', value: '−3' },
  { label: 'Own goal', value: '−2' },
]

/* ----------------------------- shootout detection ------------------------- */
/**
 * A penalty-shootout kick — only ever true when the match actually went to a
 * shootout (hadShootout). The original Highlightly feed timestamped shootout kicks
 * as "120+N"; the test fixture in scripts/test-fantasy.mjs covers that.
 *
 * PENDING (no knockout shootout has occurred yet on the live ESPN feed): confirm
 * ESPN's shootout-kick event shape and extend the match below, so shootout kicks
 * score +2/−1 separately and never touch clean sheets. Until then this stays
 * conservative (a normal-minute in-play penalty is never mistaken for a shootout).
 */
export function isShootoutKick(rawTime: string, hadShootout: boolean): boolean {
  return hadShootout && /^120\+\d+$/.test((rawTime || '').trim())
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

function matchPlayer(evName: string, evNumber: number | null, pick: FantasyPick): boolean {
  if (pick.number != null && evNumber != null) return evNumber === pick.number
  const a = norm(evName)
  const b = norm(pick.name)
  if (!a || !b) return false
  if (a === b) return true
  if (surnameOf(a) && surnameOf(a) === surnameOf(b)) {
    return (a.split(' ')[0]?.[0] ?? '') === (b.split(' ')[0]?.[0] ?? '')
  }
  return false
}
const matchAssist = (assist: string, pick: FantasyPick) => matchPlayer(assist, null, pick)

/* ------------------------------ player scoring ---------------------------- */
export interface PlayerRoundScore {
  points: number
  matches: { fixtureId: number; points: number; lines: string[] }[]
  teamGoalScorers: string[]
}

/** Score one pick over its team's finished matches in a round. Never throws. */
export function scorePick(pick: FantasyPick, details: MatchDetail[]): PlayerRoundScore {
  const out: PlayerRoundScore = { points: 0, matches: [], teamGoalScorers: [] }
  try {
    for (const d of details) {
      if (d.home !== pick.teamCode && d.away !== pick.teamCode) continue
      let mp = 0
      const lines: string[] = []
      const teamEvents = d.events.filter((e) => e.teamCode === pick.teamCode)
      for (const e of teamEvents) {
        const t = (e.type || '').toLowerCase()
        const shootout = isShootoutKick(e.rawTime, d.hadShootout)
        const mine = matchPlayer(e.player, e.playerNumber, pick)
        const isInPlayGoal = t === 'goal' || (t === 'penalty' && !shootout)

        if (isInPlayGoal) {
          out.teamGoalScorers.push(e.player)
          if (mine) {
            const g = GOAL_POINTS[pick.position]
            mp += g
            lines.push(`Goal +${g}`)
          }
          if (e.assist && matchAssist(e.assist, pick)) {
            mp += ASSIST
            lines.push(`Assist +${ASSIST}`)
          }
        } else if (t === 'penalty' && shootout && mine) {
          mp += SHOOTOUT_SCORED
          lines.push(`Shootout goal +${SHOOTOUT_SCORED}`)
        } else if (t === 'missed penalty' && mine) {
          if (shootout) {
            mp += SHOOTOUT_MISSED
            lines.push(`Shootout miss ${SHOOTOUT_MISSED}`)
          } else {
            mp += PEN_MISS_INPLAY
            lines.push(`Penalty miss ${PEN_MISS_INPLAY}`)
          }
        } else if (t === 'own goal' && mine) {
          mp += OWN_GOAL
          lines.push(`Own goal ${OWN_GOAL}`)
        } else if (t === 'yellow card' && mine) {
          mp += YELLOW
          lines.push(`Yellow ${YELLOW}`)
        } else if (t === 'red card' && mine) {
          mp += RED
          lines.push(`Red ${RED}`)
        }
      }
      const ts = d.teamStats[pick.teamCode]
      // clean sheet — team conceded 0 in regulation + ET (score excludes the shootout)
      if (ts?.cleanSheet) {
        const cs = CLEAN_SHEET[pick.position]
        if (cs > 0) {
          mp += cs
          lines.push(`Clean sheet +${cs}`)
        }
      }
      // GK saves — +1 per 3 (team keeper-saves stat)
      if (pick.position === 'GK' && ts?.gkSaves != null) {
        const sp = Math.floor(ts.gkSaves / 3)
        if (sp > 0) {
          mp += sp
          lines.push(`Saves +${sp} (${ts.gkSaves})`)
        }
      }
      if (lines.length) out.matches.push({ fixtureId: d.fixtureId, points: mp, lines })
      out.points += mp
    }
    if (out.points === 0 && out.teamGoalScorers.length > 0) {
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

/* --------------------------- transfers & quotas --------------------------- */
/** Number of incoming players relative to the previous round's locked squad. */
export function countTransfers(current: FantasyPick[], previous: FantasyPick[]): number {
  const prev = new Set(previous.map(playerKey))
  return current.filter((p) => !prev.has(playerKey(p))).length
}

export function countryCounts(players: FantasyPick[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const p of players) m[p.teamCode] = (m[p.teamCode] ?? 0) + 1
  return m
}

/* ------------------------------ round scoring ----------------------------- */
export interface RoundScore {
  round: Round
  perPlayer: Record<string, { base: number; isCaptain: boolean; final: number; detail: PlayerRoundScore }>
  effectiveCaptain: string | null
  transfersUsed: number
  freeTransfers: number
  paidTransfers: number
  transferPenalty: number
  points: number
}

/**
 * Score a round. `detailsFor(teamCode)` returns the team's finished match details
 * in this round. Captain doubles; if the captain's team didn't feature this round
 * (eliminated), the vice's points are doubled instead (auto-vice).
 */
export function scoreRound(
  round: Round,
  squad: RoundSquad,
  prevPlayers: FantasyPick[],
  detailsFor: (teamCode: TeamCode) => MatchDetail[],
): RoundScore {
  const teamPlayed = (code: TeamCode) => detailsFor(code).length > 0

  // effective captain: captain unless their team didn't feature → vice
  const capPick = squad.players.find((p) => playerKey(p) === squad.captain)
  const vicePick = squad.players.find((p) => playerKey(p) === squad.vice)
  let effectiveCaptain: string | null = null
  if (capPick && teamPlayed(capPick.teamCode)) effectiveCaptain = squad.captain
  else if (vicePick && teamPlayed(vicePick.teamCode)) effectiveCaptain = squad.vice
  else effectiveCaptain = squad.captain // nobody featured yet; keep nominal captain

  const perPlayer: RoundScore['perPlayer'] = {}
  let live = 0
  for (const p of squad.players) {
    const detail = scorePick(p, detailsFor(p.teamCode))
    const isCaptain = playerKey(p) === effectiveCaptain
    const final = detail.points * (isCaptain ? 2 : 1)
    perPlayer[playerKey(p)] = { base: detail.points, isCaptain, final, detail }
    live += final
  }

  const transfersUsed = countTransfers(squad.players, prevPlayers)
  const free = FREE_TRANSFERS[round]
  const paidTransfers = Number.isFinite(free) ? Math.max(0, transfersUsed - free) : 0
  const transferPenalty = paidTransfers * EXTRA_TRANSFER_COST

  return {
    round,
    perPlayer,
    effectiveCaptain,
    transfersUsed,
    freeTransfers: free,
    paidTransfers,
    transferPenalty,
    points: live - transferPenalty,
  }
}
