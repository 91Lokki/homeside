import { describe, it, expect } from 'vitest'
import {
  scorePick,
  posCat,
  stageToRound,
  isShootoutKick,
  type FantasyPick,
} from '@/domain/fantasy'
import type { MatchDetail, MatchEvent, TeamMatchStats } from '@/lib/api'
import type { Stage, TeamCode } from '@/domain/types'

/* -------------------------------------------------------------------------- */
/* fixture builders — match the real api.ts interfaces exactly                 */
/* -------------------------------------------------------------------------- */

function makeEvent(partial: Partial<MatchEvent>): MatchEvent {
  return {
    minute: partial.minute ?? 10,
    rawTime: partial.rawTime ?? "10'",
    // preserve an explicit null teamCode (??  would coalesce it away)
    teamCode: 'teamCode' in partial ? (partial.teamCode ?? null) : 'ARG',
    type: partial.type ?? 'Goal',
    player: partial.player ?? '',
    playerNumber: partial.playerNumber ?? null,
    assist: partial.assist ?? null,
  }
}

function makeStats(code: TeamCode, partial: Partial<TeamMatchStats> = {}): TeamMatchStats {
  return {
    code,
    goalsFor: partial.goalsFor ?? 0,
    goalsAgainst: partial.goalsAgainst ?? 0,
    cleanSheet: partial.cleanSheet ?? false,
    possession: partial.possession ?? null,
    shots: partial.shots ?? null,
    shotsOnTarget: partial.shotsOnTarget ?? null,
    passPct: partial.passPct ?? null,
    crosses: partial.crosses ?? null,
    corners: partial.corners ?? null,
    tackles: partial.tackles ?? null,
    interceptions: partial.interceptions ?? null,
    clearances: partial.clearances ?? null,
    fouls: partial.fouls ?? null,
    yellow: partial.yellow ?? null,
    red: partial.red ?? null,
    gkSaves: partial.gkSaves ?? null,
  }
}

function makeDetail(partial: Partial<MatchDetail>): MatchDetail {
  return {
    fixtureId: partial.fixtureId ?? 1,
    home: partial.home ?? 'ARG',
    away: partial.away ?? 'FRA',
    hadShootout: partial.hadShootout ?? false,
    events: partial.events ?? [],
    teamStats: partial.teamStats ?? {},
  }
}

function makePick(partial: Partial<FantasyPick> = {}): FantasyPick {
  return {
    slot: partial.slot ?? 'ATT',
    name: partial.name ?? 'Lionel Messi',
    teamCode: partial.teamCode ?? 'ARG',
    position: partial.position ?? 'ATT',
    number: partial.number ?? null,
  }
}

/* -------------------------------------------------------------------------- */
/* posCat                                                                      */
/* -------------------------------------------------------------------------- */

