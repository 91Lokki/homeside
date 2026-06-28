import { describe, it, expect } from 'vitest'
import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import type { Match } from '@/domain/types'

/**
 * Regression test for the Round-of-32 third-place assignment. FIFA assigns the
 * eight qualifying thirds to the eight "winner vs third" ties via a published
 * lookup keyed by WHICH groups qualify — not by "any valid matching". The old
 * code found an arbitrary valid matching, which mis-paired e.g. France→Paraguay
 * instead of the official France→Sweden. This builds a full set of group results
 * matching the real 2026 scenario (thirds of B,D,E,F,I,J,K,L qualify) and asserts
 * every winner-vs-third tie equals the official pairing.
 */

let _id = 0
function gameRow(group: string, home: string, away: string, hs: number, as: number): Match {
  return {
    id: `g${_id++}`,
    stage: 'group',
    group: group as Match['group'],
    homeCode: home,
    awayCode: away,
    kickoff: '2026-06-15T18:00:00Z',
    status: 'finished',
    homeScore: hs,
    awayScore: as,
    minute: null,
  } as Match
}

/**
 * Six round-robin results that finish a group in the exact order [a,b,c,d]
 * (9/6/3/0 pts). `thirdMargin` controls the third-placed team's goal difference
 * (margin−2), so we can make a group's third a top-8 qualifier (3) or not (1).
 */
function group(g: string, order: [string, string, string, string], thirdMargin: number): Match[] {
  const [a, b, c, d] = order
  return [
    gameRow(g, a, b, 1, 0),
    gameRow(g, a, c, 1, 0),
    gameRow(g, a, d, 1, 0),
    gameRow(g, b, c, 1, 0),
    gameRow(g, b, d, 1, 0),
    gameRow(g, c, d, thirdMargin, 0),
  ]
}

// Real 2026 finishing orders. Thirds of B,D,E,F,I,J,K,L qualify (margin 3);
// A,C,G,H thirds do not (margin 1).
const Q = 3
const N = 1
const matches: Match[] = [
  ...group('A', ['MEX', 'RSA', 'KOR', 'CZE'], N),
  ...group('B', ['SUI', 'CAN', 'BIH', 'QAT'], Q),
  ...group('C', ['BRA', 'MAR', 'HAI', 'SCO'], N),
  ...group('D', ['USA', 'AUS', 'PAR', 'TUR'], Q),
  ...group('E', ['GER', 'CIV', 'ECU', 'CUW'], Q),
  ...group('F', ['NED', 'JPN', 'SWE', 'TUN'], Q),
  ...group('G', ['BEL', 'EGY', 'IRN', 'NZL'], N),
  ...group('H', ['ESP', 'URU', 'CPV', 'KSA'], N),
  ...group('I', ['FRA', 'NOR', 'SEN', 'IRQ'], Q),
  ...group('J', ['ARG', 'AUT', 'ALG', 'JOR'], Q),
  ...group('K', ['COL', 'POR', 'COD', 'UZB'], Q),
  ...group('L', ['ENG', 'CRO', 'GHA', 'PAN'], Q),
]

describe('R32 third-place assignment (FIFA official table)', () => {
  const resolved = resolveBracket(BRACKET, TEAMS, matches)
  const byNo = new Map(resolved.map((m) => [m.matchNo, m]))
  const pair = (no: number) => new Set([byNo.get(no)?.homeCode, byNo.get(no)?.awayCode])

  // The eight "group winner vs third" ties, per the official 2026 scenario.
  const OFFICIAL: Record<number, [string, string]> = {
    74: ['GER', 'PAR'], // 1E v 3D
    77: ['FRA', 'SWE'], // 1I v 3F  ← the reported bug
    79: ['MEX', 'ECU'], // 1A v 3E
    80: ['ENG', 'COD'], // 1L v 3K
    81: ['USA', 'BIH'], // 1D v 3B
    82: ['BEL', 'SEN'], // 1G v 3I
    85: ['SUI', 'ALG'], // 1B v 3J
    87: ['COL', 'GHA'], // 1K v 3L
  }

  for (const [no, teams] of Object.entries(OFFICIAL)) {
    it(`m${no}: ${teams[0]} vs ${teams[1]}`, () => {
      expect(pair(Number(no))).toEqual(new Set(teams))
    })
  }

  it('does NOT mis-pair France with Paraguay (the original bug)', () => {
    expect(pair(77)).not.toEqual(new Set(['FRA', 'PAR']))
  })

  it('every winner-vs-third tie is fully resolved (both occupants known)', () => {
    for (const no of Object.keys(OFFICIAL)) {
      const m = byNo.get(Number(no))!
      expect(m.homeCode, `m${no} home`).toBeTruthy()
      expect(m.awayCode, `m${no} away`).toBeTruthy()
    }
  })
})
