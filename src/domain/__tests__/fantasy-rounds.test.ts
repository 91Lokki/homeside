import { describe, it, expect } from 'vitest'
import type { MatchDetail, MatchEvent, TeamMatchStats } from '@/lib/api'
import type { TeamCode } from '@/domain/types'
import {
  scoreRound,
  scoreFantasyTotal,
  countTransfers,
  countryCounts,
  playerKey,
  stageToRound,
  COUNTRY_QUOTA,
  FREE_TRANSFERS,
  SLOT_ALLOWS,
  EXTRA_TRANSFER_COST,
  ROUNDS,
  type FantasyPick,
  type RoundSquad,
  type Round,
  type PosCat,
  type ScorableMatch,
} from '@/domain/fantasy'

/* -------------------------------------------------------------------------- */
/* Fixture builders — match the real TypeScript interfaces exactly.            */
/* -------------------------------------------------------------------------- */

function pick(over: Partial<FantasyPick> & Pick<FantasyPick, 'name' | 'teamCode' | 'position'>): FantasyPick {
  return {
    slot: over.slot ?? (over.position === 'GK' ? 'GK' : 'FLEX'),
    name: over.name,
    teamCode: over.teamCode,
    position: over.position,
    number: over.number ?? null,
  }
}

function teamStats(over: Partial<TeamMatchStats> & Pick<TeamMatchStats, 'code'>): TeamMatchStats {
  return {
    code: over.code,
    goalsFor: over.goalsFor ?? 0,
    goalsAgainst: over.goalsAgainst ?? 0,
    cleanSheet: over.cleanSheet ?? false,
    possession: over.possession ?? null,
    shots: over.shots ?? null,
    shotsOnTarget: over.shotsOnTarget ?? null,
    passPct: over.passPct ?? null,
    crosses: over.crosses ?? null,
    corners: over.corners ?? null,
    tackles: over.tackles ?? null,
    interceptions: over.interceptions ?? null,
    clearances: over.clearances ?? null,
    fouls: over.fouls ?? null,
    yellow: over.yellow ?? null,
    red: over.red ?? null,
    gkSaves: over.gkSaves ?? null,
  }
}

function ev(over: Partial<MatchEvent> & Pick<MatchEvent, 'type' | 'player' | 'teamCode'>): MatchEvent {
  return {
    minute: over.minute ?? 10,
    rawTime: over.rawTime ?? "10'",
    teamCode: over.teamCode,
    type: over.type,
    player: over.player,
    playerNumber: over.playerNumber ?? null,
    assist: over.assist ?? null,
  }
}

function detail(over: Partial<MatchDetail> & Pick<MatchDetail, 'fixtureId' | 'home' | 'away'>): MatchDetail {
  return {
    fixtureId: over.fixtureId,
    home: over.home,
    away: over.away,
    hadShootout: over.hadShootout ?? false,
    events: over.events ?? [],
    teamStats: over.teamStats ?? {},
  }
}

/** A detailsFor that returns the given details only for teams in those details. */
function detailsForFrom(...all: MatchDetail[]): (teamCode: TeamCode) => MatchDetail[] {
  return (teamCode: TeamCode) => all.filter((d) => d.home === teamCode || d.away === teamCode)
}

const NONE: (teamCode: TeamCode) => MatchDetail[] = () => []

/* -------------------------------------------------------------------------- */
/* Constant / table assertions                                                */
/* -------------------------------------------------------------------------- */

describe('rule tables', () => {
  it('COUNTRY_QUOTA matches the documented per-round limits', () => {
    expect(COUNTRY_QUOTA).toEqual({ R32: 2, R16: 2, QF: 3, SF: 4, FINAL: 5 })
  })

  it('FREE_TRANSFERS — R32 is unlimited (Infinity), then 2/2/2 and 5 for the final', () => {
    expect(FREE_TRANSFERS.R32).toBe(Infinity)
    expect(Number.isFinite(FREE_TRANSFERS.R32)).toBe(false)
    expect(FREE_TRANSFERS.R16).toBe(2)
    expect(FREE_TRANSFERS.QF).toBe(2)
    expect(FREE_TRANSFERS.SF).toBe(2)
    expect(FREE_TRANSFERS.FINAL).toBe(5)
  })

  it('SLOT_ALLOWS maps each slot to the categories it accepts (Flex = any outfielder)', () => {
    expect(SLOT_ALLOWS.GK).toEqual(['GK'])
    expect(SLOT_ALLOWS.DEF).toEqual(['DEF'])
    expect(SLOT_ALLOWS.MID).toEqual(['MID'])
    expect(SLOT_ALLOWS.ATT).toEqual(['ATT'])
    expect(SLOT_ALLOWS.FLEX).toEqual(['DEF', 'MID', 'ATT'])
    expect(SLOT_ALLOWS.FLEX).not.toContain('GK')
  })

  it('EXTRA_TRANSFER_COST is 3', () => {
    expect(EXTRA_TRANSFER_COST).toBe(3)
  })

  it('ROUNDS lists the five knockout rounds in order', () => {
    expect(ROUNDS).toEqual(['R32', 'R16', 'QF', 'SF', 'FINAL'])
  })
})