describe('posCat', () => {
  it('maps GK roster codes to GK', () => {
    expect(posCat('GK')).toBe('GK')
    expect(posCat('G')).toBe('GK')
    expect(posCat('Goalkeeper')).toBe('GK')
  })
  it('maps D* roster codes to DEF', () => {
    expect(posCat('DF')).toBe('DEF')
    expect(posCat('D')).toBe('DEF')
    expect(posCat('Defender')).toBe('DEF')
  })
  it('maps M* roster codes to MID', () => {
    expect(posCat('MF')).toBe('MID')
    expect(posCat('M')).toBe('MID')
    expect(posCat('Midfielder')).toBe('MID')
  })
  it('maps forwards (FW / anything else) to ATT', () => {
    expect(posCat('FW')).toBe('ATT')
    expect(posCat('Forward')).toBe('ATT')
    expect(posCat('Attacker')).toBe('ATT')
  })
  it('is case-insensitive (lowercase input)', () => {
    expect(posCat('gk')).toBe('GK')
    expect(posCat('df')).toBe('DEF')
    expect(posCat('mf')).toBe('MID')
    expect(posCat('fw')).toBe('ATT')
  })
  it('treats empty / unknown input as ATT (default branch)', () => {
    expect(posCat('')).toBe('ATT')
    expect(posCat('X')).toBe('ATT')
    // @ts-expect-error guard against null at runtime
    expect(posCat(null)).toBe('ATT')
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
  it('maps both final-stage variants (F3 and F) to FINAL', () => {
    expect(stageToRound('F3')).toBe('FINAL')
    expect(stageToRound('F')).toBe('FINAL')
  })
  it('returns null for the group stage', () => {
    expect(stageToRound('group')).toBeNull()
  })
  it('returns null for an unknown stage', () => {
    expect(stageToRound('totally-not-a-stage' as Stage)).toBeNull()
  })
})

/* -------------------------------------------------------------------------- */
/* isShootoutKick                                                              */
/* -------------------------------------------------------------------------- */

describe('isShootoutKick', () => {
  it('is true only when hadShootout AND rawTime matches /^120\\+\\d+$/', () => {
    expect(isShootoutKick('120+1', true)).toBe(true)
    expect(isShootoutKick('120+3', true)).toBe(true)
    expect(isShootoutKick('120+12', true)).toBe(true)
  })
  it('is false when the match did not go to a shootout', () => {
    expect(isShootoutKick('120+1', false)).toBe(false)
  })
  it('is false for ordinary in-play minutes even with a shootout', () => {
    expect(isShootoutKick('23', true)).toBe(false)
    expect(isShootoutKick('118', true)).toBe(false)
    expect(isShootoutKick("90+2", true)).toBe(false)
    expect(isShootoutKick('45+2', true)).toBe(false)
  })
  it('requires at least one digit after 120+', () => {
    expect(isShootoutKick('120+', true)).toBe(false)
    expect(isShootoutKick('120', true)).toBe(false)
  })
  it('trims surrounding whitespace before matching', () => {
    expect(isShootoutKick('  120+2  ', true)).toBe(true)
  })
  it('rejects extra trailing content (anchored regex)', () => {
    expect(isShootoutKick('120+2 pen', true)).toBe(false)
  })
  it('treats empty / falsy rawTime as not-a-kick', () => {
    expect(isShootoutKick('', true)).toBe(false)
    // @ts-expect-error runtime guard for null clock
    expect(isShootoutKick(null, true)).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — goals by position                                               */
/* -------------------------------------------------------------------------- */

describe('scorePick — goals by position', () => {
  const goalEvent = (over: Partial<MatchEvent> = {}) =>
    makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10, ...over })

  it('GK goal scores +6', () => {
    const pick = makePick({ position: 'GK', number: 10 })
    const detail = makeDetail({ events: [goalEvent()] })
    expect(scorePick(pick, [detail]).points).toBe(6)
  })
  it('DEF goal scores +6', () => {
    const pick = makePick({ position: 'DEF', number: 10 })
    const detail = makeDetail({ events: [goalEvent()] })
    expect(scorePick(pick, [detail]).points).toBe(6)
  })
  it('MID goal scores +5', () => {
    const pick = makePick({ position: 'MID', number: 10 })
    const detail = makeDetail({ events: [goalEvent()] })
    expect(scorePick(pick, [detail]).points).toBe(5)
  })
  it('ATT goal scores +4', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({ events: [goalEvent()] })
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('records a "Goal +N" line and the fixture id', () => {
    const pick = makePick({ position: 'MID', number: 10 })
    const detail = makeDetail({ fixtureId: 42, events: [goalEvent()] })
    const res = scorePick(pick, [detail])
    expect(res.matches).toHaveLength(1)
    expect(res.matches[0].fixtureId).toBe(42)
    expect(res.matches[0].points).toBe(5)
    expect(res.matches[0].lines).toContain('Goal +5')
  })
  it('two goals in one match stack', () => {
    const pick = makePick({ position: 'ATT', number: 9 })
    const detail = makeDetail({
      events: [
        goalEvent({ playerNumber: 9, minute: 12 }),
        goalEvent({ playerNumber: 9, minute: 70 }),
      ],
    })
    expect(scorePick(pick, [detail]).points).toBe(8)
  })
  it('records every team in-play goal in teamGoalScorers regardless of who scored', () => {
    const pick = makePick({ position: 'ATT', number: 99 }) // not the scorer
    const detail = makeDetail({
      events: [
        goalEvent({ playerNumber: 10, player: 'Lionel Messi' }),
        goalEvent({ playerNumber: 11, player: 'Angel Di Maria' }),
      ],
    })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(0)
    expect(res.teamGoalScorers).toEqual(['Lionel Messi', 'Angel Di Maria'])
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — assists                                                         */
/* -------------------------------------------------------------------------- */

describe('scorePick — assists', () => {
  it('credits +3 to the assister on an in-play goal', () => {
    const pick = makePick({ position: 'MID', name: 'Angel Di Maria', number: 11 })
    const detail = makeDetail({
      events: [
        makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10, assist: 'Angel Di Maria' }),
      ],
    })
    const res = scorePick(pick, [detail])
    // assist matches by name (number ignored for assist), goal scorer does not match this pick
    expect(res.points).toBe(3)
    expect(res.matches[0].lines).toContain('Assist +3')
  })
  it('a player who both scores and assists on the same goal would get both (different events)', () => {
    // scorer and assister credited within the SAME event when both match the pick
    const pick = makePick({ position: 'MID', name: 'Lionel Messi', number: 10 })
    const detail = makeDetail({
      events: [
        makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10, assist: 'Lionel Messi' }),
      ],
    })
    const res = scorePick(pick, [detail])
    // Goal +5 and Assist +3 = 8 (contrived but exercises both branches in one event)
    expect(res.points).toBe(8)
  })
  it('no assist credit when the assist field is null', () => {
    const pick = makePick({ position: 'MID', name: 'Angel Di Maria', number: 11 })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10, assist: null })],
    })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — clean sheet                                                     */
/* -------------------------------------------------------------------------- */

describe('scorePick — clean sheet', () => {
  const csDetail = () => makeDetail({ teamStats: { ARG: makeStats('ARG', { cleanSheet: true }) } })

  it('GK gets +4 for a clean sheet', () => {
    const res = scorePick(makePick({ position: 'GK' }), [csDetail()])
    expect(res.points).toBe(4)
    expect(res.matches[0].lines).toContain('Clean sheet +4')
  })
  it('DEF gets +4 for a clean sheet', () => {
    expect(scorePick(makePick({ position: 'DEF' }), [csDetail()]).points).toBe(4)
  })
  it('MID gets +1 for a clean sheet', () => {
    const res = scorePick(makePick({ position: 'MID' }), [csDetail()])
    expect(res.points).toBe(1)
    expect(res.matches[0].lines).toContain('Clean sheet +1')
  })
  it('ATT gets 0 and no clean-sheet line (cs not > 0)', () => {
    const res = scorePick(makePick({ position: 'ATT' }), [csDetail()])
    expect(res.points).toBe(0)
    expect(res.matches).toHaveLength(0)
  })
  it('no clean-sheet points when cleanSheet is false', () => {
    const detail = makeDetail({ teamStats: { ARG: makeStats('ARG', { cleanSheet: false }) } })
    expect(scorePick(makePick({ position: 'DEF' }), [detail]).points).toBe(0)
  })
  it('no clean-sheet points when the team has no teamStats entry', () => {
    const detail = makeDetail({ teamStats: {} })
    expect(scorePick(makePick({ position: 'GK' }), [detail]).points).toBe(0)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — GK saves                                                        */
/* -------------------------------------------------------------------------- */

describe('scorePick — GK saves', () => {
  const savesDetail = (gkSaves: number | null) =>
    makeDetail({ teamStats: { ARG: makeStats('ARG', { gkSaves }) } })

  it('awards +1 per 3 saves (floor)', () => {
    expect(scorePick(makePick({ position: 'GK' }), [savesDetail(3)]).points).toBe(1)
    expect(scorePick(makePick({ position: 'GK' }), [savesDetail(6)]).points).toBe(2)
    expect(scorePick(makePick({ position: 'GK' }), [savesDetail(8)]).points).toBe(2) // floor(8/3)
    expect(scorePick(makePick({ position: 'GK' }), [savesDetail(9)]).points).toBe(3)
  })
  it('awards 0 (and no line) below 3 saves', () => {
    const res = scorePick(makePick({ position: 'GK' }), [savesDetail(2)])
    expect(res.points).toBe(0)
    expect(res.matches).toHaveLength(0)
  })
  it('records the raw save count in the line', () => {
    const res = scorePick(makePick({ position: 'GK' }), [savesDetail(7)])
    expect(res.matches[0].lines).toContain('Saves +2 (7)')
  })
  it('does NOT award save points to non-GK positions', () => {
    expect(scorePick(makePick({ position: 'DEF' }), [savesDetail(9)]).points).toBe(0)
    expect(scorePick(makePick({ position: 'MID' }), [savesDetail(9)]).points).toBe(0)
    expect(scorePick(makePick({ position: 'ATT' }), [savesDetail(9)]).points).toBe(0)
  })
  it('handles null gkSaves gracefully (no points, no throw)', () => {
    expect(scorePick(makePick({ position: 'GK' }), [savesDetail(null)]).points).toBe(0)
  })
  it('GK clean sheet and saves stack', () => {
    const detail = makeDetail({ teamStats: { ARG: makeStats('ARG', { cleanSheet: true, gkSaves: 6 }) } })
    // +4 clean sheet, +2 saves
    expect(scorePick(makePick({ position: 'GK' }), [detail]).points).toBe(6)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — cards & own goals                                               */
/* -------------------------------------------------------------------------- */

describe('scorePick — cards and own goals', () => {
  it('yellow card is -1', () => {
    const pick = makePick({ number: 5 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Yellow Card', teamCode: 'ARG', playerNumber: 5 })] })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(-1)
    expect(res.matches[0].lines).toContain('Yellow -1')
  })
  it('red card is -3', () => {
    const pick = makePick({ number: 5 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Red Card', teamCode: 'ARG', playerNumber: 5 })] })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(-3)
    expect(res.matches[0].lines).toContain('Red -3')
  })
  it('own goal is -2', () => {
    const pick = makePick({ number: 5 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Own Goal', teamCode: 'ARG', playerNumber: 5 })] })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(-2)
    expect(res.matches[0].lines).toContain('Own goal -2')
  })
  it('an own goal does NOT count toward teamGoalScorers (not an in-play goal)', () => {
    const pick = makePick({ number: 99 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Own Goal', teamCode: 'ARG', playerNumber: 5 })] })
    expect(scorePick(pick, [detail]).teamGoalScorers).toEqual([])
  })
  it('a card for another player on the team does not affect this pick', () => {
    const pick = makePick({ number: 5 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Yellow Card', teamCode: 'ARG', playerNumber: 7 })] })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('goal, yellow and own goal all stack for one player', () => {
    const pick = makePick({ position: 'DEF', number: 5 })
    const detail = makeDetail({
      events: [
        makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 5 }),
        makeEvent({ type: 'Yellow Card', teamCode: 'ARG', playerNumber: 5 }),
        makeEvent({ type: 'Own Goal', teamCode: 'ARG', playerNumber: 5 }),
      ],
    })
    // +6 goal, -1 yellow, -2 own goal
    expect(scorePick(pick, [detail]).points).toBe(3)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — in-play penalties                                               */
/* -------------------------------------------------------------------------- */

describe('scorePick — in-play penalties', () => {
  it('an in-play penalty scored (type "penalty", not a shootout) gives goal points by position', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({
      hadShootout: false,
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', playerNumber: 10, rawTime: "55'" })],
    })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(4) // ATT goal points
    expect(res.matches[0].lines).toContain('Goal +4')
  })
  it('an in-play penalty (MID) gives +5', () => {
    const pick = makePick({ position: 'MID', number: 10 })
    const detail = makeDetail({
      hadShootout: false,
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', playerNumber: 10 })],
    })
    expect(scorePick(pick, [detail]).points).toBe(5)
  })
  it('an in-play penalty counts toward teamGoalScorers', () => {
    const pick = makePick({ number: 99 })
    const detail = makeDetail({
      hadShootout: false,
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10 })],
    })
    expect(scorePick(pick, [detail]).teamGoalScorers).toEqual(['Lionel Messi'])
  })
  it('a missed in-play penalty is -2', () => {
    const pick = makePick({ number: 10 })
    const detail = makeDetail({
      hadShootout: false,
      events: [makeEvent({ type: 'missed penalty', teamCode: 'ARG', playerNumber: 10, rawTime: "55'" })],
    })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(-2)
    expect(res.matches[0].lines).toContain('Penalty miss -2')
  })
  it('a missed in-play penalty is NOT a goal scorer entry', () => {
    const pick = makePick({ number: 10 })
    const detail = makeDetail({
      hadShootout: false,
      events: [makeEvent({ type: 'missed penalty', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10 })],
    })
    expect(scorePick(pick, [detail]).teamGoalScorers).toEqual([])
  })
  it('an in-play penalty assist is credited', () => {
    const pick = makePick({ position: 'MID', name: 'Angel Di Maria', number: 11 })
    const detail = makeDetail({
      hadShootout: false,
      events: [
        makeEvent({ type: 'penalty', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 10, assist: 'Angel Di Maria' }),
      ],
    })
    expect(scorePick(pick, [detail]).points).toBe(3)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — shootout kicks                                                  */
/* -------------------------------------------------------------------------- */

describe('scorePick — shootout kicks', () => {
  it('a scored shootout kick gives +2 (not goal points)', () => {
    const pick = makePick({ position: 'GK', number: 1 }) // even a GK only gets +2, not +6
    const detail = makeDetail({
      hadShootout: true,
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', playerNumber: 1, rawTime: '120+1' })],
    })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(2)
    expect(res.matches[0].lines).toContain('Shootout goal +2')
  })
  it('a scored shootout kick does NOT count as an in-play goal (not in teamGoalScorers)', () => {
    const pick = makePick({ number: 99 })
    const detail = makeDetail({
      hadShootout: true,
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', player: 'Messi', playerNumber: 10, rawTime: '120+1' })],
    })
    expect(scorePick(pick, [detail]).teamGoalScorers).toEqual([])
  })
  it('a missed shootout kick is -1', () => {
    const pick = makePick({ number: 7 })
    const detail = makeDetail({
      hadShootout: true,
      events: [makeEvent({ type: 'missed penalty', teamCode: 'ARG', playerNumber: 7, rawTime: '120+3' })],
    })
    const res = scorePick(pick, [detail])
    expect(res.points).toBe(-1)
    expect(res.matches[0].lines).toContain('Shootout miss -1')
  })
  it('without hadShootout, a 120+N penalty is treated as in-play (goal points)', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({
      hadShootout: false, // not a shootout match
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', playerNumber: 10, rawTime: '120+1' })],
    })
    // isShootoutKick false → in-play goal → +4
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('shootout kicks never touch clean sheet (3-3 final → no clean sheet for either side)', () => {
    // mirrors the real 2022-final fixture: shootout kicks scored, no clean sheet
    const pick = makePick({ position: 'DEF', number: 13 })
    const detail = makeDetail({
      hadShootout: true,
      teamStats: { ARG: makeStats('ARG', { goalsFor: 3, goalsAgainst: 3, cleanSheet: false }) },
      events: [makeEvent({ type: 'penalty', teamCode: 'ARG', playerNumber: 5, rawTime: '120+1' })],
    })
    const res = scorePick(pick, [detail])
    // DEF did not take the kick (number 13 ≠ 5) → 0; no clean sheet → still 0
    expect(res.points).toBe(0)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — team filtering                                                  */
/* -------------------------------------------------------------------------- */

describe('scorePick — only the pick\'s own team counts', () => {
  it('ignores events whose teamCode is the opponent', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({
      home: 'ARG',
      away: 'FRA',
      events: [makeEvent({ type: 'Goal', teamCode: 'FRA', playerNumber: 10 })], // opponent scored
    })
    expect(scorePick(pick, [detail]).points).toBe(0)
    expect(scorePick(pick, [detail]).teamGoalScorers).toEqual([])
  })
  it('ignores events with a null teamCode', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Goal', teamCode: null, playerNumber: 10 })] })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('skips a match the pick\'s team did not play in entirely', () => {
    const pick = makePick({ teamCode: 'ARG', position: 'ATT', number: 10 })
    const detail = makeDetail({
      home: 'BRA',
      away: 'FRA',
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10 })], // stray ARG event in a non-ARG match
      teamStats: { ARG: makeStats('ARG', { cleanSheet: true }) },
    })
    // match is skipped before events are read because neither home nor away is ARG
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('counts the pick when their team is the away side', () => {
    const pick = makePick({ teamCode: 'FRA', position: 'ATT', number: 10 })
    const detail = makeDetail({
      home: 'ARG',
      away: 'FRA',
      events: [makeEvent({ type: 'Goal', teamCode: 'FRA', playerNumber: 10 })],
    })
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — name / number matching                                          */
/* -------------------------------------------------------------------------- */

describe('scorePick — player matching', () => {
  it('matches by shirt number when both event and pick have one (name irrelevant)', () => {
    const pick = makePick({ position: 'ATT', name: 'Completely Different', number: 9 })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Someone Else', playerNumber: 9 })],
    })
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('does NOT match when both have numbers but they differ (even if names match)', () => {
    const pick = makePick({ position: 'ATT', name: 'Lionel Messi', number: 10 })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: 7 })],
    })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('falls back to exact normalized name when a number is missing', () => {
    const pick = makePick({ position: 'ATT', name: 'Kylian Mbappé', number: null })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Kylian Mbappe', playerNumber: null })],
    })
    // accent-insensitive normalized match
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('matches on surname + first-initial when full names differ', () => {
    const pick = makePick({ position: 'MID', name: 'B. Silva', number: null })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Bernardo Silva', playerNumber: null })],
    })
    // surname "silva" matches and first initial "b" === "b"
    expect(scorePick(pick, [detail]).points).toBe(5)
  })
  it('does not match on same surname but different first-initial', () => {
    const pick = makePick({ position: 'MID', name: 'Thiago Silva', number: null })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Bernardo Silva', playerNumber: null })],
    })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('returns false when one of the names is empty', () => {
    const pick = makePick({ position: 'ATT', name: '', number: null })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: null })],
    })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('falls back to name when the EVENT has no number but the pick does', () => {
    // pick.number set, but event.playerNumber null → number branch skipped, name used
    const pick = makePick({ position: 'ATT', name: 'Lionel Messi', number: 10 })
    const detail = makeDetail({
      events: [makeEvent({ type: 'Goal', teamCode: 'ARG', player: 'Lionel Messi', playerNumber: null })],
    })
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('assist matching ignores numbers entirely (name-only)', () => {
    // pick has a number, but assist match always passes null → name match required
    const pick = makePick({ position: 'MID', name: 'Angel Di Maria', number: 11 })
    const detail = makeDetail({
      events: [
        makeEvent({
          type: 'Goal',
          teamCode: 'ARG',
          player: 'Lionel Messi',
          playerNumber: 10,
          assist: 'Angel Di Maria',
        }),
      ],
    })
    expect(scorePick(pick, [detail]).points).toBe(3)
  })
})

/* -------------------------------------------------------------------------- */
/* scorePick — aggregation across matches & edge cases                         */
/* -------------------------------------------------------------------------- */

describe('scorePick — multi-match aggregation and edges', () => {
  it('sums points across multiple matches in the round', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const d1 = makeDetail({ fixtureId: 1, events: [makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10 })] })
    const d2 = makeDetail({ fixtureId: 2, events: [makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10 })] })
    const res = scorePick(pick, [d1, d2])
    expect(res.points).toBe(8)
    expect(res.matches).toHaveLength(2)
  })
  it('only records a match entry when something happened (lines non-empty)', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const scored = makeDetail({ fixtureId: 1, events: [makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10 })] })
    const blank = makeDetail({ fixtureId: 2, events: [] })
    const res = scorePick(pick, [scored, blank])
    expect(res.matches).toHaveLength(1)
    expect(res.matches[0].fixtureId).toBe(1)
  })
  it('returns the zero result for empty details', () => {
    const res = scorePick(makePick(), [])
    expect(res).toEqual({ points: 0, matches: [], teamGoalScorers: [] })
  })
  it('does not crash and reports points when there are no events at all', () => {
    const res = scorePick(makePick(), [makeDetail({ events: [] })])
    expect(res.points).toBe(0)
    expect(res.matches).toEqual([])
  })
  it('event type matching is case-insensitive ("GOAL" works)', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({ events: [makeEvent({ type: 'GOAL', teamCode: 'ARG', playerNumber: 10 })] })
    expect(scorePick(pick, [detail]).points).toBe(4)
  })
  it('a substitution event scores nothing', () => {
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Substitution', teamCode: 'ARG', playerNumber: 10 })] })
    expect(scorePick(pick, [detail]).points).toBe(0)
  })
  it('captain doubling is NOT applied by scorePick (raw base points only)', () => {
    // scorePick has no concept of captaincy; a goal is the flat position value.
    const pick = makePick({ position: 'ATT', number: 10 })
    const detail = makeDetail({ events: [makeEvent({ type: 'Goal', teamCode: 'ARG', playerNumber: 10 })] })
    expect(scorePick(pick, [detail]).points).toBe(4) // not 8
  })
})
