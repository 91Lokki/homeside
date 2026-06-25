/** Core domain types. The seed data and the live API both normalize to these. */

export type TeamCode = string // FIFA 3-letter code, e.g. "ARG"
export type GroupId = string // "A" .. "L"

export interface Team {
  code: TeamCode
  name: string
  /** Chinese (Traditional) display name. */
  nameTC?: string
  group: GroupId
  /** Primary identity color (the one strong hue this team paints the app with). */
  color: string
  /** Secondary color, used sparingly inside the mascot. */
  color2: string
  /** A gentle national motif keyword that shapes the mascot (e.g. "maple", "crane"). */
  symbol: string
  /** Seeding pot 1–4 from the official draw (pot 1 = the seeded/strongest teams). */
  pot: number
  /** API-Football team id, when known — enables live squad lookups. */
  apiTeamId?: number
  /** Host nation flag (USA / Canada / Mexico). */
  host?: boolean
}

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export type Stage =
  | 'group'
  | 'R32'
  | 'R16'
  | 'QF'
  | 'SF'
  | 'F3' // third-place play-off
  | 'F' // final

export interface Match {
  id: string
  stage: Stage
  group?: GroupId
  /** Resolved team codes. Null for knockout slots not yet decided. */
  homeCode: TeamCode | null
  awayCode: TeamCode | null
  /** Human label for an unresolved knockout slot, e.g. "Winner Group A". */
  homeLabel?: string
  awayLabel?: string
  /** Kickoff in ISO-8601 UTC. */
  kickoff: string
  venue?: string
  city?: string
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  /** Live clock minute, when in progress. */
  minute?: number | null
  /** Penalty-shootout result, if any (home/away). */
  pens?: { home: number; away: number }
  apiFixtureId?: number
}

export interface Player {
  name: string
  position: string // "GK" | "DF" | "MF" | "FW" or full word
  number?: number | null
  club?: string
}

export interface Squad {
  star: Player
  /** Curated notable members that unlock as the bond grows. */
  notable: Player[]
}

/** A single row in a group table (computed from finished matches, or from API). */
export interface StandingRow {
  code: TeamCode
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  gd: number
  points: number
  /** Recent results, newest last, each 'W' | 'D' | 'L'. */
  form: Array<'W' | 'D' | 'L'>
  rank: number
}

/* ----------------------------- knockout bracket --------------------------- */

export type SlotSource =
  | { kind: 'winner'; group: GroupId }
  | { kind: 'runnerUp'; group: GroupId }
  | { kind: 'third'; groups: GroupId[] } // one of these groups' 3rd-placed teams
  | { kind: 'matchWinner'; matchNo: number }
  | { kind: 'matchLoser'; matchNo: number } // for the third-place play-off

export interface SlotRef {
  source: SlotSource
  /** Pre-rendered label, e.g. "Winner A", "3rd C/E/F/H", "Winner M73". */
  label: string
}

export interface BracketMatch {
  matchNo: number
  stage: Stage
  home: SlotRef
  away: SlotRef
  kickoff?: string
  venue?: string
  city?: string
}

/** A bracket match with its occupants resolved against real results. */
export interface ResolvedBracketMatch extends BracketMatch {
  homeCode: TeamCode | null
  awayCode: TeamCode | null
  homeScore: number | null
  awayScore: number | null
  pens?: { home: number; away: number }
  status: MatchStatus
  winnerCode: TeamCode | null
}