/* -------------------------------------------------------------------------- */
/* stageToRound                                                                */
/* -------------------------------------------------------------------------- */

describe('stageToRound', () => {
  it('maps knockout stages 1:1', () => {
    expect(stageToRound('R32')).toBe('R32')
    expect(stageToRound('R16')).toBe('R16')
    expect(stageToRound('QF')).toBe('QF')
    expect(stageToRound('SF')).toBe('SF')
  })

  it('folds both final-stage stages (F3 third-place play-off and F final) into FINAL', () => {
    expect(stageToRound('F3')).toBe('FINAL')
    expect(stageToRound('F')).toBe('FINAL')
  })

  it('returns null for the group stage (not a fantasy round)', () => {
    expect(stageToRound('group')).toBeNull()
  })
})

/* -------------------------------------------------------------------------- */
/* playerKey                                                                   */
/* -------------------------------------------------------------------------- */

describe('playerKey', () => {
  it('joins teamCode, name and number with the middle-dot separator', () => {
    expect(playerKey({ teamCode: 'BRA', name: 'Danilo', number: 2 })).toBe('BRA·Danilo·2')
  })

  it('renders a missing/null number as empty', () => {
    expect(playerKey({ teamCode: 'ARG', name: 'Messi', number: null })).toBe('ARG·Messi·')
    expect(playerKey({ teamCode: 'ARG', name: 'Messi' })).toBe('ARG·Messi·')
  })

  it('disambiguates two same-named players by shirt number', () => {
    const a = playerKey({ teamCode: 'BRA', name: 'Danilo', number: 2 })
    const b = playerKey({ teamCode: 'BRA', name: 'Danilo', number: 3 })
    expect(a).not.toBe(b)
  })
})

/* -------------------------------------------------------------------------- */
/* countTransfers                                                              */
/* -------------------------------------------------------------------------- */

describe('countTransfers', () => {
  const A = pick({ name: 'Alpha', teamCode: 'ARG', position: 'ATT', number: 9 })
  const B = pick({ name: 'Bravo', teamCode: 'BRA', position: 'MID', number: 8 })
  const C = pick({ name: 'Charlie', teamCode: 'FRA', position: 'DEF', number: 4 })

  it('counts incoming players not present in the previous squad', () => {
    expect(countTransfers([A, B, C], [A, B])).toBe(1) // C is new
  })

  it('returns 0 when the squad is unchanged', () => {
    expect(countTransfers([A, B, C], [A, B, C])).toBe(0)
  })

  it('counts every player as a transfer when the previous squad is empty (initial build)', () => {
    expect(countTransfers([A, B, C], [])).toBe(3)
  })

  it('returns 0 for an empty current squad', () => {
    expect(countTransfers([], [A, B])).toBe(0)
  })

  it('keys on playerKey — same name+team but different number counts as a transfer', () => {
    const danilo2 = pick({ name: 'Danilo', teamCode: 'BRA', position: 'DEF', number: 2 })
    const danilo3 = pick({ name: 'Danilo', teamCode: 'BRA', position: 'MID', number: 3 })
    expect(countTransfers([danilo3], [danilo2])).toBe(1)
  })

  it('does not count outgoing players (only incoming are transfers)', () => {
    // previous had A,B,C; current dropped C but added nothing -> 0 incoming
    expect(countTransfers([A, B], [A, B, C])).toBe(0)
  })
})

/* -------------------------------------------------------------------------- */
/* countryCounts                                                               */
/* -------------------------------------------------------------------------- */

describe('countryCounts', () => {
  it('tallies players per teamCode', () => {
    const players = [
      pick({ name: 'a', teamCode: 'ARG', position: 'ATT' }),
      pick({ name: 'b', teamCode: 'ARG', position: 'MID' }),
      pick({ name: 'c', teamCode: 'BRA', position: 'DEF' }),
    ]
    expect(countryCounts(players)).toEqual({ ARG: 2, BRA: 1 })
  })

  it('returns an empty map for no players', () => {
    expect(countryCounts([])).toEqual({})
  })
})

