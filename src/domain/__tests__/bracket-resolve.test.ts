import { describe, it, expect } from 'vitest'
import { resolveBracket } from '@/domain/bracket'
import { computeGroupStandings } from '@/domain/record'
import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import type {
  BracketMatch,
  Match,
  ResolvedBracketMatch,
  Team,
} from '@/domain/types'

/* -------------------------------------------------------------------------- */
/* Fixture builders                                                            */
/* -------------------------------------------------------------------------- */

/** Build a finished group Match between two team codes. */
function groupMatch(
  group: string,
  homeCode: string,
  awayCode: string,
  homeScore: number,
  awayScore: number,
  kickoff: string,
): Match {
  return {
    id: `g-${group}-${homeCode}-${awayCode}`,
    stage: 'group',
    group,
    homeCode,
    awayCode,
    kickoff,
    status: 'finished',
    homeScore,
    awayScore,
  }
}

/** Build a finished knockout Match between two team codes. */
function koMatch(
  homeCode: string,
  awayCode: string,
  homeScore: number,
  awayScore: number,
  opts: { stage?: Match['stage']; pens?: { home: number; away: number }; id?: string } = {},
): Match {
  return {
    id: opts.id ?? `ko-${homeCode}-${awayCode}`,
    stage: opts.stage ?? 'R32',
    homeCode,
    awayCode,
    kickoff: '2026-07-04T18:00:00Z',
    status: 'finished',
    homeScore,
    awayScore,
    pens: opts.pens,
  }
}

/**
 * A complete round-robin for one group (6 matches) with deterministic results.
 * Returns matches plus the expected final ordering [winner, runnerUp, third, last].
 *
 * Group A (MEX, RSA, KOR, CZE):
 *   MEX 2-0 RSA | KOR 1-1 CZE | MEX 1-0 KOR | RSA 0-0 CZE | MEX 3-1 CZE | RSA 2-1 KOR
 *   => MEX 9pts, RSA 4pts(gd -1), CZE 2pts(gd -2), KOR 1pt
 */
function completeGroupA(): Match[] {
  return [
    groupMatch('A', 'MEX', 'RSA', 2, 0, '2026-06-11T16:00:00Z'),
    groupMatch('A', 'KOR', 'CZE', 1, 1, '2026-06-11T19:00:00Z'),
    groupMatch('A', 'MEX', 'KOR', 1, 0, '2026-06-15T16:00:00Z'),
    groupMatch('A', 'RSA', 'CZE', 0, 0, '2026-06-15T19:00:00Z'),
    groupMatch('A', 'MEX', 'CZE', 3, 1, '2026-06-19T16:00:00Z'),
    groupMatch('A', 'RSA', 'KOR', 2, 1, '2026-06-19T19:00:00Z'),
  ]
}

/**
 * Group B (CAN, BIH, QAT, SUI):
 *   CAN beats everyone, BIH second, QAT third, SUI last.
 *   => CAN 9pts, BIH 6pts, QAT 3pts, SUI 0pts
 */
function completeGroupB(): Match[] {
  return [
    groupMatch('B', 'CAN', 'BIH', 1, 0, '2026-06-12T16:00:00Z'),
    groupMatch('B', 'QAT', 'SUI', 1, 0, '2026-06-12T19:00:00Z'),
    groupMatch('B', 'CAN', 'QAT', 2, 0, '2026-06-16T16:00:00Z'),
    groupMatch('B', 'BIH', 'SUI', 1, 0, '2026-06-16T19:00:00Z'),
    groupMatch('B', 'CAN', 'SUI', 3, 0, '2026-06-20T16:00:00Z'),
    groupMatch('B', 'BIH', 'QAT', 1, 0, '2026-06-20T19:00:00Z'),
  ]
}

const byNo = (resolved: ResolvedBracketMatch[], no: number) =>
  resolved.find((m) => m.matchNo === no)!

