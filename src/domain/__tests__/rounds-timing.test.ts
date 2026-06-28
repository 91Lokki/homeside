import { describe, it, expect } from 'vitest'
import {
  roundFirstKickoff,
  isRoundLocked,
  currentRound,
  previousRound,
  knockoutKickoffs,
  activeMatchDates,
  liveMatchDates,
  inMatchWindow,
  eliminatedTeams,
} from '@/domain/fantasyRounds'
import { ROUNDS } from '@/domain/fantasy'
import { BRACKET } from '@/data/bracket'
import { SEED_MATCHES } from '@/data/fixtures'
import { TEAMS } from '@/data/teams'
import type { Match } from '@/domain/types'

/* --------------------------------------------------------------------------
 * Expected timestamps, derived by tracing the REAL bracket wiring.
 *
 * roundFirstKickoff(round) = min kickoff over BRACKET matches whose stage maps
 * to that round (stageToRound: F3 & F both -> FINAL).
 *
 *   R32   : match 73  @ 2026-06-28T19:00:00Z  (earliest R32 kickoff)
 *   R16   : matches 89/90 @ 2026-07-04T18:00:00Z
 *   QF    : match 97  @ 2026-07-09T18:00:00Z
 *   SF    : match 101 @ 2026-07-14T18:00:00Z
 *   FINAL : F3 match 103 @ 2026-07-18T18:00:00Z (earlier than the final 104)
 * ------------------------------------------------------------------------ */
const MS = (iso: string) => new Date(iso).getTime()
const R32_FIRST = MS('2026-06-28T19:00:00Z')
const R16_FIRST = MS('2026-07-04T18:00:00Z')
const QF_FIRST = MS('2026-07-09T18:00:00Z')
const SF_FIRST = MS('2026-07-14T18:00:00Z')
const FINAL_FIRST = MS('2026-07-18T18:00:00Z') // = F3 (loser play-off), before the final

const MINUTE = 60 * 1000
const LEAD_MS = 5 * MINUTE
const WINDOW_MS = 170 * MINUTE

describe('roundFirstKickoff', () => {
  it('returns the earliest scheduled kickoff (ms) for each round', () => {
    expect(roundFirstKickoff('R32')).toBe(R32_FIRST)
    expect(roundFirstKickoff('R16')).toBe(R16_FIRST)
    expect(roundFirstKickoff('QF')).toBe(QF_FIRST)
    expect(roundFirstKickoff('SF')).toBe(SF_FIRST)
    expect(roundFirstKickoff('FINAL')).toBe(FINAL_FIRST)
  })

  it('FINAL takes the F3 kickoff because both F3 and F map to FINAL and F3 is earlier', () => {
    const f3 = BRACKET.find((b) => b.stage === 'F3')!
    const f = BRACKET.find((b) => b.stage === 'F')!
    expect(MS(f3.kickoff!)).toBeLessThan(MS(f.kickoff!))
    expect(roundFirstKickoff('FINAL')).toBe(MS(f3.kickoff!))
  })

  it('produces strictly increasing first-kickoffs across the round order R32 < R16 < QF < SF < FINAL', () => {
    // Assert the ACTUAL implementation output is monotonically increasing in
    // ROUNDS order — not just that the local expected consts relate to each other.
    const actual = ROUNDS.map((r) => roundFirstKickoff(r))
    expect(actual.every((k): k is number => k != null)).toBe(true)
    for (let i = 1; i < actual.length; i++) {
      expect(actual[i] as number).toBeGreaterThan(actual[i - 1] as number)
    }
    // And spell out the round-by-round chain so a regression names the offending pair.
    expect(roundFirstKickoff('R32')!).toBeLessThan(roundFirstKickoff('R16')!)
    expect(roundFirstKickoff('R16')!).toBeLessThan(roundFirstKickoff('QF')!)
    expect(roundFirstKickoff('QF')!).toBeLessThan(roundFirstKickoff('SF')!)
    expect(roundFirstKickoff('SF')!).toBeLessThan(roundFirstKickoff('FINAL')!)
  })
})