/* -------------------------------------------------------------------------- */
/* scoreRound — captain doubling (no vice)                                     */
/* -------------------------------------------------------------------------- */

describe('scoreRound — captaincy', () => {
  // Two ATT picks. ATT goal = +4 each.
  const cap = pick({ name: 'Captain', teamCode: 'ARG', position: 'ATT', number: 9 })
  const other = pick({ name: 'Other', teamCode: 'BRA', position: 'ATT', number: 10 })

  const argMatch = detail({
    fixtureId: 1,
    home: 'ARG',
    away: 'XXX',
    events: [ev({ type: 'Goal', player: 'Captain', teamCode: 'ARG' })],
  })
  const braMatch = detail({
    fixtureId: 2,
    home: 'BRA',
    away: 'YYY',
    events: [ev({ type: 'Goal', player: 'Other', teamCode: 'BRA' })],
  })

  const squad: RoundSquad = { players: [cap, other], captain: playerKey(cap) }

  it("doubles the captain's points when the captain's team featured", () => {
    const r = scoreRound('QF', squad, [cap, other], detailsForFrom(argMatch, braMatch))
    // Captain: 4 * 2 = 8 ; Other: 4 * 1 = 4 ; total 12, no transfers
    expect(r.effectiveCaptain).toBe(playerKey(cap))
    expect(r.perPlayer[playerKey(cap)].base).toBe(4)
    expect(r.perPlayer[playerKey(cap)].isCaptain).toBe(true)
    expect(r.perPlayer[playerKey(cap)].final).toBe(8)
    expect(r.perPlayer[playerKey(other)].isCaptain).toBe(false)
    expect(r.perPlayer[playerKey(other)].final).toBe(4)
    expect(r.points).toBe(12)
  })

  it('gives the captain 0 when their team is eliminated — no vice fallback', () => {
    // ARG (captain) is out → only BRA match exists. Captain base 0, ×2 = 0.
    const r = scoreRound('QF', squad, [cap, other], detailsForFrom(braMatch))
    expect(r.effectiveCaptain).toBe(playerKey(cap)) // captain stays nominal
    expect(r.perPlayer[playerKey(cap)].base).toBe(0)
    expect(r.perPlayer[playerKey(cap)].isCaptain).toBe(true)
    expect(r.perPlayer[playerKey(cap)].final).toBe(0)
    // the other player is NOT auto-promoted to captain; scores its single value
    expect(r.perPlayer[playerKey(other)].isCaptain).toBe(false)
    expect(r.perPlayer[playerKey(other)].final).toBe(4)
    expect(r.points).toBe(4)
  })

  it('keeps the nominal captain (×2 of 0) when nobody featured', () => {
    const r = scoreRound('QF', squad, [cap, other], NONE)
    expect(r.effectiveCaptain).toBe(playerKey(cap))
    expect(r.perPlayer[playerKey(cap)].isCaptain).toBe(true)
    expect(r.perPlayer[playerKey(cap)].final).toBe(0)
    expect(r.points).toBe(0)
  })

  it('doubles nobody when there is no captain', () => {
    const r = scoreRound('QF', { players: [cap, other], captain: null }, [cap, other], detailsForFrom(argMatch, braMatch))
    expect(r.effectiveCaptain).toBeNull()
    expect(r.perPlayer[playerKey(cap)].isCaptain).toBe(false)
    expect(r.perPlayer[playerKey(cap)].final).toBe(4)
    expect(r.perPlayer[playerKey(other)].final).toBe(4)
    expect(r.points).toBe(8)
  })
})

/* -------------------------------------------------------------------------- */
/* scoreRound — transfers & penalties                                         */
/* -------------------------------------------------------------------------- */