/* -------------------------------------------------------------------------- */
/* Empty input — everything unresolved & scheduled                            */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — empty matches', () => {
  const resolved = resolveBracket(BRACKET, TEAMS, [])

  it('returns one resolved entry per bracket match', () => {
    expect(resolved).toHaveLength(BRACKET.length)
  })

  it('returns matches sorted ascending by matchNo', () => {
    const nos = resolved.map((m) => m.matchNo)
    const sorted = [...nos].sort((a, b) => a - b)
    expect(nos).toEqual(sorted)
    expect(resolved[0].matchNo).toBe(73)
    expect(resolved[resolved.length - 1].matchNo).toBe(104)
  })

  it('leaves every group-derived R32 slot unresolved (null occupants)', () => {
    for (const m of resolved.filter((r) => r.stage === 'R32')) {
      expect(m.homeCode).toBeNull()
      expect(m.awayCode).toBeNull()
    }
  })

  it('leaves every knockout slot unresolved (null occupants)', () => {
    for (const m of resolved) {
      expect(m.homeCode).toBeNull()
      expect(m.awayCode).toBeNull()
    }
  })

  it('marks every match as scheduled with null scores and null winner', () => {
    for (const m of resolved) {
      expect(m.status).toBe('scheduled')
      expect(m.homeScore).toBeNull()
      expect(m.awayScore).toBeNull()
      expect(m.winnerCode).toBeNull()
      expect(m.pens).toBeUndefined()
    }
  })

  it('preserves the static bracket definition fields (stage, label, venue)', () => {
    const m73 = byNo(resolved, 73)
    expect(m73.stage).toBe('R32')
    expect(m73.home.label).toBe('Runner-up A')
    expect(m73.away.label).toBe('Runner-up B')
    expect(m73.venue).toBe('SoFi Stadium')
    // the source wiring is carried through untouched
    expect(m73.home.source).toEqual({ kind: 'runnerUp', group: 'A' })
  })
})

/* -------------------------------------------------------------------------- */
/* Shape of ResolvedBracketMatch                                              */
/* -------------------------------------------------------------------------- */

describe('ResolvedBracketMatch shape', () => {
  it('exposes the documented fields with correct types', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, [])
    const m = byNo(resolved, 73)
    expect(m).toMatchObject({
      matchNo: 73,
      stage: 'R32',
      homeCode: null,
      awayCode: null,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      winnerCode: null,
    })
    expect(Object.prototype.hasOwnProperty.call(m, 'home')).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(m, 'away')).toBe(true)
  })
})

/* -------------------------------------------------------------------------- */
/* Group completion → R32 winner / runnerUp resolution                        */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — group completion resolves R32 slots', () => {
  it('does NOT resolve winner/runnerUp until the group is complete (< 6 finished)', () => {
    // Only 5 of Group A's 6 matches finished — group is incomplete.
    const partial = completeGroupA().slice(0, 5)
    const resolved = resolveBracket(BRACKET, TEAMS, partial)
    // match 79 home = winner A, match 73 home = runner-up A
    expect(byNo(resolved, 79).homeCode).toBeNull()
    expect(byNo(resolved, 73).homeCode).toBeNull()
  })

  it('resolves winner A into the winner-A slot once Group A completes', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, completeGroupA())
    // match 79 home = Winner A  → MEX
    const m79 = byNo(resolved, 79)
    expect(m79.home.source).toEqual({ kind: 'winner', group: 'A' })
    expect(m79.homeCode).toBe('MEX')
  })

  it('resolves runner-up A into the runner-up-A slot once Group A completes', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, completeGroupA())
    // match 73 home = Runner-up A → RSA
    const m73 = byNo(resolved, 73)
    expect(m73.home.source).toEqual({ kind: 'runnerUp', group: 'A' })
    expect(m73.homeCode).toBe('RSA')
  })

  it('a single completed group does not resolve a different group\'s slot', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, completeGroupA())
    // match 73 away = Runner-up B → still null (Group B not played)
    expect(byNo(resolved, 73).away.source).toEqual({ kind: 'runnerUp', group: 'B' })
    expect(byNo(resolved, 73).awayCode).toBeNull()
    // match 74 home = Winner E → null
    expect(byNo(resolved, 74).homeCode).toBeNull()
  })

  it('resolves both occupants of an R32 match when both groups complete', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, [
      ...completeGroupA(),
      ...completeGroupB(),
    ])
    // match 73 = Runner-up A (RSA) vs Runner-up B (BIH)
    const m73 = byNo(resolved, 73)
    expect(m73.homeCode).toBe('RSA')
    expect(m73.awayCode).toBe('BIH')
    // with no finished KO match attached, it stays scheduled / no winner
    expect(m73.status).toBe('scheduled')
    expect(m73.winnerCode).toBeNull()
    expect(m73.homeScore).toBeNull()
    expect(m73.awayScore).toBeNull()
  })

  it('does NOT assign a third-placed team until EVERY group is complete', () => {
    // Group A complete, but no other group → third slots stay null.
    const resolved = resolveBracket(BRACKET, TEAMS, completeGroupA())
    // match 79 away = third slot (3rd C/E/F/H/I)
    expect(byNo(resolved, 79).away.source).toMatchObject({ kind: 'third' })
    expect(byNo(resolved, 79).awayCode).toBeNull()
  })
})