describe('isRoundLocked', () => {
  it('is false strictly before the first kickoff', () => {
    expect(isRoundLocked('R32', R32_FIRST - 1)).toBe(false)
    expect(isRoundLocked('R16', R16_FIRST - MINUTE)).toBe(false)
  })

  it('locks exactly AT the first kickoff (boundary: k <= now)', () => {
    expect(isRoundLocked('R32', R32_FIRST)).toBe(true)
    expect(isRoundLocked('R16', R16_FIRST)).toBe(true)
    expect(isRoundLocked('QF', QF_FIRST)).toBe(true)
    expect(isRoundLocked('SF', SF_FIRST)).toBe(true)
    expect(isRoundLocked('FINAL', FINAL_FIRST)).toBe(true)
  })

  it('stays locked after the first kickoff', () => {
    expect(isRoundLocked('R32', R32_FIRST + 1)).toBe(true)
    expect(isRoundLocked('FINAL', FINAL_FIRST + WINDOW_MS)).toBe(true)
  })

  it('a later round is still unlocked while an earlier round has locked', () => {
    // now = R32 kickoff: R32 locked, R16 not yet
    expect(isRoundLocked('R32', R32_FIRST)).toBe(true)
    expect(isRoundLocked('R16', R32_FIRST)).toBe(false)
    expect(isRoundLocked('FINAL', R32_FIRST)).toBe(false)
  })
})

describe('currentRound', () => {
  it('is R32 before anything kicks off', () => {
    expect(currentRound(R32_FIRST - 1)).toBe('R32')
    expect(currentRound(MS('2026-06-01T00:00:00Z'))).toBe('R32')
  })

  it('advances to the first not-yet-locked round as kickoffs pass', () => {
    // R32 locked -> first open round is R16
    expect(currentRound(R32_FIRST)).toBe('R16')
    // R32 & R16 locked -> QF
    expect(currentRound(R16_FIRST)).toBe('QF')
    // through QF -> SF
    expect(currentRound(QF_FIRST)).toBe('SF')
    // through SF -> FINAL
    expect(currentRound(SF_FIRST)).toBe('FINAL')
  })

  it('stays just below a boundary on the earlier round', () => {
    expect(currentRound(R16_FIRST - 1)).toBe('R16')
    expect(currentRound(QF_FIRST - 1)).toBe('QF')
    expect(currentRound(SF_FIRST - 1)).toBe('SF')
    expect(currentRound(FINAL_FIRST - 1)).toBe('FINAL')
  })

  it('falls back to FINAL once every round has locked', () => {
    expect(currentRound(FINAL_FIRST)).toBe('FINAL')
    expect(currentRound(FINAL_FIRST + 10 * WINDOW_MS)).toBe('FINAL')
  })
})

describe('previousRound', () => {
  it('maps each round to its predecessor in ROUNDS order', () => {
    expect(previousRound('R16')).toBe('R32')
    expect(previousRound('QF')).toBe('R16')
    expect(previousRound('SF')).toBe('QF')
    expect(previousRound('FINAL')).toBe('SF')
  })

  it('returns null for the first round (R32)', () => {
    expect(previousRound('R32')).toBeNull()
  })
})

describe('knockoutKickoffs', () => {
  it('returns one ascending kickoff per bracket match', () => {
    const ks = knockoutKickoffs()
    const koCount = BRACKET.filter((b) => b.kickoff).length
    expect(ks).toHaveLength(koCount)
    // ascending
    for (let i = 1; i < ks.length; i++) expect(ks[i]).toBeGreaterThanOrEqual(ks[i - 1])
    // first is the R32 opener, last is the final
    expect(ks[0]).toBe(R32_FIRST)
    expect(ks[ks.length - 1]).toBe(MS('2026-07-19T18:00:00Z'))
  })
})