describe('scoreRound — transfers & penalties', () => {
  const p1 = pick({ name: 'P1', teamCode: 'ARG', position: 'ATT', number: 1 })
  const p2 = pick({ name: 'P2', teamCode: 'BRA', position: 'ATT', number: 2 })
  const p3 = pick({ name: 'P3', teamCode: 'FRA', position: 'ATT', number: 3 })
  const p4 = pick({ name: 'P4', teamCode: 'GER', position: 'ATT', number: 4 })
  const p5 = pick({ name: 'P5', teamCode: 'ESP', position: 'ATT', number: 5 })

  // No team featured -> live points 0, so points = -transferPenalty.
  const squad = (players: FantasyPick[]): RoundSquad => ({
    players,
    captain: playerKey(players[0]),
  })

  it('R32 has unlimited free transfers (Infinity) → never any paid transfers', () => {
    const r = scoreRound('R32', squad([p1, p2, p3, p4, p5]), [], NONE)
    expect(r.transfersUsed).toBe(5)
    expect(r.freeTransfers).toBe(Infinity)
    expect(r.paidTransfers).toBe(0)
    expect(r.transferPenalty).toBe(0)
    expect(r.points).toBe(0)
  })

  it('charges 3 per paid transfer above the free allowance (R16 free=2)', () => {
    // prev had p1,p2,p3; current swaps in p4,p5 -> 2 incoming, exactly the free allowance
    const r0 = scoreRound('R16', squad([p1, p2, p3, p4, p5]), [p1, p2, p3], NONE)
    expect(r0.transfersUsed).toBe(2)
    expect(r0.freeTransfers).toBe(2)
    expect(r0.paidTransfers).toBe(0)
    expect(r0.transferPenalty).toBe(0)
  })

  it('one over the R16 free allowance costs exactly 3', () => {
    // prev p1,p2; current p1,p2,p3,p4,p5 -> 3 incoming, free 2 -> 1 paid -> -3
    const r = scoreRound('R16', squad([p1, p2, p3, p4, p5]), [p1, p2], NONE)
    expect(r.transfersUsed).toBe(3)
    expect(r.paidTransfers).toBe(1)
    expect(r.transferPenalty).toBe(3)
    expect(r.points).toBe(-3)
  })

  it('three over the QF free allowance costs 9 (max(0, used-free) * 3)', () => {
    // prev empty; current 5 -> used 5, free 2 -> paid 3 -> penalty 9
    const r = scoreRound('QF', squad([p1, p2, p3, p4, p5]), [], NONE)
    expect(r.transfersUsed).toBe(5)
    expect(r.freeTransfers).toBe(2)
    expect(r.paidTransfers).toBe(3)
    expect(r.transferPenalty).toBe(9)
    expect(r.points).toBe(-9)
  })

  it('FINAL grants 5 free transfers', () => {
    const r = scoreRound('FINAL', squad([p1, p2, p3, p4, p5]), [], NONE)
    expect(r.transfersUsed).toBe(5)
    expect(r.freeTransfers).toBe(5)
    expect(r.paidTransfers).toBe(0)
    expect(r.transferPenalty).toBe(0)
  })

  it('paidTransfers floors at 0 — fewer transfers than free never yields a credit', () => {
    // SF free=2, but only 1 transfer used
    const r = scoreRound('SF', squad([p1, p2]), [p1], NONE)
    expect(r.transfersUsed).toBe(1)
    expect(r.freeTransfers).toBe(2)
    expect(r.paidTransfers).toBe(0)
    expect(r.transferPenalty).toBe(0)
  })

  it('combines live points and transfer penalty (points = liveTotal - penalty)', () => {
    // captain (p1, ARG) scores a goal -> base 4, captain double -> 8 live.
    const argMatch = detail({
      fixtureId: 7,
      home: 'ARG',
      away: 'ZZZ',
      events: [ev({ type: 'Goal', player: 'P1', teamCode: 'ARG' })],
    })
    // R16 free=2, prev empty -> used 2 -> paid 0 (so isolate live)
    const r = scoreRound('R16', squad([p1, p2]), [p1, p2], detailsForFrom(argMatch))
    expect(r.transferPenalty).toBe(0)
    expect(r.points).toBe(8)
  })
})

/* -------------------------------------------------------------------------- */
/* scoreRound — scorePick integration (points by position & event)            */
/* -------------------------------------------------------------------------- */

