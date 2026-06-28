import { describe, it, expect } from 'vitest'
import {
  scorePredictions,
  ROUND_POINTS,
  type Predictions,
} from '@/domain/predict'
import {
  scoreRound,
  scoreFantasyTotal,
  stageToRound,
  countryCounts,
  COUNTRY_QUOTA,
  ROUNDS,
  playerKey,
  type RoundSquad,
  type FantasyPick,
  type ScorableMatch,
  type Round,
} from '@/domain/fantasy'
import type { ResolvedBracketMatch, Stage, TeamCode } from '@/domain/types'
import type { MatchDetail, MatchEvent, TeamMatchStats } from '@/lib/api'

/**
 * FULL-TOURNAMENT integration test.
 *
 * Simulates an entire 32-team knockout World Cup (R32 → R16 → QF → SF → 3rd-place
 * play-off + Final = 32 matches), with 5 "accounts" playing BOTH games (predict +
 * fantasy), and drives the REAL scorers (scorePredictions / scoreRound /
 * scoreFantasyTotal) round-by-round exactly as the live leaderboard does.
 *
 * Every expected number is independently re-derived (predict) or hand-computed with
 * the arithmetic shown in comments (fantasy). No source files are modified.
 */

/* ========================================================================== *
 * 1. THE BRACKET — 32 real team codes, a deterministic winner for all 32 ties
 * ========================================================================== */

// Distinct matchNo ranges per stage so nothing collides.
//   R32: 1..16   R16: 17..24   QF: 25..28   SF: 29..30   F3: 31   F: 32
// (matchNo 32 used for the Final; F3 is 31 — both in the FINAL fantasy round.)

interface TieResult {
  matchNo: number
  stage: Stage
  homeCode: TeamCode
  awayCode: TeamCode
  homeScore: number
  awayScore: number
  winnerCode: TeamCode
  /** penalty shootout, if any (regulation/ET ended level) */
  pens?: { home: number; away: number }
}

// --- Round of 32: 16 ties, winners flow into R16 ---------------------------
// Left half (top): ARG, BRA, FRA, ESP, GER, NED, POR-stand-in(BEL), ENG-stand-in(URU)
// We use real codes present in the seed.
const R32: TieResult[] = [
  // matchNo, stage, home, away, hs, as, winner
  { matchNo: 1, stage: 'R32', homeCode: 'ARG', awayCode: 'KSA', homeScore: 2, awayScore: 0, winnerCode: 'ARG' }, // clean sheet ARG
  { matchNo: 2, stage: 'R32', homeCode: 'USA', awayCode: 'JPN', homeScore: 1, awayScore: 0, winnerCode: 'USA' },
  { matchNo: 3, stage: 'R32', homeCode: 'FRA', awayCode: 'CAN', homeScore: 3, awayScore: 1, winnerCode: 'FRA' },
  { matchNo: 4, stage: 'R32', homeCode: 'MEX', awayCode: 'NOR', homeScore: 1, awayScore: 2, winnerCode: 'NOR' },
  { matchNo: 5, stage: 'R32', homeCode: 'BRA', awayCode: 'KOR', homeScore: 4, awayScore: 1, winnerCode: 'BRA' },
  { matchNo: 6, stage: 'R32', homeCode: 'NED', awayCode: 'ECU', homeScore: 2, awayScore: 1, winnerCode: 'NED' },
  { matchNo: 7, stage: 'R32', homeCode: 'ESP', awayCode: 'MAR', homeScore: 2, awayScore: 0, winnerCode: 'ESP' },
  { matchNo: 8, stage: 'R32', homeCode: 'BEL', awayCode: 'EGY', homeScore: 1, awayScore: 0, winnerCode: 'BEL' },
  { matchNo: 9, stage: 'R32', homeCode: 'GER', awayCode: 'SUI', homeScore: 3, awayScore: 2, winnerCode: 'GER' },
  { matchNo: 10, stage: 'R32', homeCode: 'URU', awayCode: 'AUS', homeScore: 2, awayScore: 0, winnerCode: 'URU' },
  { matchNo: 11, stage: 'R32', homeCode: 'SEN', awayCode: 'IRN', homeScore: 1, awayScore: 0, winnerCode: 'SEN' },
  { matchNo: 12, stage: 'R32', homeCode: 'TUR', awayCode: 'SWE', homeScore: 2, awayScore: 1, winnerCode: 'TUR' },
  { matchNo: 13, stage: 'R32', homeCode: 'CIV', awayCode: 'TUN', homeScore: 1, awayScore: 0, winnerCode: 'CIV' },
  { matchNo: 14, stage: 'R32', homeCode: 'PAR', awayCode: 'AUT', homeScore: 0, awayScore: 1, winnerCode: 'AUT' },
  { matchNo: 15, stage: 'R32', homeCode: 'SCO', awayCode: 'QAT', homeScore: 2, awayScore: 0, winnerCode: 'SCO' },
  { matchNo: 16, stage: 'R32', homeCode: 'NZL', awayCode: 'IRQ', homeScore: 1, awayScore: 0, winnerCode: 'NZL' },
]

// --- Round of 16: winners of (1v2),(3v4),...; matchNo 17..24 ---------------
const R16: TieResult[] = [
  { matchNo: 17, stage: 'R16', homeCode: 'ARG', awayCode: 'USA', homeScore: 2, awayScore: 1, winnerCode: 'ARG' },
  { matchNo: 18, stage: 'R16', homeCode: 'FRA', awayCode: 'NOR', homeScore: 3, awayScore: 0, winnerCode: 'FRA' }, // clean sheet FRA
  { matchNo: 19, stage: 'R16', homeCode: 'BRA', awayCode: 'NED', homeScore: 2, awayScore: 1, winnerCode: 'BRA' },
  { matchNo: 20, stage: 'R16', homeCode: 'ESP', awayCode: 'BEL', homeScore: 1, awayScore: 0, winnerCode: 'ESP' },
  // SHOOTOUT: GER v URU level 1-1, Germany win 4-3 on penalties.
  { matchNo: 21, stage: 'R16', homeCode: 'GER', awayCode: 'URU', homeScore: 1, awayScore: 1, winnerCode: 'GER', pens: { home: 4, away: 3 } },
  { matchNo: 22, stage: 'R16', homeCode: 'SEN', awayCode: 'TUR', homeScore: 2, awayScore: 0, winnerCode: 'SEN' },
  { matchNo: 23, stage: 'R16', homeCode: 'CIV', awayCode: 'AUT', homeScore: 1, awayScore: 0, winnerCode: 'CIV' },
  { matchNo: 24, stage: 'R16', homeCode: 'SCO', awayCode: 'NZL', homeScore: 3, awayScore: 1, winnerCode: 'SCO' },
]