describe('activeMatchDates / inMatchWindow (knockout only)', () => {
  it('includes the date of a knockout match exactly at its kickoff', () => {
    // match 73 is the only KO match on 2026-06-28; window = [k-5m, k+170m]
    expect(activeMatchDates(R32_FIRST)).toEqual(['2026-06-28'])
    expect(inMatchWindow(R32_FIRST)).toBe(true)
  })

  it('opens the window LEAD_MS (5 min) before kickoff and not a tick earlier', () => {
    expect(inMatchWindow(R32_FIRST - LEAD_MS)).toBe(true)
    expect(activeMatchDates(R32_FIRST - LEAD_MS)).toEqual(['2026-06-28'])
    expect(inMatchWindow(R32_FIRST - LEAD_MS - 1)).toBe(false)
    expect(activeMatchDates(R32_FIRST - LEAD_MS - 1)).toEqual([])
  })

  it('closes the window WINDOW_MS (170 min) after kickoff and not a tick later', () => {
    expect(inMatchWindow(R32_FIRST + WINDOW_MS)).toBe(true)
    expect(inMatchWindow(R32_FIRST + WINDOW_MS + 1)).toBe(false)
    expect(activeMatchDates(R32_FIRST + WINDOW_MS + 1)).toEqual([])
  })

  it('is empty / false far from any knockout kickoff', () => {
    const farBefore = MS('2026-06-01T00:00:00Z')
    const farAfter = MS('2026-08-01T00:00:00Z')
    expect(activeMatchDates(farBefore)).toEqual([])
    expect(inMatchWindow(farBefore)).toBe(false)
    expect(activeMatchDates(farAfter)).toEqual([])
    expect(inMatchWindow(farAfter)).toBe(false)
  })

  it('ignores group-stage kickoffs (only knockouts count)', () => {
    // g1 kicks off 2026-06-11T19:00Z — long before any knockout — so no KO window covers it
    const groupKickoff = MS('2026-06-11T19:00:00Z')
    expect(activeMatchDates(groupKickoff)).toEqual([])
    expect(inMatchWindow(groupKickoff)).toBe(false)
  })
})

describe('liveMatchDates (group + knockout)', () => {
  it('includes a GROUP match date when its window covers now', () => {
    // g1 @ 2026-06-11T19:00Z is a group match; activeMatchDates would be empty here
    const groupKickoff = MS('2026-06-11T19:00:00Z')
    expect(liveMatchDates(groupKickoff)).toContain('2026-06-11')
    expect(activeMatchDates(groupKickoff)).toEqual([])
  })

  it('includes a KNOCKOUT match date too', () => {
    expect(liveMatchDates(R32_FIRST)).toContain('2026-06-28')
  })

  it('is empty far from every kickoff (group or knockout)', () => {
    expect(liveMatchDates(MS('2026-06-01T00:00:00Z'))).toEqual([])
    expect(liveMatchDates(MS('2026-08-01T00:00:00Z'))).toEqual([])
  })

  it('opens 5 min before a group kickoff and closes 170 min after', () => {
    const k = MS('2026-06-11T19:00:00Z')
    expect(liveMatchDates(k - LEAD_MS)).toContain('2026-06-11')
    expect(liveMatchDates(k - LEAD_MS - 1)).not.toContain('2026-06-11')
    expect(liveMatchDates(k + WINDOW_MS)).toContain('2026-06-11')
    expect(liveMatchDates(k + WINDOW_MS + 1)).not.toContain('2026-06-11')
  })
})

/* --------------------------------------------------------------------------
 * eliminatedTeams — resolves against the REAL BRACKET + real TEAMS.
 *
 * Groups A & B are complete in the seed, so bracket match 73
 *   (Runner-up A vs Runner-up B) resolves to real teams:
 *   Runner-up A = RSA, Runner-up B = CAN  (traced from group standings).
 * A finished R32 between them eliminates the loser (R32 != SF).
 * ------------------------------------------------------------------------ */
const koMatch = (
  id: string,
  stage: Match['stage'],
  homeCode: string,
  awayCode: string,
  homeScore: number,
  awayScore: number,
  pens?: { home: number; away: number },
): Match => ({
  id,
  stage,
  homeCode,
  awayCode,
  kickoff: '2026-06-28T19:00:00Z',
  status: 'finished',
  homeScore,
  awayScore,
  ...(pens ? { pens } : {}),
})