describe('scoreRound — point scoring by position and event', () => {
  const single = (p: FantasyPick): RoundSquad => ({ players: [p], captain: null })

  it('awards goal points by position: ATT +4, MID +5, DEF +6, GK +6', () => {
    const cases: Array<[PosCat, number]> = [
      ['ATT', 4],
      ['MID', 5],
      ['DEF', 6],
      ['GK', 6],
    ]
    for (const [pos, pts] of cases) {
      const p = pick({ name: 'Scorer', teamCode: 'ARG', position: pos, number: 9 })
      const d = detail({
        fixtureId: 1,
        home: 'ARG',
        away: 'XXX',
        events: [ev({ type: 'Goal', player: 'Scorer', teamCode: 'ARG' })],
      })
      const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
      expect(r.perPlayer[playerKey(p)].base).toBe(pts)
    }
  })

  it('awards +3 for an assist on a team goal', () => {
    const p = pick({ name: 'Assister', teamCode: 'ARG', position: 'MID', number: 8 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'Striker', teamCode: 'ARG', assist: 'Assister' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    // assist only (not the scorer) -> +3
    expect(r.perPlayer[playerKey(p)].base).toBe(3)
  })

  it('awards clean-sheet points: DEF +4, GK +4, MID +1, ATT +0', () => {
    const cases: Array<[PosCat, number]> = [
      ['GK', 4],
      ['DEF', 4],
      ['MID', 1],
      ['ATT', 0],
    ]
    for (const [pos, pts] of cases) {
      const p = pick({ name: 'Keeper', teamCode: 'ARG', position: pos, number: 1 })
      const d = detail({
        fixtureId: 1,
        home: 'ARG',
        away: 'XXX',
        teamStats: { ARG: teamStats({ code: 'ARG', cleanSheet: true, goalsAgainst: 0 }) },
      })
      const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
      expect(r.perPlayer[playerKey(p)].base).toBe(pts)
    }
  })

  it('awards GK saves at +1 per 3 (floored): 7 saves -> +2', () => {
    const gk = pick({ name: 'Keeper', teamCode: 'ARG', position: 'GK', number: 1 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      teamStats: { ARG: teamStats({ code: 'ARG', gkSaves: 7 }) },
    })
    const r = scoreRound('QF', single(gk), [gk], detailsForFrom(d))
    expect(r.perPlayer[playerKey(gk)].base).toBe(2)
  })

  it('awards NO save points to an outfielder regardless of the team gkSaves stat', () => {
    // gkSaves is a team stat; it must only ever credit the GK pick. A DEF on the
    // same team gets 0 from saves even with a huge save count (clean sheet off so
    // the only possible source of points would be saves).
    const def = pick({ name: 'Back', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      teamStats: { ARG: teamStats({ code: 'ARG', gkSaves: 99, cleanSheet: false }) },
    })
    const r = scoreRound('QF', single(def), [def], detailsForFrom(d))
    expect(r.perPlayer[playerKey(def)].base).toBe(0)
  })

  it('floors GK save points at +1 per 3: 2→0, 3→+1, 5→+1, 6→+2', () => {
    const cases: Array<[number, number]> = [
      [2, 0], // below the first threshold -> 0
      [3, 1], // exactly 3 -> +1
      [5, 1], // 5 floors down to 1 band -> +1
      [6, 2], // exactly 6 -> +2
    ]
    for (const [saves, pts] of cases) {
      const gk = pick({ name: 'Keeper', teamCode: 'ARG', position: 'GK', number: 1 })
      const d = detail({
        fixtureId: 1,
        home: 'ARG',
        away: 'XXX',
        // cleanSheet off so saves are the only point source we measure here
        teamStats: { ARG: teamStats({ code: 'ARG', gkSaves: saves, cleanSheet: false }) },
      })
      const r = scoreRound('QF', single(gk), [gk], detailsForFrom(d))
      expect(r.perPlayer[playerKey(gk)].base).toBe(pts)
    }
  })

  it('subtracts for cards (yellow -1, red -3) and own goals (-2)', () => {
    const p = pick({ name: 'Brute', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [
        ev({ type: 'Yellow Card', player: 'Brute', teamCode: 'ARG' }),
        ev({ type: 'Red Card', player: 'Brute', teamCode: 'ARG' }),
        ev({ type: 'Own Goal', player: 'Brute', teamCode: 'ARG' }),
      ],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    // -1 -3 -2 = -6
    expect(r.perPlayer[playerKey(p)].base).toBe(-6)
  })

  it('subtracts -2 for an in-play missed penalty (no shootout)', () => {
    const p = pick({ name: 'Misser', teamCode: 'ARG', position: 'ATT', number: 9 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: false,
      events: [ev({ type: 'Missed Penalty', player: 'Misser', teamCode: 'ARG', rawTime: "55'" })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(-2)
  })

  it('scores an in-play penalty goal at the position goal value (ATT +4)', () => {
    const p = pick({ name: 'PenTaker', teamCode: 'ARG', position: 'ATT', number: 9 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: false,
      events: [ev({ type: 'Penalty', player: 'PenTaker', teamCode: 'ARG', rawTime: "55'" })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(4)
  })

  it('credits an assist on an in-play PENALTY goal (assist scoring runs inside the in-play-goal branch)', () => {
    // The scorer is someone else; our pick is the credited assister on a won/scored
    // in-play penalty. matchAssist runs within the isInPlayGoal branch -> +3.
    const p = pick({ name: 'Assister', teamCode: 'ARG', position: 'MID', number: 8 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: false,
      events: [
        ev({ type: 'Penalty', player: 'PenTaker', teamCode: 'ARG', rawTime: "55'", assist: 'Assister' }),
      ],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    // assist only (our pick did not take the penalty) -> +3
    expect(r.perPlayer[playerKey(p)].base).toBe(3)
  })

  it('scores a shootout kick (+2) only when the match went to a shootout and time is 120+N', () => {
    const p = pick({ name: 'Kicker', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: true,
      events: [ev({ type: 'Penalty', player: 'Kicker', teamCode: 'ARG', rawTime: '120+3' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    // shootout goal is +2, NOT the DEF goal value of 6
    expect(r.perPlayer[playerKey(p)].base).toBe(2)
  })

  it('scores a missed shootout kick at -1', () => {
    const p = pick({ name: 'Kicker', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: true,
      events: [ev({ type: 'Missed Penalty', player: 'Kicker', teamCode: 'ARG', rawTime: '120+5' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(-1)
  })

  it('gates shootout scoring on hadShootout: a 120+N PENALTY in a match with NO shootout scores as an in-play goal, not +2', () => {
    // Same 120+N timestamp as a shootout kick, but hadShootout=false (e.g. a very
    // late in-play penalty mis-stamped). isShootoutKick is false -> it must take
    // the in-play-goal branch and award the DEF goal value (+6), NOT shootout +2.
    const p = pick({ name: 'Kicker', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: false,
      events: [ev({ type: 'Penalty', player: 'Kicker', teamCode: 'ARG', rawTime: '120+3' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(6)
  })

  it('gates shootout scoring on hadShootout: a 120+N MISSED PENALTY with NO shootout scores as an in-play miss (-2), not -1', () => {
    // Mirror of the above for misses: without a shootout the -1 shootout-miss path
    // must not fire; it falls through to the in-play penalty miss (-2).
    const p = pick({ name: 'Kicker', teamCode: 'ARG', position: 'DEF', number: 4 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      hadShootout: false,
      events: [ev({ type: 'Missed Penalty', player: 'Kicker', teamCode: 'ARG', rawTime: '120+5' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(-2)
  })

  it('ignores events from other teams in the same match', () => {
    const p = pick({ name: 'Mine', teamCode: 'ARG', position: 'ATT', number: 9 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'BRA',
      events: [
        ev({ type: 'Goal', player: 'Mine', teamCode: 'ARG' }),
        ev({ type: 'Goal', player: 'Theirs', teamCode: 'BRA' }),
      ],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    // only own goal counts: +4
    expect(r.perPlayer[playerKey(p)].base).toBe(4)
  })

  it('matches purely on shirt number when both the pick and the event carry numbers', () => {
    // names differ, but numbers match -> still counts as the pick's goal
    const p = pick({ name: 'Real Name', teamCode: 'ARG', position: 'ATT', number: 10 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'Totally Different', teamCode: 'ARG', playerNumber: 10 })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(4)
  })

  it('matches by name when shirt numbers are unavailable on the event', () => {
    const p = pick({ name: 'Lionel Messi', teamCode: 'ARG', position: 'ATT', number: 10 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'Lionel Messi', teamCode: 'ARG', playerNumber: null })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(4)
  })

  it('matches on surname + first-initial when the event abbreviates the first name (pick "Lionel Messi" vs event "L. Messi")', () => {
    // No shirt number on either side -> falls to the fuzzy name branch: same
    // surname AND same first initial ("Lionel" -> "l", "L." -> "l") must match.
    const p = pick({ name: 'Lionel Messi', teamCode: 'ARG', position: 'ATT', number: null })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'L. Messi', teamCode: 'ARG', playerNumber: null })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(4)
  })

  it('does NOT match a shared surname when the first initial differs (guards the fuzzy branch)', () => {
    // Same surname "Messi" but different first initial -> fuzzy branch returns false,
    // so the pick scores 0 (sanity guard so the fuzzy test above is not a tautology).
    const p = pick({ name: 'Lionel Messi', teamCode: 'ARG', position: 'ATT', number: null })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'R. Messi', teamCode: 'ARG', playerNumber: null })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(0)
  })

  it('aggregates points across multiple matches in the same round', () => {
    const p = pick({ name: 'Hero', teamCode: 'ARG', position: 'ATT', number: 9 })
    const d1 = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'Hero', teamCode: 'ARG' })],
    })
    const d2 = detail({
      fixtureId: 2,
      home: 'YYY',
      away: 'ARG',
      events: [ev({ type: 'Goal', player: 'Hero', teamCode: 'ARG' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d1, d2))
    expect(r.perPlayer[playerKey(p)].base).toBe(8)
  })

  it('returns base 0 for a player whose team played but who did nothing', () => {
    const p = pick({ name: 'Bench', teamCode: 'ARG', position: 'ATT', number: 9 })
    const d = detail({
      fixtureId: 1,
      home: 'ARG',
      away: 'XXX',
      events: [ev({ type: 'Goal', player: 'Someone Else', teamCode: 'ARG' })],
    })
    const r = scoreRound('QF', single(p), [p], detailsForFrom(d))
    expect(r.perPlayer[playerKey(p)].base).toBe(0)
  })
})

/* -------------------------------------------------------------------------- */
/* scoreRound — empty / boundary inputs                                        */
/* -------------------------------------------------------------------------- */

describe('scoreRound — empty & boundary inputs', () => {
  it('handles an empty squad with no transfers', () => {
    const r = scoreRound('QF', { players: [], captain: null }, [], NONE)
    expect(r.points).toBe(0)
    expect(r.transfersUsed).toBe(0)
    expect(r.paidTransfers).toBe(0)
    expect(r.effectiveCaptain).toBeNull()
    expect(r.perPlayer).toEqual({})
  })

  it('keeps a null nominal captain when there is no captain and nobody featured', () => {
    const p = pick({ name: 'Solo', teamCode: 'ARG', position: 'ATT', number: 9 })
    const r = scoreRound('QF', { players: [p], captain: null }, [p], NONE)
    expect(r.effectiveCaptain).toBeNull()
    expect(r.perPlayer[playerKey(p)].isCaptain).toBe(false)
  })

  it('records the granted freeTransfers in the result for every round', () => {
    const p = pick({ name: 'Solo', teamCode: 'ARG', position: 'ATT', number: 9 })
    const sq: RoundSquad = { players: [p], captain: null }
    expect(scoreRound('R32', sq, [], NONE).freeTransfers).toBe(Infinity)
    expect(scoreRound('R16', sq, [], NONE).freeTransfers).toBe(2)
    expect(scoreRound('QF', sq, [], NONE).freeTransfers).toBe(2)
    expect(scoreRound('SF', sq, [], NONE).freeTransfers).toBe(2)
    expect(scoreRound('FINAL', sq, [], NONE).freeTransfers).toBe(5)
  })
})

/* -------------------------------------------------------------------------- */
/* scoreFantasyTotal                                                           */
/* -------------------------------------------------------------------------- */

describe('scoreFantasyTotal', () => {
  const cap = pick({ name: 'Cap', teamCode: 'ARG', position: 'ATT', number: 9 })
  const other = pick({ name: 'Oth', teamCode: 'BRA', position: 'MID', number: 8 })

  it('sums scoreRound across rounds, deriving detailsFor from koMatches + details by stageToRound', () => {
    // R32 squad: cap scores in the R32 match (stage R32). captain double.
    const r32Match: ScorableMatch = { stage: 'R32', apiFixtureId: 100, homeCode: 'ARG', awayCode: 'XXX' }
    const r16Match: ScorableMatch = { stage: 'R16', apiFixtureId: 200, homeCode: 'ARG', awayCode: 'YYY' }

    const details: Record<number, MatchDetail> = {
      100: detail({
        fixtureId: 100,
        home: 'ARG',
        away: 'XXX',
        events: [ev({ type: 'Goal', player: 'Cap', teamCode: 'ARG' })],
      }),
      200: detail({
        fixtureId: 200,
        home: 'ARG',
        away: 'YYY',
        events: [ev({ type: 'Goal', player: 'Cap', teamCode: 'ARG' })],
      }),
    }

    const fantasy: Partial<Record<Round, RoundSquad>> = {
      R32: { players: [cap, other], captain: playerKey(cap) },
      R16: { players: [cap, other], captain: playerKey(cap) },
    }

    // R32: cap goal 4 *2 = 8, other 0; transfers unlimited (free Infinity) -> +8
    // R16: cap goal 4 *2 = 8, other 0; prev = R32 players (same) -> 0 transfers -> +8
    const total = scoreFantasyTotal(fantasy, [r32Match, r16Match], details)
    expect(total).toBe(16)
  })

  it('uses the PREVIOUS round players as prevPlayers (transfer penalty applies between rounds)', () => {
    // R16 squad differs from R32 by 3 players -> at R16 free=2 -> 1 paid -> -3
    const p1 = pick({ name: 'P1', teamCode: 'ARG', position: 'ATT', number: 1 })
    const p2 = pick({ name: 'P2', teamCode: 'BRA', position: 'ATT', number: 2 })
    const p3 = pick({ name: 'P3', teamCode: 'FRA', position: 'ATT', number: 3 })
    const p4 = pick({ name: 'P4', teamCode: 'GER', position: 'ATT', number: 4 })
    const p5 = pick({ name: 'P5', teamCode: 'ESP', position: 'ATT', number: 5 })

    const fantasy: Partial<Record<Round, RoundSquad>> = {
      R32: { players: [p1, p2], captain: playerKey(p1) },
      R16: { players: [p1, p2, p3, p4, p5], captain: playerKey(p1) },
    }
    // No details -> no live points. R32 free unlimited -> 0. R16: 3 incoming, free 2, 1 paid -> -3.
    const total = scoreFantasyTotal(fantasy, [], {})
    expect(total).toBe(-3)
  })

  it('treats the first round prevPlayers as [] (R32 unlimited absorbs the initial build)', () => {
    const p1 = pick({ name: 'P1', teamCode: 'ARG', position: 'ATT', number: 1 })
    const p2 = pick({ name: 'P2', teamCode: 'BRA', position: 'ATT', number: 2 })
    const fantasy: Partial<Record<Round, RoundSquad>> = {
      R32: { players: [p1, p2], captain: playerKey(p1) },
    }
    expect(scoreFantasyTotal(fantasy, [], {})).toBe(0)
  })

  it('skips rounds that have no saved squad', () => {
    const p1 = pick({ name: 'P1', teamCode: 'ARG', position: 'ATT', number: 1 })
    const fantasy: Partial<Record<Round, RoundSquad>> = {
      // Only a FINAL squad, nothing earlier.
      FINAL: { players: [p1], captain: playerKey(p1) },
    }
    // FINAL free=5, prev = [] (R32..SF absent) -> 1 transfer <= 5 -> 0 penalty -> 0
    expect(scoreFantasyTotal(fantasy, [], {})).toBe(0)
  })

  it('folds F3 and F fixtures both into the FINAL round details', () => {
    const p = pick({ name: 'Star', teamCode: 'ARG', position: 'ATT', number: 9 })
    const fantasy: Partial<Record<Round, RoundSquad>> = {
      FINAL: { players: [p], captain: playerKey(p) },
    }
    // ARG plays the third-place play-off (stage 'F3'); a goal there must count for FINAL.
    const f3: ScorableMatch = { stage: 'F3', apiFixtureId: 900, homeCode: 'ARG', awayCode: 'XXX' }
    const details: Record<number, MatchDetail> = {
      900: detail({
        fixtureId: 900,
        home: 'ARG',
        away: 'XXX',
        events: [ev({ type: 'Goal', player: 'Star', teamCode: 'ARG' })],
      }),
    }
    // captain doubled: 4 * 2 = 8; FINAL free 5, 1 transfer -> 0 penalty
    expect(scoreFantasyTotal(fantasy, [f3], details)).toBe(8)
  })

  it('ignores matches whose fixture id has no detail entry, and matches in other rounds', () => {
    const p = pick({ name: 'Star', teamCode: 'ARG', position: 'ATT', number: 9 })
    const fantasy: Partial<Record<Round, RoundSquad>> = {
      QF: { players: [p], captain: playerKey(p) },
    }
    // A QF match for ARG exists but its detail is missing -> team did not "feature" -> 0
    const qf: ScorableMatch = { stage: 'QF', apiFixtureId: 555, homeCode: 'ARG', awayCode: 'XXX' }
    // also a group-stage match should never map to a round
    const grp: ScorableMatch = { stage: 'group', apiFixtureId: 1, homeCode: 'ARG', awayCode: 'YYY' }
    expect(scoreFantasyTotal(fantasy, [qf, grp], {})).toBe(0)
  })

  it('returns 0 for empty fantasy', () => {
    expect(scoreFantasyTotal({}, [], {})).toBe(0)
  })
})