// --- Quarter-finals: matchNo 25..28 ----------------------------------------
const QF: TieResult[] = [
  { matchNo: 25, stage: 'QF', homeCode: 'ARG', awayCode: 'FRA', homeScore: 2, awayScore: 1, winnerCode: 'ARG' },
  { matchNo: 26, stage: 'QF', homeCode: 'BRA', awayCode: 'ESP', homeScore: 1, awayScore: 0, winnerCode: 'BRA' },
  { matchNo: 27, stage: 'QF', homeCode: 'GER', awayCode: 'SEN', homeScore: 2, awayScore: 0, winnerCode: 'GER' },
  { matchNo: 28, stage: 'QF', homeCode: 'CIV', awayCode: 'SCO', homeScore: 1, awayScore: 2, winnerCode: 'SCO' },
]

// --- Semi-finals: matchNo 29..30 -------------------------------------------
const SF: TieResult[] = [
  { matchNo: 29, stage: 'SF', homeCode: 'ARG', awayCode: 'BRA', homeScore: 3, awayScore: 2, winnerCode: 'ARG' },
  { matchNo: 30, stage: 'SF', homeCode: 'GER', awayCode: 'SCO', homeScore: 2, awayScore: 1, winnerCode: 'GER' },
]

// --- Third-place play-off (F3 = matchNo 31) and Final (F = matchNo 32) ------
// Losers of the SFs: BRA & SCO. Finalists: ARG & GER. Champion = ARG.
const FINAL_STAGE: TieResult[] = [
  { matchNo: 31, stage: 'F3', homeCode: 'BRA', awayCode: 'SCO', homeScore: 3, awayScore: 1, winnerCode: 'BRA' },
  { matchNo: 32, stage: 'F', homeCode: 'ARG', awayCode: 'GER', homeScore: 2, awayScore: 1, winnerCode: 'ARG' },
]

const ALL_TIES: TieResult[] = [...R32, ...R16, ...QF, ...SF, ...FINAL_STAGE]
const CHAMPION: TeamCode = 'ARG'

/** Convert a TieResult into a finished ResolvedBracketMatch the predict scorer eats. */
function toResolved(t: TieResult): ResolvedBracketMatch {
  return {
    matchNo: t.matchNo,
    stage: t.stage,
    home: { source: { kind: 'matchWinner', matchNo: t.matchNo }, label: '' },
    away: { source: { kind: 'matchWinner', matchNo: t.matchNo }, label: '' },
    homeCode: t.homeCode,
    awayCode: t.awayCode,
    homeScore: t.homeScore,
    awayScore: t.awayScore,
    pens: t.pens,
    status: 'finished',
    winnerCode: t.winnerCode,
  }
}

const RESOLVED_ALL: ResolvedBracketMatch[] = ALL_TIES.map(toResolved)

// Sanity: 32 knockout matches, exactly one shootout, ≥1 clean sheet.
const SHOOTOUTS = ALL_TIES.filter((t) => t.pens)
const CLEAN_SHEETS = ALL_TIES.filter((t) => t.homeScore === 0 || t.awayScore === 0)

/* ========================================================================== *
 * 2. FANTASY FIXTURES — ScorableMatch[] + MatchDetail per fixture
 * ========================================================================== */

// Give each tie a stable apiFixtureId = matchNo + 1000 (distinct from matchNo).
const fixtureId = (matchNo: number) => matchNo + 1000

const KO_MATCHES: ScorableMatch[] = ALL_TIES.map((t) => ({
  stage: t.stage,
  apiFixtureId: fixtureId(t.matchNo),
  homeCode: t.homeCode,
  awayCode: t.awayCode,
}))

/* ---- event / stat builders ------------------------------------------------ */
function ev(partial: Partial<MatchEvent> & { teamCode: TeamCode; type: string; player: string }): MatchEvent {
  return {
    minute: partial.minute ?? 50,
    rawTime: partial.rawTime ?? `${partial.minute ?? 50}'`,
    teamCode: partial.teamCode,
    type: partial.type,
    player: partial.player,
    playerNumber: partial.playerNumber ?? null,
    assist: partial.assist ?? null,
  }
}

function stats(code: TeamCode, gf: number, ga: number, extra: Partial<TeamMatchStats> = {}): TeamMatchStats {
  return {
    code,
    goalsFor: gf,
    goalsAgainst: ga,
    cleanSheet: ga === 0,
    possession: null,
    shots: null,
    shotsOnTarget: null,
    passPct: null,
    crosses: null,
    corners: null,
    tackles: null,
    interceptions: null,
    clearances: null,
    fouls: null,
    yellow: null,
    red: null,
    gkSaves: null,
    ...extra,
  }
}

/**
 * Build a MatchDetail for a tie. By default events are empty and stats are derived
 * from the scoreline (clean sheet auto). We then layer specific named events/stats
 * onto the few fixtures we hand-compute against.
 */
function detailFor(
  t: TieResult,
  opts: {
    events?: MatchEvent[]
    homeStats?: Partial<TeamMatchStats>
    awayStats?: Partial<TeamMatchStats>
    hadShootout?: boolean
  } = {},
): MatchDetail {
  return {
    fixtureId: fixtureId(t.matchNo),
    home: t.homeCode,
    away: t.awayCode,
    hadShootout: opts.hadShootout ?? !!t.pens,
    events: opts.events ?? [],
    teamStats: {
      [t.homeCode]: stats(t.homeCode, t.homeScore, t.awayScore, opts.homeStats),
      [t.awayCode]: stats(t.awayCode, t.awayScore, t.homeScore, opts.awayStats),
    },
  }
}

/* ---- named players we score against -------------------------------------- *
 * We pin shirt numbers so matchPlayer keys off the number (exact, robust).     */

// ARG attackers/keeper (champions — feature in every left-half round)
const ARG_FWD = { name: 'L. Messi', teamCode: 'ARG', number: 10 }
const ARG_GK = { name: 'E. Martinez', teamCode: 'ARG', number: 23 }
const ARG_MID = { name: 'R. De Paul', teamCode: 'ARG', number: 7 }
const ARG_DEF = { name: 'N. Otamendi', teamCode: 'ARG', number: 19 }

// FRA, BRA, GER, ESP key players
const FRA_FWD = { name: 'K. Mbappe', teamCode: 'FRA', number: 10 }
const BRA_FWD = { name: 'Vinicius', teamCode: 'BRA', number: 7 }
const BRA_GK = { name: 'Alisson', teamCode: 'BRA', number: 1 }
const GER_FWD = { name: 'K. Havertz', teamCode: 'GER', number: 7 }
const GER_GK = { name: 'M. Neuer', teamCode: 'GER', number: 1 }
const ESP_MID = { name: 'Pedri', teamCode: 'ESP', number: 8 }
const URU_FWD = { name: 'D. Nunez', teamCode: 'URU', number: 9 }

/* ----- Construct the details map, fixture by fixture ----------------------- */
const DETAILS: Record<number, MatchDetail> = {}

// Helper to register a detail.
const put = (d: MatchDetail) => {
  DETAILS[d.fixtureId] = d
}