describe('eliminatedTeams', () => {
  it('eliminates the loser of a finished, NON-SF knockout match', () => {
    // Runner-up A (RSA) beats Runner-up B (CAN) in the R32 -> CAN eliminated.
    const matches: Match[] = [...SEED_MATCHES, koMatch('ko73', 'R32', 'RSA', 'CAN', 2, 0)]
    const out = eliminatedTeams(matches, TEAMS)
    expect(out.has('CAN')).toBe(true) // loser is out
    expect(out.has('RSA')).toBe(false) // winner survives
  })

  it('uses penalties to decide the loser of a drawn knockout', () => {
    // 1-1, RSA wins shootout 4-2 -> CAN loses on pens and is eliminated.
    const matches: Match[] = [...SEED_MATCHES, koMatch('ko73p', 'R32', 'RSA', 'CAN', 1, 1, { home: 4, away: 2 })]
    const out = eliminatedTeams(matches, TEAMS)
    expect(out.has('CAN')).toBe(true)
    expect(out.has('RSA')).toBe(false)
  })

  it('returns an empty set when there are no finished knockout matches', () => {
    const out = eliminatedTeams([...SEED_MATCHES], TEAMS)
    expect(out.size).toBe(0)
  })

  it('returns an empty set for empty inputs', () => {
    expect(eliminatedTeams([], []).size).toBe(0)
    expect(eliminatedTeams([], TEAMS).size).toBe(0)
  })

  /* ----------------------------------------------------------------------
   * A fully-resolved bracket path to a finished semi-final. All 12 groups
   * are completed (so R32 slots resolve to real teams), then one half of the
   * bracket is driven to an SF result. Occupants traced via resolveBracket:
   *   R32 73 RSA>CAN, 75 JPN>MAR, 74 GER>KOR, 77 NOR>SWE,
   *       83 POR>ENG, 84 URU>ALG, 81 USA>BIH, 82 ESP>EGY
   *   R16 89 GER>NOR, 90 RSA>JPN, 93 POR>URU, 94 USA>ESP
   *   QF  97 GER>RSA, 98 POR>USA
   *   SF 101 GER>POR  -> POR is the semi-final loser
   * -------------------------------------------------------------------- */
  const completeAllGroups = (): Match[] =>
    SEED_MATCHES.map((m) =>
      m.status === 'finished' ? m : ({ ...m, status: 'finished', homeScore: 1, awayScore: 0 } as Match),
    )

  const fullPathMatches = (): Match[] => [
    ...completeAllGroups(),
    koMatch('m73', 'R32', 'RSA', 'CAN', 1, 0),
    koMatch('m75', 'R32', 'JPN', 'MAR', 1, 0),
    koMatch('m74', 'R32', 'GER', 'KOR', 1, 0),
    koMatch('m77', 'R32', 'NOR', 'SWE', 1, 0),
    koMatch('m83', 'R32', 'POR', 'ENG', 1, 0),
    koMatch('m84', 'R32', 'URU', 'ALG', 1, 0),
    koMatch('m81', 'R32', 'USA', 'BIH', 1, 0),
    koMatch('m82', 'R32', 'ESP', 'EGY', 1, 0),
    koMatch('m89', 'R16', 'GER', 'NOR', 1, 0),
    koMatch('m90', 'R16', 'RSA', 'JPN', 1, 0),
    koMatch('m93', 'R16', 'POR', 'URU', 1, 0),
    koMatch('m94', 'R16', 'USA', 'ESP', 1, 0),
    koMatch('m97', 'QF', 'GER', 'RSA', 1, 0),
    koMatch('m98', 'QF', 'POR', 'USA', 1, 0),
    koMatch('m101', 'SF', 'GER', 'POR', 1, 0),
  ]

  it('does NOT eliminate the loser of a semi-final (3rd-place play-off awaits)', () => {
    const out = eliminatedTeams(fullPathMatches(), TEAMS)
    expect(out.has('POR')).toBe(false) // SF loser stays alive
    expect(out.has('GER')).toBe(false) // SF winner alive
  })

  it('DOES eliminate non-SF knockout losers along the same resolved path', () => {
    const out = eliminatedTeams(fullPathMatches(), TEAMS)
    // R32 losers
    for (const t of ['CAN', 'MAR', 'KOR', 'SWE', 'ENG', 'ALG', 'BIH', 'EGY']) {
      expect(out.has(t)).toBe(true)
    }
    // R16 losers
    for (const t of ['NOR', 'JPN', 'URU', 'ESP']) expect(out.has(t)).toBe(true)
    // QF losers
    expect(out.has('RSA')).toBe(true)
    expect(out.has('USA')).toBe(true)
    // SF loser is the sole knockout loser NOT eliminated
    expect(out.has('POR')).toBe(false)
  })
})