/* -------------------------------------------------------------------------- */
/* Finished KO result → attach + propagate (using the real bracket)           */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — finished KO result attaches & propagates winner', () => {
  // Complete Groups A & B so match 73 = RSA (R/U A) vs BIH (R/U B) is fully seeded.
  // Match 73's winner feeds match 90 (R16) home slot (matchWinner 73).
  const groups = [...completeGroupA(), ...completeGroupB()]

  it('attaches a finished KO result to the matching bracket match (home-orientation)', () => {
    const ko = koMatch('RSA', 'BIH', 3, 1) // home==RSA matches slot home
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, ko])
    const m73 = byNo(resolved, 73)
    expect(m73.status).toBe('finished')
    expect(m73.homeCode).toBe('RSA')
    expect(m73.awayCode).toBe('BIH')
    expect(m73.homeScore).toBe(3)
    expect(m73.awayScore).toBe(1)
    expect(m73.winnerCode).toBe('RSA')
  })

  it('flips scores when the KO match orientation is reversed vs the slot', () => {
    // KO match has BIH at home, RSA away; slot home is RSA → scores must flip.
    const ko = koMatch('BIH', 'RSA', 1, 3)
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, ko])
    const m73 = byNo(resolved, 73)
    expect(m73.homeCode).toBe('RSA')
    expect(m73.awayCode).toBe('BIH')
    // RSA (slot home) actually scored 3, BIH 1 → flipped back to slot orientation
    expect(m73.homeScore).toBe(3)
    expect(m73.awayScore).toBe(1)
    expect(m73.winnerCode).toBe('RSA')
  })

  it('decides a drawn KO match by penalties and folds pens into the slot', () => {
    const ko = koMatch('RSA', 'BIH', 1, 1, { pens: { home: 4, away: 2 } })
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, ko])
    const m73 = byNo(resolved, 73)
    expect(m73.status).toBe('finished')
    expect(m73.homeScore).toBe(1)
    expect(m73.awayScore).toBe(1)
    expect(m73.pens).toEqual({ home: 4, away: 2 })
    expect(m73.winnerCode).toBe('RSA') // won on pens
  })

  it('flips penalty scores too when KO orientation is reversed', () => {
    // BIH home, RSA away; BIH wins shootout. Slot home is RSA → pens flip.
    const ko = koMatch('BIH', 'RSA', 0, 0, { pens: { home: 5, away: 3 } })
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, ko])
    const m73 = byNo(resolved, 73)
    expect(m73.homeCode).toBe('RSA')
    expect(m73.awayCode).toBe('BIH')
    // pens flipped to slot orientation: RSA(home)=3, BIH(away)=5
    expect(m73.pens).toEqual({ home: 3, away: 5 })
    expect(m73.winnerCode).toBe('BIH') // BIH won the shootout
  })

  it('propagates the KO winner into the next matchWinner slot (73 → 90 home)', () => {
    const ko = koMatch('RSA', 'BIH', 2, 0)
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, ko])
    const m90 = byNo(resolved, 90)
    // match 90 home source = matchWinner of 73
    expect(m90.home.source).toEqual({ kind: 'matchWinner', matchNo: 73 })
    expect(m90.homeCode).toBe('RSA')
    // away (matchWinner 75) is not yet decided
    expect(m90.awayCode).toBeNull()
    // no KO result attached to 90 yet → scheduled
    expect(m90.status).toBe('scheduled')
    expect(m90.winnerCode).toBeNull()
  })

  it('does not attach a KO result whose occupants are unresolved', () => {
    // Provide a KO match for two teams that are not yet seeded into any slot
    // (groups not completed) → nothing to attach to.
    const ko = koMatch('RSA', 'BIH', 2, 0)
    const resolved = resolveBracket(BRACKET, TEAMS, [ko]) // no group data
    const m73 = byNo(resolved, 73)
    expect(m73.homeCode).toBeNull()
    expect(m73.awayCode).toBeNull()
    expect(m73.status).toBe('scheduled')
  })

  it('does not attach a non-finished KO match', () => {
    const live: Match = {
      ...koMatch('RSA', 'BIH', 1, 0),
      status: 'live',
    }
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, live])
    const m73 = byNo(resolved, 73)
    expect(m73.status).toBe('scheduled')
    expect(m73.homeScore).toBeNull()
    expect(m73.winnerCode).toBeNull()
  })

  it('a finished KO ending level with NO penalties yields a null winner (no propagation)', () => {
    // 1-1 with no shootout → resultFor returns 'D' → winnerCode stays null. The
    // match is still recorded as finished with its scores, but nothing advances.
    const drawn: Match = {
      ...koMatch('RSA', 'BIH', 1, 1), // equal scores, opts.pens omitted → no pens
    }
    expect(drawn.pens).toBeUndefined()
    const resolved = resolveBracket(BRACKET, TEAMS, [...groups, drawn])
    const m73 = byNo(resolved, 73)
    expect(m73.status).toBe('finished')
    expect(m73.homeScore).toBe(1)
    expect(m73.awayScore).toBe(1)
    expect(m73.pens).toBeUndefined()
    expect(m73.winnerCode).toBeNull() // a draw with no shootout has no winner
    // and because there is no winner, the downstream matchWinner slot (90 home)
    // stays empty — the bracket does not advance an undecided tie.
    const m90 = byNo(resolved, 90)
    expect(m90.home.source).toEqual({ kind: 'matchWinner', matchNo: 73 })
    expect(m90.homeCode).toBeNull()
    expect(m90.status).toBe('scheduled')
  })
})