// === R32 ===
// Match 1 ARG 2-0 KSA — Messi 1 goal + 1 assist; Otamendi 1 goal; ARG clean sheet; GK 4 saves.
put(
  detailFor(R32[0], {
    events: [
      ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, assist: 'N. Otamendi', minute: 23 }),
      ev({ teamCode: 'ARG', type: 'Goal', player: 'N. Otamendi', playerNumber: 19, assist: 'L. Messi', minute: 67 }),
    ],
    homeStats: { gkSaves: 4 }, // GK saves stat lives on the team
  }),
)
// Remaining R32 ties: minimal details (scoreline-derived clean sheets only).
for (let i = 1; i < R32.length; i++) put(detailFor(R32[i]))
// Match 3 FRA 3-1 CAN — Mbappe scores once (used in a hand computation).
put(
  detailFor(R32[2], {
    events: [ev({ teamCode: 'FRA', type: 'Goal', player: 'K. Mbappe', playerNumber: 10, minute: 12 })],
  }),
)
// Match 5 BRA 4-1 KOR — Vinicius 1 goal + 1 yellow card.
put(
  detailFor(R32[4], {
    events: [
      ev({ teamCode: 'BRA', type: 'Goal', player: 'Vinicius', playerNumber: 7, minute: 30 }),
      ev({ teamCode: 'BRA', type: 'Yellow Card', player: 'Vinicius', playerNumber: 7, minute: 80 }),
    ],
  }),
)

// === R16 ===
// Match 17 ARG 2-1 USA — Messi 1 goal (NOT clean sheet, conceded 1).
put(
  detailFor(R16[0], {
    events: [ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, minute: 40 })],
  }),
)
// Match 18 FRA 3-0 NOR — Mbappe 2 goals + 1 assist; FRA clean sheet.
put(
  detailFor(R16[1], {
    events: [
      ev({ teamCode: 'FRA', type: 'Goal', player: 'K. Mbappe', playerNumber: 10, minute: 10, assist: 'A. Griezmann' }),
      ev({ teamCode: 'FRA', type: 'Goal', player: 'K. Mbappe', playerNumber: 10, minute: 55 }),
      ev({ teamCode: 'FRA', type: 'Goal', player: 'O. Dembele', playerNumber: 11, minute: 70, assist: 'K. Mbappe' }),
    ],
  }),
)
// Match 19 BRA 2-1 NED — Vinicius 1 goal.
put(
  detailFor(R16[2], {
    events: [ev({ teamCode: 'BRA', type: 'Goal', player: 'Vinicius', playerNumber: 7, minute: 22 })],
  }),
)
// Match 20 ESP 1-0 BEL — Pedri 1 goal; ESP clean sheet.
put(
  detailFor(R16[3], {
    events: [ev({ teamCode: 'ESP', type: 'Goal', player: 'Pedri', playerNumber: 8, minute: 60 })],
  }),
)
// Match 21 GER 1-1 URU (a.e.t.) → SHOOTOUT GER win 4-3.
// In-play: Havertz goal (GER), Nunez goal (URU). NEITHER side keeps a clean sheet (1-1).
// Shootout kicks timestamped "120+N": Havertz scores (+2), Nunez MISSES (-1).
put(
  detailFor(R16[4], {
    hadShootout: true,
    events: [
      ev({ teamCode: 'GER', type: 'Goal', player: 'K. Havertz', playerNumber: 7, minute: 35 }),
      ev({ teamCode: 'URU', type: 'Goal', player: 'D. Nunez', playerNumber: 9, minute: 78 }),
      // shootout kicks
      ev({ teamCode: 'GER', type: 'Penalty', player: 'K. Havertz', playerNumber: 7, rawTime: '120+1', minute: 120 }),
      ev({ teamCode: 'URU', type: 'Missed Penalty', player: 'D. Nunez', playerNumber: 9, rawTime: '120+2', minute: 120 }),
    ],
  }),
)
for (let i = 5; i < R16.length; i++) put(detailFor(R16[i]))

// === QF ===
// Match 25 ARG 2-1 FRA — Messi 1 goal + 1 assist.
put(
  detailFor(QF[0], {
    events: [
      ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, minute: 15, assist: 'R. De Paul' }),
      ev({ teamCode: 'ARG', type: 'Goal', player: 'J. Alvarez', playerNumber: 9, minute: 75, assist: 'L. Messi' }),
    ],
  }),
)
// Match 26 BRA 1-0 ESP — Vinicius 1 goal; BRA clean sheet; Alisson 6 saves.
put(
  detailFor(QF[1], {
    events: [ev({ teamCode: 'BRA', type: 'Goal', player: 'Vinicius', playerNumber: 7, minute: 50 })],
    homeStats: { gkSaves: 6 },
  }),
)
// Match 27 GER 2-0 SEN — Havertz 1 goal; GER clean sheet; Neuer 3 saves.
put(
  detailFor(QF[2], {
    events: [ev({ teamCode: 'GER', type: 'Goal', player: 'K. Havertz', playerNumber: 7, minute: 41 })],
    homeStats: { gkSaves: 3 },
  }),
)
put(detailFor(QF[3]))

// === SF ===
// Match 29 ARG 3-2 BRA — Messi 2 goals.
put(
  detailFor(SF[0], {
    events: [
      ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, minute: 20 }),
      ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, minute: 88 }),
    ],
  }),
)
// Match 30 GER 2-1 SCO — Havertz 1 goal.
put(
  detailFor(SF[1], {
    events: [ev({ teamCode: 'GER', type: 'Goal', player: 'K. Havertz', playerNumber: 7, minute: 33 })],
  }),
)

// === FINAL stage (F3 + F) ===
// Match 31 (F3) BRA 3-1 SCO — Vinicius 1 goal.
put(
  detailFor(FINAL_STAGE[0], {
    events: [ev({ teamCode: 'BRA', type: 'Goal', player: 'Vinicius', playerNumber: 7, minute: 19 })],
  }),
)
// Match 32 (F) ARG 2-1 GER — Messi 1 goal + 1 assist; Havertz 1 goal (GER).
put(
  detailFor(FINAL_STAGE[1], {
    events: [
      ev({ teamCode: 'ARG', type: 'Goal', player: 'L. Messi', playerNumber: 10, minute: 25, assist: 'R. De Paul' }),
      ev({ teamCode: 'ARG', type: 'Goal', player: 'A. Di Maria', playerNumber: 11, minute: 60, assist: 'L. Messi' }),
      ev({ teamCode: 'GER', type: 'Goal', player: 'K. Havertz', playerNumber: 7, minute: 80 }),
    ],
  }),
)

/* ========================================================================== *
 * 3. ACCOUNTS — predictions + fantasy squads per round
 * ========================================================================== */

interface Account {
  name: string
  predictions: Predictions
  fantasy: Partial<Record<Round, RoundSquad>>
}