/* -------------------------------------------------------------------------- */
/* Third-place play-off — matchLoser wiring through the REAL bracket            */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — real bracket third-place play-off (match 103)', () => {
  // Match 103 (F3) is wired Loser(M101) vs Loser(M102) — the two semi-final
  // losers. Drive the real bracket from completed groups all the way through the
  // semis, then assert the two SF losers land in match 103.
  const groupIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  /** Complete a 4-team group so its four real team codes finish strictly 1st..4th. */
  function fullGroup(group: string, order: [string, string, string, string], topGf: number): Match[] {
    const [a, b, c, d] = order
    return [
      groupMatch(group, a, b, topGf, 0, `${group}-1`),
      groupMatch(group, a, c, 1, 0, `${group}-2`),
      groupMatch(group, a, d, 1, 0, `${group}-3`),
      groupMatch(group, b, c, 1, 0, `${group}-4`),
      groupMatch(group, b, d, 1, 0, `${group}-5`),
      groupMatch(group, c, d, 1, 0, `${group}-6`),
    ]
  }
  function codesFor(g: string): [string, string, string, string] {
    const cs = TEAMS.filter((t) => t.group === g).map((t) => t.code)
    return [cs[0], cs[1], cs[2], cs[3]]
  }

  /**
   * Seed every group, then play out R32 → R16 → QF → SF by, for each match in a
   * round, resolving the bracket and letting the HOME occupant win 2-0. Returns
   * the full match list (groups + finished knockouts up to and including the SFs).
   */
  function driveToSemiFinals(): Match[] {
    const matches: Match[] = groupIds.flatMap((g, i) => fullGroup(g, codesFor(g), 2 + (i % 5)))
    const rounds: number[][] = [
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88], // R32
      [89, 90, 91, 92, 93, 94, 95, 96], // R16
      [97, 98, 99, 100], // QF
      [101, 102], // SF
    ]
    for (const round of rounds) {
      const resolved = resolveBracket(BRACKET, TEAMS, matches)
      for (const no of round) {
        const m = byNo(resolved, no)
        // every match in this round must be fully seeded before we play it
        expect(m.homeCode).not.toBeNull()
        expect(m.awayCode).not.toBeNull()
        matches.push(koMatch(m.homeCode!, m.awayCode!, 2, 0, { stage: m.stage }))
      }
    }
    return matches
  }

  it('puts the two semi-final losers into match 103 (home=Loser M101, away=Loser M102)', () => {
    const matches = driveToSemiFinals()
    const resolved = resolveBracket(BRACKET, TEAMS, matches)

    const m101 = byNo(resolved, 101)
    const m102 = byNo(resolved, 102)
    // With the home side winning each SF, the losers are the away occupants.
    expect(m101.status).toBe('finished')
    expect(m102.status).toBe('finished')
    const loser101 = m101.homeCode === m101.winnerCode ? m101.awayCode : m101.homeCode
    const loser102 = m102.homeCode === m102.winnerCode ? m102.awayCode : m102.homeCode

    const m103 = byNo(resolved, 103)
    expect(m103.stage).toBe('F3')
    expect(m103.home.source).toEqual({ kind: 'matchLoser', matchNo: 101 })
    expect(m103.away.source).toEqual({ kind: 'matchLoser', matchNo: 102 })
    // the matchLoser slots resolve to exactly the two SF losers
    expect(m103.homeCode).toBe(loser101)
    expect(m103.awayCode).toBe(loser102)
    // sanity: both are real, distinct teams and are the SF AWAY sides (home won)
    expect(m103.homeCode).toBe(m101.awayCode)
    expect(m103.awayCode).toBe(m102.awayCode)
    expect(m103.homeCode).not.toBe(m103.awayCode)
    // and the F3 losers are NOT the same teams as the finalists (winners feed 104)
    const m104 = byNo(resolved, 104)
    expect([m104.homeCode, m104.awayCode]).not.toContain(m103.homeCode)
    expect([m104.homeCode, m104.awayCode]).not.toContain(m103.awayCode)
  })

  it('leaves match 103 unresolved until BOTH semi-finals are finished', () => {
    // Drive everything up to the SFs but DON'T play the SFs themselves.
    const matches: Match[] = groupIds.flatMap((g, i) => fullGroup(g, codesFor(g), 2 + (i % 5)))
    for (const round of [
      [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88],
      [89, 90, 91, 92, 93, 94, 95, 96],
      [97, 98, 99, 100],
    ]) {
      const r = resolveBracket(BRACKET, TEAMS, matches)
      for (const no of round) {
        const m = byNo(r, no)
        matches.push(koMatch(m.homeCode!, m.awayCode!, 2, 0, { stage: m.stage }))
      }
    }
    const resolved = resolveBracket(BRACKET, TEAMS, matches)
    // SFs are seeded but not played → their losers are unknown → 103 stays empty.
    expect(byNo(resolved, 101).status).toBe('scheduled')
    expect(byNo(resolved, 102).status).toBe('scheduled')
    const m103 = byNo(resolved, 103)
    expect(m103.homeCode).toBeNull()
    expect(m103.awayCode).toBeNull()
    expect(m103.status).toBe('scheduled')
  })
})

/* -------------------------------------------------------------------------- */
/* Loser propagation — exercised with a focused custom bracket                 */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — loser propagation (matchLoser slot)', () => {
  // One SF-like match (no.1) whose loser feeds a 3rd-place match (no.2,
  // matchLoser 1) and whose winner feeds a final (no.3, matchWinner 1). Match 1's
  // occupants come from the winner/runner-up of a complete 4-team group below.
  const fullTeams: Team[] = [
    { code: 'AAA', name: 'A', group: 'Z', color: '#000', color2: '#fff', symbol: 's', pot: 1 },
    { code: 'BBB', name: 'B', group: 'Z', color: '#000', color2: '#fff', symbol: 's', pot: 2 },
    { code: 'CCC', name: 'C', group: 'Z', color: '#000', color2: '#fff', symbol: 's', pot: 3 },
    { code: 'DDD', name: 'D', group: 'Z', color: '#000', color2: '#fff', symbol: 's', pot: 4 },
  ]
  const bracket: BracketMatch[] = [
    {
      matchNo: 1,
      stage: 'SF',
      home: { source: { kind: 'winner', group: 'Z' }, label: 'Winner Z' },
      away: { source: { kind: 'runnerUp', group: 'Z' }, label: 'Runner-up Z' },
    },
    {
      matchNo: 2,
      stage: 'F3',
      home: { source: { kind: 'matchLoser', matchNo: 1 }, label: 'Loser M1' },
      away: { source: { kind: 'winner', group: 'Z' }, label: 'Winner Z' },
    },
    {
      matchNo: 3,
      stage: 'F',
      home: { source: { kind: 'matchWinner', matchNo: 1 }, label: 'Winner M1' },
      away: { source: { kind: 'runnerUp', group: 'Z' }, label: 'Runner-up Z' },
    },
  ]
  // Group Z full round-robin: AAA 1st, BBB 2nd, CCC 3rd, DDD 4th.
  const groupZ: Match[] = [
    groupMatch('Z', 'AAA', 'BBB', 1, 0, '2026-06-11T16:00:00Z'),
    groupMatch('Z', 'CCC', 'DDD', 1, 0, '2026-06-11T19:00:00Z'),
    groupMatch('Z', 'AAA', 'CCC', 2, 0, '2026-06-15T16:00:00Z'),
    groupMatch('Z', 'BBB', 'DDD', 2, 0, '2026-06-15T19:00:00Z'),
    groupMatch('Z', 'AAA', 'DDD', 3, 0, '2026-06-19T16:00:00Z'),
    groupMatch('Z', 'BBB', 'CCC', 1, 0, '2026-06-19T19:00:00Z'),
  ]

  it('seeds match 1 from the completed group (winner AAA vs runner-up BBB)', () => {
    const resolved = resolveBracket(bracket, fullTeams, groupZ)
    const m1 = byNo(resolved, 1)
    expect(m1.homeCode).toBe('AAA')
    expect(m1.awayCode).toBe('BBB')
  })

  it('propagates the loser of match 1 into the matchLoser slot of match 2', () => {
    // AAA beats BBB in match 1 → loser BBB feeds match 2 home (matchLoser 1)
    const ko = koMatch('AAA', 'BBB', 2, 1, { stage: 'SF' })
    const resolved = resolveBracket(bracket, fullTeams, [...groupZ, ko])
    const m1 = byNo(resolved, 1)
    expect(m1.status).toBe('finished')
    expect(m1.winnerCode).toBe('AAA')
    const m2 = byNo(resolved, 2)
    expect(m2.home.source).toEqual({ kind: 'matchLoser', matchNo: 1 })
    expect(m2.homeCode).toBe('BBB') // the loser
  })

  it('propagates the winner of match 1 into the matchWinner slot of match 3', () => {
    const ko = koMatch('AAA', 'BBB', 2, 1, { stage: 'SF' })
    const resolved = resolveBracket(bracket, fullTeams, [...groupZ, ko])
    const m3 = byNo(resolved, 3)
    expect(m3.home.source).toEqual({ kind: 'matchWinner', matchNo: 1 })
    expect(m3.homeCode).toBe('AAA') // the winner
  })

  it('leaves matchLoser null until match 1 is finished', () => {
    const resolved = resolveBracket(bracket, fullTeams, groupZ) // match 1 not played
    const m2 = byNo(resolved, 2)
    // away of match 2 is Winner Z = AAA (resolved from the group);
    // home is matchLoser 1 → null because match 1 unfinished
    expect(m2.awayCode).toBe('AAA')
    expect(m2.homeCode).toBeNull()
  })

  it('resolves a loser decided on penalties (drawn SF → pen loser advances to F3)', () => {
    // Match 1 drawn 1-1, AAA wins shootout 4-2 → loser BBB.
    const ko = koMatch('AAA', 'BBB', 1, 1, { stage: 'SF', pens: { home: 4, away: 2 } })
    const resolved = resolveBracket(bracket, fullTeams, [...groupZ, ko])
    const m1 = byNo(resolved, 1)
    expect(m1.winnerCode).toBe('AAA')
    const m2 = byNo(resolved, 2)
    expect(m2.homeCode).toBe('BBB') // pen-shootout loser
  })

  it('keeps unused teams (CCC, DDD) out of the SF/F brackets entirely', () => {
    const ko = koMatch('AAA', 'BBB', 2, 1, { stage: 'SF' })
    const resolved = resolveBracket(bracket, fullTeams, [...groupZ, ko])
    const codes = resolved.flatMap((m) => [m.homeCode, m.awayCode])
    expect(codes).not.toContain('CCC')
    expect(codes).not.toContain('DDD')
  })
})