const pick = (
  slot: FantasyPick['slot'],
  src: { name: string; teamCode: TeamCode; number: number | null },
  position: FantasyPick['position'],
): FantasyPick => ({ slot, name: src.name, teamCode: src.teamCode, position, number: src.number })

const cap = (p: { teamCode: TeamCode; name: string; number?: number | null }) => playerKey(p)

// Extra named players to fill squads (kept distinct teams to respect quota).
const USA_GK = { name: 'M. Turner', teamCode: 'USA', number: 1 }
const SEN_DEF = { name: 'K. Koulibaly', teamCode: 'SEN', number: 3 }
const SCO_MID = { name: 'S. McTominay', teamCode: 'SCO', number: 4 }
const CIV_FWD = { name: 'S. Haller', teamCode: 'CIV', number: 22 }
const NED_DEF = { name: 'V. van Dijk', teamCode: 'NED', number: 4 }
const ESP_DEF = { name: 'P. Cubarsi', teamCode: 'ESP', number: 5 }

/* ----------------------------------------------------------------------------
 * ACCOUNT A — "Ace": sharpest. Predicts champion ARG correctly all the way.
 *   Fantasy: ARG-heavy spine, captain Messi every round (best haul).
 * -------------------------------------------------------------------------- */
const A_predictions: Predictions = {}
// All knockout picks correct (the perfect bracket).
for (const t of ALL_TIES) A_predictions[t.matchNo] = t.winnerCode