/* -------------------------------------------------------------------------- */
/* Tie handling in group standings feeding the bracket                         */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — head-to-head tie-break decides seeding', () => {
  // Group A is built so two pairs of teams finish PERFECTLY level on the overall
  // criteria (points, GD, GF) and only the head-to-head result between the tied
  // teams separates them. Crucially, the pairing is arranged so the head-to-head
  // winner is the team a plain stable sort (which keeps the TEAMS-array order on a
  // tie — MEX is listed before RSA, KOR before CZE in Group A) would rank LOWER.
  // So the asserted order can ONLY come from the head-to-head mini-table; remove
  // that tie-break and these assertions flip and fail.
  //
  // Top pair  — RSA & MEX both 6pts, +2 GD, 3 GF; RSA beat MEX 1-0 head-to-head.
  // Bottom pair — CZE & KOR both 3pts, -2 GD, 1 GF; CZE beat KOR 1-0 head-to-head.
  //   RSA: beat CZE 2-0, beat MEX 1-0, lost KOR 0-1   → 6pts, GF3 GA1 GD+2
  //   MEX: lost RSA 0-1, beat KOR 2-0, beat CZE 1-0   → 6pts, GF3 GA1 GD+2
  //   KOR: beat RSA 1-0, lost MEX 0-2, lost CZE 0-1   → 3pts, GF1 GA3 GD-2
  //   CZE: lost RSA 0-2, beat KOR 1-0, lost MEX 0-1   → 3pts, GF1 GA3 GD-2
  const matches: Match[] = [
    groupMatch('A', 'RSA', 'CZE', 2, 0, '2026-06-11T16:00:00Z'),
    groupMatch('A', 'RSA', 'MEX', 1, 0, '2026-06-12T16:00:00Z'), // RSA beats MEX (top-pair H2H)
    groupMatch('A', 'KOR', 'RSA', 1, 0, '2026-06-13T16:00:00Z'),
    groupMatch('A', 'MEX', 'KOR', 2, 0, '2026-06-14T16:00:00Z'),
    groupMatch('A', 'MEX', 'CZE', 1, 0, '2026-06-15T16:00:00Z'),
    groupMatch('A', 'CZE', 'KOR', 1, 0, '2026-06-16T16:00:00Z'), // CZE beats KOR (bottom-pair H2H)
  ]

  it('the two tied pairs are genuinely level on the overall criteria (pts/GD/GF)', () => {
    // Prove the precondition: without head-to-head the top two (and bottom two) are
    // indistinguishable on pts/GD/GF, so any ordering between them is a real H2H call.
    const std = computeGroupStandings(matches, 'A', ['MEX', 'RSA', 'KOR', 'CZE'])
    const key = (c: string) => {
      const r = std.find((x) => x.code === c)!
      return { points: r.points, gd: r.gd, gf: r.gf }
    }
    expect(key('RSA')).toEqual(key('MEX')) // top pair fully level overall
    expect(key('CZE')).toEqual(key('KOR')) // bottom pair fully level overall
    expect(key('RSA').points).toBeGreaterThan(key('CZE').points) // pairs are distinct tiers
  })

  it('ranks the head-to-head winner above the team a stable sort would keep on top', () => {
    const resolved = resolveBracket(BRACKET, TEAMS, matches)
    // Winner A → match 79 home; Runner-up A → match 73 home.
    // RSA beat MEX head-to-head, so RSA is Winner A and MEX is Runner-up A — even
    // though MEX precedes RSA in the TEAMS array (the stable-sort fallback order).
    expect(byNo(resolved, 79).homeCode).toBe('RSA') // Winner A = H2H winner
    expect(byNo(resolved, 73).homeCode).toBe('MEX') // Runner-up A = H2H loser
  })

  it('applies the same head-to-head rule to the lower tied pair (3rd vs 4th)', () => {
    // CZE beat KOR head-to-head, so CZE finishes 3rd and KOR 4th, again opposite to
    // the TEAMS-array order (KOR is listed before CZE).
    const std = computeGroupStandings(matches, 'A', ['MEX', 'RSA', 'KOR', 'CZE'])
    const order = std.map((r) => r.code)
    expect(order).toEqual(['RSA', 'MEX', 'CZE', 'KOR'])
  })
})

/* -------------------------------------------------------------------------- */
/* Full-tournament style sanity: complete ALL groups → third slots fill        */
/* -------------------------------------------------------------------------- */

describe('resolveBracket — all groups complete fills third-place slots', () => {
  /**
   * Build a complete round-robin for an arbitrary 4-team group where the teams
   * finish strictly in the order given (1st..4th) by points (3-0 ladder),
   * with controllable scoring so the best-thirds ranking is deterministic.
   */
  function fullGroup(group: string, order: [string, string, string, string], topGf: number): Match[] {
    const [a, b, c, d] = order
    // a beats everyone, b beats c & d, c beats d. Margins decline so GF differs.
    return [
      groupMatch(group, a, b, topGf, 0, `${group}-1`),
      groupMatch(group, a, c, 1, 0, `${group}-2`),
      groupMatch(group, a, d, 1, 0, `${group}-3`),
      groupMatch(group, b, c, 1, 0, `${group}-4`),
      groupMatch(group, b, d, 1, 0, `${group}-5`),
      groupMatch(group, c, d, 1, 0, `${group}-6`),
    ]
  }

  // Map each group to its four real team codes (in pot order from TEAMS).
  function codesFor(g: string): [string, string, string, string] {
    const cs = TEAMS.filter((t) => t.group === g).map((t) => t.code)
    return [cs[0], cs[1], cs[2], cs[3]]
  }

  it('assigns exactly 8 distinct third-placed teams across the third slots', () => {
    const groupIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    // Vary the winner's margin per group so thirds also vary; the 3rd-placed team
    // is `order[2]` in every group (it beats only the 4th).
    const matches: Match[] = groupIds.flatMap((g, i) =>
      fullGroup(g, codesFor(g), 2 + (i % 5)),
    )
    const resolved = resolveBracket(BRACKET, TEAMS, matches)

    // Every third-slot away occupant should now be filled (8 such slots).
    const thirdSlotMatches = resolved.filter(
      (m) => m.away.source.kind === 'third' || m.home.source.kind === 'third',
    )
    expect(thirdSlotMatches.length).toBe(8)
    const assigned = thirdSlotMatches.map((m) =>
      m.away.source.kind === 'third' ? m.awayCode : m.homeCode,
    )
    // All 8 assigned, all non-null, all distinct.
    expect(assigned.every((c) => c !== null)).toBe(true)
    expect(new Set(assigned).size).toBe(8)
  })

  it('seeds R32 winners and runners-up for every group when all groups complete', () => {
    const groupIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
    const matches: Match[] = groupIds.flatMap((g) => fullGroup(g, codesFor(g), 3))
    const resolved = resolveBracket(BRACKET, TEAMS, matches)
    // Winner A = first code of group A = MEX; Runner-up A = RSA.
    expect(byNo(resolved, 79).homeCode).toBe('MEX')
    expect(byNo(resolved, 73).homeCode).toBe('RSA')
    // Winner L = ENG; Runner-up L = CRO.
    expect(byNo(resolved, 80).homeCode).toBe('ENG') // Winner L
    expect(byNo(resolved, 83).awayCode).toBe('CRO') // Runner-up L (match 83 away)
  })
})