// Squads — note COUNTRY_QUOTA: R32/R16=2, QF=3, SF=4, FINAL=5.
const A_R32: RoundSquad = {
  // ARG×2 (GK + FWD), then 3 other countries.
  players: [
    pick('GK', ARG_GK, 'GK'),
    pick('DEF', SEN_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', FRA_FWD, 'ATT'),
  ],
  captain: cap(ARG_FWD), // Messi
}
const A_R16: RoundSquad = {
  // Keep all 5 → 0 transfers. ARG×2 still fine (quota 2).
  players: [...A_R32.players],
  captain: cap(ARG_FWD),
}
const A_QF: RoundSquad = {
  // QF quota = 3. Swap SEN_DEF (eliminated) → ARG_DEF, ESP_MID → BRA_FWD. 2 transfers (free=2).
  // Now ARG×3 (GK, DEF, FWD) — allowed at QF quota 3.
  players: [
    pick('GK', ARG_GK, 'GK'),
    pick('DEF', ARG_DEF, 'DEF'),
    pick('MID', GER_FWD, 'MID'), // Havertz as a "MID" slot pick (FLEX rules don't apply to MID, but position drives goal points; this is a MID-position pick by our assignment)
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(ARG_FWD),
}
const A_SF: RoundSquad = {
  // SF quota = 4. Drop BRA_FWD & GER_FWD's "mid"? Keep it simple: 1 transfer (BRA_FWD → GER_GK).
  // From A_QF players, replace FLEX BRA_FWD with GER_GK (DEF? no, GK already filled). Replace MID instead.
  // Keep ARG×3, add GER×1. 1 transfer (Havertz-MID → De Paul MID). free=2 → 0 penalty.
  players: [
    pick('GK', ARG_GK, 'GK'),
    pick('DEF', ARG_DEF, 'DEF'),
    pick('MID', ARG_MID, 'MID'), // De Paul (in) — transfer #1
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(ARG_FWD),
}
const A_FINAL: RoundSquad = {
  // FINAL quota = 5, free = 5. Go ALL ARG (5 ARG) for the Final.
  // From A_SF: BRA_FWD → ARG... we already have ARG GK/DEF/MID/FWD; add one more ARG (Di Maria as FLEX ATT).
  // Transfers: BRA_FWD(out) → Di Maria(in) = 1 transfer. free=5 → 0 penalty.
  players: [
    pick('GK', ARG_GK, 'GK'),
    pick('DEF', ARG_DEF, 'DEF'),
    pick('MID', ARG_MID, 'MID'),
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', { name: 'A. Di Maria', teamCode: 'ARG', number: 11 }, 'ATT'),
  ],
  captain: cap(ARG_FWD),
}
const accountA: Account = {
  name: 'Ace',
  predictions: A_predictions,
  fantasy: { R32: A_R32, R16: A_R16, QF: A_QF, SF: A_SF, FINAL: A_FINAL },
}

/* ----------------------------------------------------------------------------
 * ACCOUNT B — "Bold": picks GER as champion (wrong final), strong otherwise.
 *   Fantasy: GER spine, captain Havertz. Used as the SECOND hand-computed account.
 * -------------------------------------------------------------------------- */
const B_predictions: Predictions = {}
for (const t of ALL_TIES) B_predictions[t.matchNo] = t.winnerCode
// Override: B thinks GER wins the Final and the GER side of the bracket.
B_predictions[32] = 'GER' // WRONG (ARG won) → loses the Final's 8.
B_predictions[29] = 'BRA' // SF1 wrong (ARG won) → loses 5.

const B_R32: RoundSquad = {
  players: [
    pick('GK', GER_GK, 'GK'),
    pick('DEF', NED_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', GER_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(GER_FWD), // Havertz
}
const B_R16: RoundSquad = {
  players: [...B_R32.players],
  captain: cap(GER_FWD),
}
const B_QF: RoundSquad = {
  // QF quota 3. Keep GER×2, swap NED_DEF (out) & ESP_MID (out) for ARG_FWD & ARG_DEF. 2 transfers free.
  players: [
    pick('GK', GER_GK, 'GK'),
    pick('DEF', ARG_DEF, 'DEF'),
    pick('MID', ARG_MID, 'MID'),
    pick('ATT', GER_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(GER_FWD),
}
const B_SF: RoundSquad = {
  players: [...B_QF.players],
  captain: cap(GER_FWD),
}
const B_FINAL: RoundSquad = {
  // FINAL quota 5. Keep all → captain Havertz scores in the Final.
  players: [...B_SF.players],
  captain: cap(GER_FWD),
}
const accountB: Account = {
  name: 'Bold',
  predictions: B_predictions,
  fantasy: { R32: B_R32, R16: B_R16, QF: B_QF, SF: B_SF, FINAL: B_FINAL },
}

/* ----------------------------------------------------------------------------
 * ACCOUNT C — "Churner": decent picks but BURNS transfers (paid-transfer penalty).
 *   Several wrong early picks + a full squad rebuild at R16 (5 transfers, free 2).
 * -------------------------------------------------------------------------- */
const C_predictions: Predictions = {}
for (const t of ALL_TIES) C_predictions[t.matchNo] = t.winnerCode
// A few wrong R32 picks.
C_predictions[1] = 'KSA' // wrong
C_predictions[5] = 'KOR' // wrong
C_predictions[32] = 'GER' // wrong final

const C_R32: RoundSquad = {
  players: [
    pick('GK', USA_GK, 'GK'),
    pick('DEF', SEN_DEF, 'DEF'),
    pick('MID', SCO_MID, 'MID'),
    pick('ATT', CIV_FWD, 'ATT'),
    pick('FLEX', FRA_FWD, 'ATT'),
  ],
  captain: cap(FRA_FWD), // Mbappe
}
const C_R16: RoundSquad = {
  // FULL REBUILD → 5 brand-new players. free=2 → 3 paid → penalty 9.
  // Quota R16 = 2: ESP×2 allowed (Pedri + Cubarsi).
  players: [
    pick('GK', BRA_GK, 'GK'),
    pick('DEF', ESP_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', GER_FWD, 'ATT'),
  ],
  captain: cap(ARG_FWD),
}
const C_QF: RoundSquad = {
  players: [...C_R16.players],
  captain: cap(ARG_FWD),
}
const C_SF: RoundSquad = {
  players: [...C_QF.players],
  captain: cap(ARG_FWD),
}
const C_FINAL: RoundSquad = {
  players: [...C_SF.players],
  captain: cap(ARG_FWD),
}
const accountC: Account = {
  name: 'Churner',
  predictions: C_predictions,
  fantasy: { R32: C_R32, R16: C_R16, QF: C_QF, SF: C_SF, FINAL: C_FINAL },
}

/* ----------------------------------------------------------------------------
 * ACCOUNT D — "Dud": many wrong picks, captain whose team gets eliminated early.
 *   Captain URU's Nunez — eliminated in R16 (and misses the shootout) → captain 0.
 * -------------------------------------------------------------------------- */
const D_predictions: Predictions = {}
for (const t of ALL_TIES) D_predictions[t.matchNo] = t.homeCode // naive "home always wins"
// home-always-wins is wrong wherever the away team won: m4(NOR), m14(AUT), m28(SCO), m31? home BRA won, m32 home ARG won.

const D_R32: RoundSquad = {
  players: [
    pick('GK', BRA_GK, 'GK'),
    pick('DEF', NED_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', URU_FWD, 'ATT'), // Nunez
    pick('FLEX', CIV_FWD, 'ATT'),
  ],
  captain: cap(URU_FWD), // captain on a team that exits in R16
}
const D_R16: RoundSquad = {
  // Keep squad (0 transfers). Captain Nunez (URU) — URU loses the SHOOTOUT;
  // his only R16 event is a SHOOTOUT MISS (-1), so base = -1, captain ×2 = -2.
  players: [...D_R32.players],
  captain: cap(URU_FWD),
}
const D_QF: RoundSquad = {
  // URU eliminated; swap Nunez→ARG_FWD, CIV_FWD→BRA_FWD. 2 transfers (free 2).
  players: [
    pick('GK', BRA_GK, 'GK'),
    pick('DEF', NED_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', ARG_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(ARG_FWD),
}
const D_SF: RoundSquad = {
  players: [...D_QF.players],
  captain: cap(ARG_FWD),
}
const D_FINAL: RoundSquad = {
  players: [...D_SF.players],
  captain: cap(ARG_FWD),
}
const accountD: Account = {
  name: 'Dud',
  predictions: D_predictions,
  fantasy: { R32: D_R32, R16: D_R16, QF: D_QF, SF: D_SF, FINAL: D_FINAL },
}

/* ----------------------------------------------------------------------------
 * ACCOUNT E — "Even": middling picks; only plays the early rounds of fantasy.
 *   (Documents that scoreFantasyTotal handles a partial-rounds record.)
 * -------------------------------------------------------------------------- */
const E_predictions: Predictions = {}
for (const t of [...R32, ...R16]) E_predictions[t.matchNo] = t.winnerCode // correct early only
// leaves QF/SF/F unpicked → those grade as 'unpicked'.

const E_R32: RoundSquad = {
  players: [
    pick('GK', ARG_GK, 'GK'),
    pick('DEF', SEN_DEF, 'DEF'),
    pick('MID', ESP_MID, 'MID'),
    pick('ATT', FRA_FWD, 'ATT'),
    pick('FLEX', BRA_FWD, 'ATT'),
  ],
  captain: cap(FRA_FWD),
}
const E_R16: RoundSquad = {
  players: [...E_R32.players],
  captain: cap(FRA_FWD),
}
const accountE: Account = {
  name: 'Even',
  predictions: E_predictions,
  fantasy: { R32: E_R32, R16: E_R16 }, // no later rounds
}

const ACCOUNTS: Account[] = [accountA, accountB, accountC, accountD, accountE]

/* ========================================================================== *
 * 4. INDEPENDENT RE-DERIVATIONS (no source imports beyond the constants)
 * ========================================================================== */

/** Sum ROUND_POINTS[stage] over ties this account predicted correctly, among a set. */
function expectedPredict(acc: Account, ties: TieResult[]): number {
  let pts = 0
  for (const t of ties) {
    if (acc.predictions[t.matchNo] === t.winnerCode) pts += ROUND_POINTS[t.stage]
  }
  return pts
}

/** Build the resolved[] for only ties finished through (and including) a stage. */
function resolvedThrough(stages: Stage[]): ResolvedBracketMatch[] {
  return ALL_TIES.filter((t) => stages.includes(t.stage)).map(toResolved)
}

const STAGE_ORDER: Stage[][] = [
  ['R32'],
  ['R32', 'R16'],
  ['R32', 'R16', 'QF'],
  ['R32', 'R16', 'QF', 'SF'],
  ['R32', 'R16', 'QF', 'SF', 'F3', 'F'],
]

/* detailsFor a single round, as scoreRound expects. */
const detailsForRound = (round: Round) => (teamCode: TeamCode): MatchDetail[] =>
  KO_MATCHES.filter(
    (m) => stageToRound(m.stage) === round && (m.homeCode === teamCode || m.awayCode === teamCode) && DETAILS[m.apiFixtureId],
  ).map((m) => DETAILS[m.apiFixtureId])

/* ========================================================================== *
 * TESTS
 * ========================================================================== */

describe('full knockout tournament — fixtures sanity', () => {
  it('has all knockout matches with distinct matchNos and one champion', () => {
    // 16 (R32) + 8 (R16) + 4 (QF) + 2 (SF) + 1 (F3) + 1 (F) = 32 ties.
    expect(ALL_TIES).toHaveLength(32)
    const nos = new Set(ALL_TIES.map((t) => t.matchNo))
    expect(nos.size).toBe(32)
    expect(CHAMPION).toBe('ARG')
    // the Final's winner is the champion
    expect(ALL_TIES.find((t) => t.stage === 'F')!.winnerCode).toBe('ARG')
  })

  it('includes at least one shootout and at least one clean sheet', () => {
    expect(SHOOTOUTS.length).toBeGreaterThanOrEqual(1)
    expect(SHOOTOUTS[0].matchNo).toBe(21)
    expect(CLEAN_SHEETS.length).toBeGreaterThanOrEqual(1)
    // ARG 2-0 KSA is a clean sheet for ARG
    expect(DETAILS[fixtureId(1)].teamStats['ARG']!.cleanSheet).toBe(true)
    expect(DETAILS[fixtureId(1)].teamStats['KSA']!.cleanSheet).toBe(false)
  })
})

/* ----------------------------- (B) PREDICT --------------------------------- */
describe('PREDICT — scorePredictions matches an independent re-derivation', () => {
  it('grades the full tournament identically to summing ROUND_POINTS over correct picks', () => {
    for (const acc of ACCOUNTS) {
      const got = scorePredictions(acc.predictions, RESOLVED_ALL)
      const exp = expectedPredict(acc, ALL_TIES)
      expect(got.points, `${acc.name} predict total`).toBe(exp)
    }
  })

  it('perMatch statuses are correct/wrong/unpicked on a sample', () => {
    // Account A: all correct.
    const a = scorePredictions(accountA.predictions, RESOLVED_ALL)
    expect(a.perMatch[1]).toBe('correct')
    expect(a.perMatch[32]).toBe('correct')
    expect(a.correct).toBe(32)
    expect(a.graded).toBe(32)

    // Account B: Final wrong (picked GER), SF1 wrong (picked BRA).
    const b = scorePredictions(accountB.predictions, RESOLVED_ALL)
    expect(b.perMatch[32]).toBe('wrong')
    expect(b.perMatch[29]).toBe('wrong')
    expect(b.perMatch[30]).toBe('correct')

    // Account C: m1 & m5 wrong.
    const c = scorePredictions(accountC.predictions, RESOLVED_ALL)
    expect(c.perMatch[1]).toBe('wrong')
    expect(c.perMatch[5]).toBe('wrong')

    // Account E: QF/SF/F unpicked.
    const e = scorePredictions(accountE.predictions, RESOLVED_ALL)
    expect(e.perMatch[25]).toBe('unpicked')
    expect(e.perMatch[32]).toBe('unpicked')
    expect(e.perMatch[17]).toBe('correct')
  })

  it('exact predict totals (independently computed)', () => {
    // ROUND_POINTS: R32=1, R16=2, QF=3, SF=5, F3=1, F=8.
    // Perfect bracket A: 16*1 + 8*2 + 4*3 + 2*5 + 1*1(F3) + 1*8(F)
    //                  = 16 + 16 + 12 + 10 + 1 + 8 = 63
    expect(scorePredictions(accountA.predictions, RESOLVED_ALL).points).toBe(63)

    // B = perfect EXCEPT SF1 (−5) and Final (−8): 63 − 5 − 8 = 50
    expect(scorePredictions(accountB.predictions, RESOLVED_ALL).points).toBe(50)

    // C = perfect EXCEPT m1 (−1), m5 (−1), Final (−8): 63 − 1 − 1 − 8 = 53
    expect(scorePredictions(accountC.predictions, RESOLVED_ALL).points).toBe(53)
  })
})

/* -------------------- (A) LIVE / PROGRESSIVE UPDATE ------------------------ */
describe('LIVE — round-by-round predict scoring is non-decreasing and reveal-gated', () => {
  it('a correct pick adds exactly ROUND_POINTS[stage] only once that round is revealed', () => {
    for (const acc of ACCOUNTS) {
      let prev = -1
      const totals: number[] = []
      for (const stages of STAGE_ORDER) {
        const resolved = resolvedThrough(stages)
        const got = scorePredictions(acc.predictions, resolved).points
        // independent expectation for the same stage window
        const ties = ALL_TIES.filter((t) => stages.includes(t.stage))
        expect(got).toBe(expectedPredict(acc, ties))
        totals.push(got)
        // predict totals never decrease as more matches finish
        expect(got, `${acc.name} non-decreasing`).toBeGreaterThanOrEqual(prev)
        prev = got
      }
    }
  })

  it("the champion-correct account gains the Final's 8 only after the Final is revealed", () => {
    const beforeFinal = resolvedThrough(['R32', 'R16', 'QF', 'SF', 'F3'])
    const withFinal = resolvedThrough(['R32', 'R16', 'QF', 'SF', 'F3', 'F'])
    const a1 = scorePredictions(accountA.predictions, beforeFinal).points
    const a2 = scorePredictions(accountA.predictions, withFinal).points
    expect(a2 - a1).toBe(ROUND_POINTS.F) // exactly +8
    expect(ROUND_POINTS.F).toBe(8)

    // A wrong-final account (B) gains 0 from revealing the Final.
    const b1 = scorePredictions(accountB.predictions, beforeFinal).points
    const b2 = scorePredictions(accountB.predictions, withFinal).points
    expect(b2 - b1).toBe(0)
  })

  it('fantasy totals are non-decreasing per round EXCEPT where a paid-transfer penalty applies', () => {
    // Account A's per-round nets stay positive (the QF's −3 transfer penalty doesn't
    // push that round negative), so the cumulative total is non-decreasing.
    let prevA = -Infinity
    for (let i = 0; i < ROUNDS.length; i++) {
      const upto = ROUNDS.slice(0, i + 1)
      const partial: Partial<Record<Round, RoundSquad>> = {}
      for (const r of upto) if (accountA.fantasy[r]) partial[r] = accountA.fantasy[r]
      const total = scoreFantasyTotal(partial, KO_MATCHES, DETAILS)
      expect(total, `Ace cumulative through ${ROUNDS[i]}`).toBeGreaterThanOrEqual(prevA)
      prevA = total
    }

    // Account C's R16 NET is negative-leaning because of a −9 transfer penalty.
    const cR16 = scoreRound('R16', accountC.fantasy.R16!, accountC.fantasy.R32!.players, detailsForRound('R16'))
    expect(cR16.paidTransfers).toBe(3) // 5 transfers − 2 free
    expect(cR16.transferPenalty).toBe(9)
    // The penalty legitimately drags the round's NET below its gross live points.
    const grossLive = Object.values(cR16.perPlayer).reduce((s, p) => s + p.final, 0)
    expect(cR16.points).toBe(grossLive - 9)
  })
})

/* --------------------------- (E) COUNTRY QUOTA ----------------------------- */
describe('COUNTRY QUOTA — every account respects the per-round cap', () => {
  it('no country exceeds COUNTRY_QUOTA[round] in any squad', () => {
    for (const acc of ACCOUNTS) {
      for (const round of ROUNDS) {
        const sq = acc.fantasy[round]
        if (!sq) continue
        const counts = countryCounts(sq.players)
        const cap = COUNTRY_QUOTA[round]
        for (const [code, n] of Object.entries(counts)) {
          expect(n, `${acc.name} ${round} ${code} (${n} > cap ${cap})`).toBeLessThanOrEqual(cap)
        }
      }
    }
  })

  it('squads have exactly 5 picks, one per slot', () => {
    for (const acc of ACCOUNTS) {
      for (const round of ROUNDS) {
        const sq = acc.fantasy[round]
        if (!sq) continue
        expect(sq.players).toHaveLength(5)
        expect(new Set(sq.players.map((p) => p.slot)).size).toBe(5)
      }
    }
  })
})

/* ---------------- (C) FANTASY — HAND-COMPUTED, ≥2 accts, ≥2 rounds --------- */
describe('FANTASY — hand-computed round scores', () => {
  it('Account A R32 — captain ×2, clean sheet, GK saves, assist, goals', () => {
    // A R32 squad:
    //  GK  E. Martinez (ARG)  — ARG 2-0 KSA: clean sheet +4; gkSaves 4 → floor(4/3)=1 → +1 ⇒ base 5
    //  DEF K. Koulibaly (SEN) — SEN 1-0 IRN: clean sheet (DEF) +4 ⇒ base 4
    //  MID Pedri (ESP)        — ESP 2-0 MAR: clean sheet (MID) +1 ⇒ base 1
    //  ATT Messi (ARG) [CAPT] — goal +4 (ATT) + assist +3 = 7; ×2 (captain) = 14
    //  FLEX Mbappe (FRA, ATT) — FRA 3-1 CAN: goal +4 ⇒ base 4
    // Transfers (R32 = initial build, free = Infinity) → 0 penalty.
    // TOTAL = 5 + 4 + 1 + 14 + 4 = 28
    const r = scoreRound('R32', accountA.fantasy.R32!, [], detailsForRound('R32'))
    expect(r.perPlayer[cap(ARG_GK)].base).toBe(5)
    expect(r.perPlayer[cap(SEN_DEF)].base).toBe(4)
    expect(r.perPlayer[cap(ESP_MID)].base).toBe(1)
    expect(r.perPlayer[cap(ARG_FWD)].base).toBe(7)
    expect(r.perPlayer[cap(ARG_FWD)].final).toBe(14) // captain ×2
    expect(r.perPlayer[cap(FRA_FWD)].base).toBe(4)
    expect(r.transferPenalty).toBe(0)
    expect(r.points).toBe(28)
  })

  it('Account A QF — captain Messi goal+assist ×2 (14), GER MID goal+clean-sheet (6), 1 paid transfer (−3) → 21', () => {
    // A QF squad (quota 3, free 2; transfers from A_R16 → A_QF):
    //   prev (R16) players: ARG_GK, SEN_DEF, ESP_MID, ARG_FWD, FRA_FWD
    //   QF players: ARG_GK, ARG_DEF, GER_FWD(as MID), ARG_FWD, BRA_FWD
    //   incoming not in prev: ARG_DEF, GER_FWD, BRA_FWD = 3 transfers; free 2 → 1 paid → −3.
    //  GK  E. Martinez (ARG) — ARG 2-1 FRA (QF m25): conceded 1 → NO clean sheet; no saves stat ⇒ base 0
    //  DEF N. Otamendi (ARG) — same match, conceded 1 → no clean sheet ⇒ base 0
    //  MID Havertz (GER)     — GER 2-0 SEN (m27): goal +5 (MID) + clean sheet +1 (MID) ⇒ base 6
    //  ATT Messi (ARG)[CAPT] — m25: goal +4 + assist +3 = 7; ×2 = 14
    //  FLEX Vinicius (BRA)   — BRA 1-0 ESP (m26): goal +4 ⇒ base 4
    // live = 0 + 0 + 6 + 14 + 4 = 24; penalty −3 ⇒ NET 21
    const r = scoreRound('QF', accountA.fantasy.QF!, accountA.fantasy.R16!.players, detailsForRound('QF'))
    expect(r.transfersUsed).toBe(3)
    expect(r.paidTransfers).toBe(1)
    expect(r.transferPenalty).toBe(3)
    expect(r.perPlayer[cap(ARG_GK)].base).toBe(0)
    expect(r.perPlayer[cap(ARG_DEF)].base).toBe(0)
    expect(r.perPlayer[cap(GER_FWD)].base).toBe(6) // MID goal +5, clean sheet +1
    expect(r.perPlayer[cap(ARG_FWD)].base).toBe(7)
    expect(r.perPlayer[cap(ARG_FWD)].final).toBe(14)
    expect(r.perPlayer[cap(BRA_FWD)].base).toBe(4)
    expect(r.points).toBe(21)
  })

  it('Account B R32 — captain Havertz, GER goal, plus assorted', () => {
    // B R32 squad (initial build, free=Inf):
    //  GK  Neuer (GER)   — GER 3-2 SUI: conceded 2 → no clean sheet; no saves ⇒ base 0
    //  DEF van Dijk (NED)— NED 2-1 ECU: conceded 1 → no clean sheet ⇒ base 0
    //  MID Pedri (ESP)   — ESP 2-0 MAR: clean sheet MID +1 ⇒ base 1
    //  ATT Havertz (GER)[CAPT] — GER 3-2 SUI: no Havertz event in m9 detail (empty) ⇒ base 0; ×2 = 0
    //  FLEX Vinicius (BRA, ATT) — BRA 4-1 KOR: goal +4, yellow −1 ⇒ base 3
    // TOTAL = 0 + 0 + 1 + 0 + 3 = 4
    const r = scoreRound('R32', accountB.fantasy.R32!, [], detailsForRound('R32'))
    expect(r.perPlayer[cap(GER_GK)].base).toBe(0)
    expect(r.perPlayer[cap(NED_DEF)].base).toBe(0)
    expect(r.perPlayer[cap(ESP_MID)].base).toBe(1)
    expect(r.perPlayer[cap(GER_FWD)].base).toBe(0)
    expect(r.perPlayer[cap(GER_FWD)].final).toBe(0) // captain ×2 of 0
    expect(r.perPlayer[cap(BRA_FWD)].base).toBe(3) // goal +4, yellow −1
    expect(r.points).toBe(4)
  })

  it('Account B FINAL — captain Havertz scores in the Final (goal ×2)', () => {
    // B FINAL squad = B_SF (no transfers): GER_GK, ARG_DEF, ARG_MID, GER_FWD[CAPT], BRA_FWD
    // FINAL round details = F3 (BRA 3-1 SCO, m31) + F (ARG 2-1 GER, m32).
    //  GK  Neuer (GER)   — Final m32: conceded 2 → no clean sheet ⇒ 0
    //  DEF Otamendi (ARG)— Final m32: ARG conceded 1 → no clean sheet ⇒ 0
    //  MID De Paul (ARG) — Final m32: 2 assists? De Paul assists Messi's goal (+3). Di Maria's goal assisted by Messi (not De Paul). ⇒ base 3
    //  ATT Havertz (GER)[CAPT] — Final m32: goal +4 (ATT) ⇒ base 4; ×2 = 8
    //  FLEX Vinicius (BRA) — F3 m31: goal +4 ⇒ base 4
    // live = 0 + 0 + 3 + 8 + 4 = 15; transfers 0 → NET 15
    const r = scoreRound('FINAL', accountB.fantasy.FINAL!, accountB.fantasy.SF!.players, detailsForRound('FINAL'))
    expect(r.transfersUsed).toBe(0)
    expect(r.perPlayer[cap(GER_GK)].base).toBe(0)
    expect(r.perPlayer[cap(ARG_DEF)].base).toBe(0)
    expect(r.perPlayer[cap(ARG_MID)].base).toBe(3) // De Paul assist on Messi's goal
    expect(r.perPlayer[cap(GER_FWD)].base).toBe(4)
    expect(r.perPlayer[cap(GER_FWD)].final).toBe(8) // captain ×2
    expect(r.perPlayer[cap(BRA_FWD)].base).toBe(4)
    expect(r.points).toBe(15)
  })

  it('Account D R16 — captain in the shootout match: in-play goal +4 and shootout miss −1 → base 3, ×2 = 6', () => {
    // D R16 squad = D_R32 (0 transfers): BRA_GK, NED_DEF, ESP_MID, URU_FWD[CAPT], CIV_FWD
    // R16 round details: matches in R16 stage that involve each team.
    //  GK  Alisson (BRA) — BRA 2-1 NED (m19): conceded 1 → no clean sheet ⇒ 0
    //  DEF van Dijk (NED)— NED LOST m19, conceded 2 → no clean sheet ⇒ 0
    //  MID Pedri (ESP)   — ESP 1-0 BEL (m20): goal +5 (MID) + clean sheet +1 = 6
    //  ATT Nunez (URU)[CAPT] — GER 1-1 URU shootout (m21): in-play goal? Nunez's in-play goal IS present (78') +4,
    //        AND a shootout MISS (-1). base = 4 - 1 = 3; ×2 = 6.
    //  FLEX Haller (CIV) — CIV 1-0 AUT (m23): no event in detail (empty) ⇒ 0
    // Wait: re-derive Nunez. m21 events for URU: Goal Nunez 78' (+4), Missed Penalty Nunez 120+2 shootout (-1).
    //   base = 3, captain ×2 = 6.
    // live = 0 + 0 + 6 + 6 + 0 = 12; transfers 0 ⇒ NET 12
    const r = scoreRound('R16', accountD.fantasy.R16!, accountD.fantasy.R32!.players, detailsForRound('R16'))
    expect(r.transfersUsed).toBe(0)
    expect(r.perPlayer[cap(BRA_GK)].base).toBe(0)
    expect(r.perPlayer[cap(NED_DEF)].base).toBe(0)
    expect(r.perPlayer[cap(ESP_MID)].base).toBe(6) // goal 5 + clean sheet 1
    expect(r.perPlayer[cap(URU_FWD)].base).toBe(3) // in-play goal +4, shootout miss −1
    expect(r.perPlayer[cap(URU_FWD)].final).toBe(6) // captain ×2
    expect(r.perPlayer[cap(CIV_FWD)].base).toBe(0)
    expect(r.points).toBe(12)
  })

  it('SHOOTOUT kicks score +2/−1 and never affect a clean sheet', () => {
    // m21 GER 1-1 URU: neither team has a clean sheet (both conceded 1 in regulation).
    const d = DETAILS[fixtureId(21)]
    expect(d.hadShootout).toBe(true)
    expect(d.teamStats['GER']!.cleanSheet).toBe(false)
    expect(d.teamStats['URU']!.cleanSheet).toBe(false)
    // Havertz: in-play goal (35') +4 AND shootout kick (120+1) +2 ⇒ base 6.
    const ger = scoreRound('R16', { players: [pick('ATT', GER_FWD, 'ATT')], captain: null }, [], detailsForRound('R16'))
    expect(ger.perPlayer[cap(GER_FWD)].base).toBe(6) // 4 in-play + 2 shootout
  })
})

/* ----------------------- (D) CONSISTENCY ----------------------------------- */
describe('CONSISTENCY — scoreFantasyTotal equals the sum of scoreRound across rounds', () => {
  it('matches per-round sum for every account', () => {
    for (const acc of ACCOUNTS) {
      let sum = 0
      for (let i = 0; i < ROUNDS.length; i++) {
        const r = ROUNDS[i]
        const sq = acc.fantasy[r]
        if (!sq) continue
        const prev = (i > 0 && acc.fantasy[ROUNDS[i - 1]]?.players) || []
        sum += scoreRound(r, sq, prev, detailsForRound(r)).points
      }
      const total = scoreFantasyTotal(acc.fantasy, KO_MATCHES, DETAILS)
      expect(total, `${acc.name} consistency`).toBe(sum)
    }
  })
})

/* ----------------------- (F) + (G) LEADERBOARD ----------------------------- */
describe('LEADERBOARD — final standings via the real scorers', () => {
  it('ranks accounts and prints the table', () => {
    const rows = ACCOUNTS.map((acc) => {
      const predict = scorePredictions(acc.predictions, RESOLVED_ALL).points
      const fantasy = scoreFantasyTotal(acc.fantasy, KO_MATCHES, DETAILS)
      return { name: acc.name, predict, fantasy, combined: predict + fantasy }
    })

    const byPredict = [...rows].sort((a, b) => b.predict - a.predict)
    const byFantasy = [...rows].sort((a, b) => b.fantasy - a.fantasy)
    const byCombined = [...rows].sort((a, b) => b.combined - a.combined)

    // --- (G) print the readable standings -----------------------------------
    /* eslint-disable no-console */
    console.log('\n================ SIMULATED WORLD CUP LEADERBOARD ================')
    console.log('Account   | Predict | Fantasy | Combined')
    console.log('----------+---------+---------+---------')
    for (const r of byCombined) {
      console.log(
        `${r.name.padEnd(9)} | ${String(r.predict).padStart(7)} | ${String(r.fantasy).padStart(7)} | ${String(r.combined).padStart(8)}`,
      )
    }
    console.log('================================================================\n')
    /* eslint-enable no-console */

    // --- (F) independently-reasoned expectations ----------------------------
    // PREDICT: Ace has the perfect bracket (63) → must top predict.
    expect(byPredict[0].name).toBe('Ace')
    expect(byPredict[0].predict).toBe(63)
    // Even only picked R32+R16 correctly: 16*1 + 8*2 = 32 → lowest predict.
    expect(byPredict[byPredict.length - 1].name).toBe('Even')
    expect(rows.find((r) => r.name === 'Even')!.predict).toBe(32)

    // FANTASY: Ace captains Messi (top scorer) every round with an all-ARG
    // spine and zero transfer penalties → must top fantasy.
    expect(byFantasy[0].name).toBe('Ace')

    // COMBINED: Ace tops both → tops combined.
    expect(byCombined[0].name).toBe('Ace')

    // Churner ate a −9 transfer penalty; ensure it is reflected (fantasy < Ace).
    const ace = rows.find((r) => r.name === 'Ace')!
    const churner = rows.find((r) => r.name === 'Churner')!
    expect(churner.fantasy).toBeLessThan(ace.fantasy)
  })
})
