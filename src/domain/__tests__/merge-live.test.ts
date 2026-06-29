import { describe, it, expect } from 'vitest'
import { BRACKET } from '@/data/bracket'
import { SEED_MATCHES } from '@/data/fixtures'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import { PICKED_AT_KEY, scorePredictions } from '@/domain/predict'
import { mergeMatches } from '@/lib/api'
import type { Match, Stage } from '@/domain/types'

/**
 * Tests for the "merge-live" domain: mergeMatches(seed, live).
 *
 * Source under test: src/lib/api.ts
 *   - pairKey(a, b)  = [a, b].sort().join('~')   (private)
 *   - mergeKey(m)    = `${m.stage}:${pairKey(m.homeCode!, m.awayCode!)}` (private)
 *   - mergeMatches(seed, live):
 *       * copies seed (shallow per match)
 *       * indexes seed matches that have BOTH home/away codes by mergeKey
 *       * for each live match with BOTH codes:
 *           - if a seed match shares the key: overlay
 *             status/minute/kickoff/apiFixtureId/scores/pens.
 *             flip = seedMatch.homeCode !== lm.homeCode
 *             homeScore = flip ? lm.awayScore : lm.homeScore
 *             awayScore = flip ? lm.homeScore : lm.awayScore
 *             pens      = lm.pens ? (flip ? swap : lm.pens) : seedMatch.pens
 *             kickoff   = lm.kickoff || seedMatch.kickoff
 *             apiFixtureId = lm.apiFixtureId ?? seedMatch.apiFixtureId
 *           - else: append the live match verbatim
 *       * live match missing either code: skipped (continue)
 *       * seed match missing either code: never indexed → left as-is
 *
 * mergeKey is not exported, so every expected key/orientation below is derived
 * by tracing the real implementation by hand.
 */

/* --------------------------- fixture builders ---------------------------- */

// Build a Match with sensible defaults; override only what a test cares about.
function makeMatch(over: Partial<Match> & Pick<Match, 'id'>): Match {
  return {
    stage: 'group' as Stage,
    homeCode: 'ARG',
    awayCode: 'BRA',
    kickoff: '2026-06-10T18:00:00Z',
    status: 'scheduled',
    homeScore: null,
    awayScore: null,
    minute: null,
    ...over,
  }
}

describe('mergeMatches', () => {
  describe('basic structure', () => {
    it('returns a fresh array, not the same reference as seed', () => {
      const seed: Match[] = [makeMatch({ id: 's1' })]
      const out = mergeMatches(seed, [])
      expect(out).not.toBe(seed)
      expect(out).toHaveLength(1)
    })

    it('does not mutate the seed matches (copies each match)', () => {
      const seedMatch = makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' })
      const seed = [seedMatch]
      const live = [
        makeMatch({
          id: 'l1',
          homeCode: 'ARG',
          awayCode: 'BRA',
          status: 'finished',
          homeScore: 3,
          awayScore: 0,
        }),
      ]
      const out = mergeMatches(seed, live)
      // original seed object untouched
      expect(seedMatch.status).toBe('scheduled')
      expect(seedMatch.homeScore).toBeNull()
      // returned copy updated, and is a different object
      expect(out[0]).not.toBe(seedMatch)
      expect(out[0].status).toBe('finished')
      expect(out[0].homeScore).toBe(3)
    })

    it('with empty live, returns fresh seed copies — equal in value, not the same references', () => {
      const seed = [
        makeMatch({
          id: 's1',
          stage: 'group',
          group: 'A',
          homeCode: 'ARG',
          awayCode: 'BRA',
          kickoff: '2026-06-10T18:00:00Z',
          status: 'finished',
          homeScore: 2,
          awayScore: 1,
          minute: null,
          apiFixtureId: 555,
          pens: { home: 4, away: 3 },
        }),
        makeMatch({
          id: 's2',
          stage: 'R16',
          homeCode: 'FRA',
          awayCode: 'GER',
          homeLabel: 'Winner Group C',
          awayLabel: 'Runner-up Group D',
          status: 'scheduled',
        }),
      ]
      const out = mergeMatches(seed, [])
      expect(out).toHaveLength(2)
      // The returned array is a new array...
      expect(out).not.toBe(seed)
      // ...and each match is a FRESH copy, not the same reference as the seed match.
      expect(out[0]).not.toBe(seed[0])
      expect(out[1]).not.toBe(seed[1])
      // Value-equal to the corresponding seed match (every field preserved).
      expect(out[0]).toEqual(seed[0])
      expect(out[1]).toEqual(seed[1])
      // Spell out the all-fields-preserved guarantee for the rich match.
      expect(out[0].id).toBe('s1')
      expect(out[0].stage).toBe('group')
      expect(out[0].group).toBe('A')
      expect(out[0].homeCode).toBe('ARG')
      expect(out[0].awayCode).toBe('BRA')
      expect(out[0].kickoff).toBe('2026-06-10T18:00:00Z')
      expect(out[0].status).toBe('finished')
      expect(out[0].homeScore).toBe(2)
      expect(out[0].awayScore).toBe(1)
      expect(out[0].minute).toBeNull()
      expect(out[0].apiFixtureId).toBe(555)
      expect(out[0].pens).toEqual({ home: 4, away: 3 })
      // mergeMatches copies each match shallowly ({ ...m }), so the nested pens
      // object is shared with the seed — the copy is per-match, not deep.
      expect(out[0].pens).toBe(seed[0].pens)
      // And seed-only label fields survive on the second match.
      expect(out[1].homeLabel).toBe('Winner Group C')
      expect(out[1].awayLabel).toBe('Runner-up Group D')
    })

    it('with empty seed and empty live returns an empty array', () => {
      expect(mergeMatches([], [])).toEqual([])
    })

    it('with empty seed appends all (code-bearing) live matches', () => {
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 1 }),
      ]
      const out = mergeMatches([], live)
      expect(out).toHaveLength(1)
      expect(out[0]).toBe(live[0]) // appended verbatim (same reference)
    })
  })

  describe('matched overlay (same home/away orientation)', () => {
    it('overlays status/minute/kickoff/apiFixtureId/scores onto the seed match', () => {
      const seed = [
        makeMatch({
          id: 'seed-1',
          stage: 'group',
          group: 'C',
          homeCode: 'ARG',
          awayCode: 'BRA',
          kickoff: '2026-06-10T18:00:00Z',
          status: 'scheduled',
          homeScore: null,
          awayScore: null,
          minute: null,
        }),
      ]
      const live = [
        makeMatch({
          id: 'espn-999',
          stage: 'group',
          homeCode: 'ARG',
          awayCode: 'BRA',
          kickoff: '2026-06-10T18:05:00Z',
          status: 'finished',
          homeScore: 2,
          awayScore: 1,
          minute: null,
          apiFixtureId: 999,
        }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(1)
      const m = out[0]
      expect(m.id).toBe('seed-1') // seed identity preserved
      expect(m.group).toBe('C') // seed-only field preserved
      expect(m.homeCode).toBe('ARG') // orientation preserved
      expect(m.awayCode).toBe('BRA')
      expect(m.status).toBe('finished')
      expect(m.homeScore).toBe(2)
      expect(m.awayScore).toBe(1)
      expect(m.kickoff).toBe('2026-06-10T18:05:00Z')
      expect(m.apiFixtureId).toBe(999)
    })

    it('in-play (live) state with a clock minute overlays correctly', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'FRA', awayCode: 'GER', status: 'scheduled' })]
      const live = [
        makeMatch({
          id: 'l1',
          homeCode: 'FRA',
          awayCode: 'GER',
          status: 'live',
          homeScore: 1,
          awayScore: 0,
          minute: 67,
          apiFixtureId: 4242,
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.status).toBe('live')
      expect(m.minute).toBe(67)
      expect(m.homeScore).toBe(1)
      expect(m.awayScore).toBe(0)
      expect(m.apiFixtureId).toBe(4242)
    })

    it('overlays a 0-0 finished result (scores are present zeros, not nulls)', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ESP', awayCode: 'POR' })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ESP', awayCode: 'POR', status: 'finished', homeScore: 0, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].homeScore).toBe(0)
      expect(out[0].awayScore).toBe(0)
      expect(out[0].status).toBe('finished')
    })

    it('overlays NULL scores onto a seed that already had non-null scores (impl overwrites)', () => {
      // An in-play push can carry null scores (e.g. ESPN momentarily reports no
      // score). The overlay copies live scores verbatim — it does NOT keep the
      // seed's prior numbers.
      const seed = [
        makeMatch({
          id: 's1',
          homeCode: 'ARG',
          awayCode: 'BRA',
          status: 'finished',
          homeScore: 2,
          awayScore: 1,
        }),
      ]
      const live = [
        makeMatch({
          id: 'l1',
          homeCode: 'ARG', // same orientation -> flip === false
          awayCode: 'BRA',
          status: 'live',
          homeScore: null,
          awayScore: null,
          minute: 5,
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      // flip === false: homeScore = lm.homeScore (null); awayScore = lm.awayScore (null)
      expect(m.homeScore).toBeNull()
      expect(m.awayScore).toBeNull()
      expect(m.status).toBe('live')
      expect(m.minute).toBe(5)
    })

    it('sets minute to null when the live match clears it (live.minute is null)', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', minute: 45 })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0, minute: null }),
      ]
      const out = mergeMatches(seed, live)
      // overlay copies live.minute (null) — it does NOT keep the seed's 45
      expect(out[0].minute).toBeNull()
    })
  })

  describe('kickoff fallback (lm.kickoff || seedMatch.kickoff)', () => {
    it('keeps the seed kickoff when the live kickoff is an empty string', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', kickoff: '2026-06-10T18:00:00Z' })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'live', kickoff: '', homeScore: 0, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].kickoff).toBe('2026-06-10T18:00:00Z')
    })

    it('uses the live kickoff when it is a non-empty string', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', kickoff: '2026-06-10T18:00:00Z' })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'live', kickoff: '2026-06-10T19:30:00Z', homeScore: 0, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].kickoff).toBe('2026-06-10T19:30:00Z')
    })
  })

  describe('apiFixtureId fallback (lm.apiFixtureId ?? seedMatch.apiFixtureId)', () => {
    it('keeps the seed apiFixtureId when the live one is undefined', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', apiFixtureId: 111 })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0, apiFixtureId: undefined }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].apiFixtureId).toBe(111)
    })

    it('takes the live apiFixtureId when provided (overriding the seed)', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', apiFixtureId: 111 })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0, apiFixtureId: 222 })]
      const out = mergeMatches(seed, live)
      expect(out[0].apiFixtureId).toBe(222)
    })

    it('uses live apiFixtureId 0 (?? only falls back on null/undefined, not 0)', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', apiFixtureId: 111 })]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0, apiFixtureId: 0 }),
      ]
      const out = mergeMatches(seed, live)
      // 0 is not nullish, so ?? keeps it
      expect(out[0].apiFixtureId).toBe(0)
    })
  })

  describe('pens overlay (lm.pens ? ... : seedMatch.pens)', () => {
    it('overlays live pens when present (same orientation)', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', stage: 'SF' })]
      const live = [
        makeMatch({
          id: 'l1',
          homeCode: 'ARG',
          awayCode: 'BRA',
          stage: 'SF',
          status: 'finished',
          homeScore: 1,
          awayScore: 1,
          pens: { home: 4, away: 3 },
        }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].pens).toEqual({ home: 4, away: 3 })
    })

    it('keeps the seed pens when the live match has no pens', () => {
      const seed = [
        makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA', stage: 'SF', pens: { home: 5, away: 4 } }),
      ]
      const live = [
        makeMatch({ id: 'l1', homeCode: 'ARG', awayCode: 'BRA', stage: 'SF', status: 'finished', homeScore: 1, awayScore: 1, pens: undefined }),
      ]
      const out = mergeMatches(seed, live)
      expect(out[0].pens).toEqual({ home: 5, away: 4 })
    })
  })

  describe('SWAPPED pairing — scores and pens flip to seed orientation', () => {
    it('flips home/away scores so they stay aligned to the seed', () => {
      // Seed orientation: home=ARG, away=BRA
      const seed = [makeMatch({ id: 'seed-1', stage: 'group', homeCode: 'ARG', awayCode: 'BRA' })]
      // Live lists the SAME pairing swapped: home=BRA, away=ARG.
      // ESPN says BRA 2, ARG 1 (i.e. lm.homeScore=2 is BRA, lm.awayScore=1 is ARG).
      const live = [
        makeMatch({
          id: 'espn-1',
          stage: 'group',
          homeCode: 'BRA',
          awayCode: 'ARG',
          status: 'finished',
          homeScore: 2, // BRA
          awayScore: 1, // ARG
          apiFixtureId: 7,
        }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(1)
      const m = out[0]
      // Seed orientation preserved
      expect(m.homeCode).toBe('ARG')
      expect(m.awayCode).toBe('BRA')
      // flip = (seed.homeCode 'ARG') !== (lm.homeCode 'BRA') === true
      // homeScore (ARG) should be lm.awayScore = 1; awayScore (BRA) = lm.homeScore = 2
      expect(m.homeScore).toBe(1)
      expect(m.awayScore).toBe(2)
      expect(m.apiFixtureId).toBe(7)
      expect(m.status).toBe('finished')
    })

    it('flips pens to seed orientation when the pairing is swapped', () => {
      const seed = [makeMatch({ id: 'seed-1', stage: 'F', homeCode: 'ARG', awayCode: 'FRA' })]
      const live = [
        makeMatch({
          id: 'espn-final',
          stage: 'F',
          homeCode: 'FRA', // swapped
          awayCode: 'ARG',
          status: 'finished',
          homeScore: 3, // FRA in regulation
          awayScore: 3, // ARG
          pens: { home: 2, away: 4 }, // FRA 2, ARG 4
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.homeCode).toBe('ARG')
      expect(m.awayCode).toBe('FRA')
      // regulation flipped: ARG (home) = lm.awayScore = 3; FRA (away) = lm.homeScore = 3
      expect(m.homeScore).toBe(3)
      expect(m.awayScore).toBe(3)
      // pens flipped: { home: lm.pens.away (ARG=4), away: lm.pens.home (FRA=2) }
      expect(m.pens).toEqual({ home: 4, away: 2 })
    })

    it('flips asymmetric in-play scores when swapped', () => {
      const seed = [makeMatch({ id: 's1', stage: 'group', homeCode: 'ENG', awayCode: 'USA' })]
      const live = [
        makeMatch({
          id: 'l1',
          stage: 'group',
          homeCode: 'USA', // swapped
          awayCode: 'ENG',
          status: 'live',
          homeScore: 0, // USA
          awayScore: 3, // ENG
          minute: 80,
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.homeCode).toBe('ENG')
      expect(m.awayCode).toBe('USA')
      // ENG (seed home) = lm.awayScore = 3 ; USA (seed away) = lm.homeScore = 0
      expect(m.homeScore).toBe(3)
      expect(m.awayScore).toBe(0)
      expect(m.minute).toBe(80)
      expect(m.status).toBe('live')
    })

    it('overlays NULL scores via the flip path too (swapped, non-null seed -> null)', () => {
      // Same null-score push, but the live feed lists the pair swapped. flip is
      // true, yet both flipped scores are still null, so non-null seed scores are
      // overwritten with null along the flip branch as well.
      const seed = [
        makeMatch({
          id: 's1',
          stage: 'group',
          homeCode: 'ARG',
          awayCode: 'BRA',
          status: 'finished',
          homeScore: 3,
          awayScore: 0,
        }),
      ]
      const live = [
        makeMatch({
          id: 'l1',
          stage: 'group',
          homeCode: 'BRA', // swapped -> flip === true
          awayCode: 'ARG',
          status: 'live',
          homeScore: null,
          awayScore: null,
          minute: 12,
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.homeCode).toBe('ARG') // seed orientation kept
      expect(m.awayCode).toBe('BRA')
      // flip === true: homeScore = lm.awayScore (null); awayScore = lm.homeScore (null)
      expect(m.homeScore).toBeNull()
      expect(m.awayScore).toBeNull()
      expect(m.status).toBe('live')
      expect(m.minute).toBe(12)
    })

    it('flips pens to seed orientation while still in-play (status !== finished)', () => {
      // pens can already be present mid-shootout (status stays 'live' until the
      // last kick). The flip must apply regardless of status — it keys off
      // homeCode equality, not the finished flag.
      const seed = [makeMatch({ id: 's1', stage: 'F', homeCode: 'ARG', awayCode: 'FRA' })]
      const live = [
        makeMatch({
          id: 'l1',
          stage: 'F',
          homeCode: 'FRA', // swapped -> flip === true
          awayCode: 'ARG',
          status: 'live', // NOT finished
          homeScore: 1, // FRA in regulation
          awayScore: 1, // ARG
          pens: { home: 3, away: 2 }, // FRA 3, ARG 2 (shootout underway)
          minute: 120,
        }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.homeCode).toBe('ARG')
      expect(m.awayCode).toBe('FRA')
      expect(m.status).toBe('live')
      // regulation flipped: ARG (home) = lm.awayScore = 1; FRA (away) = lm.homeScore = 1
      expect(m.homeScore).toBe(1)
      expect(m.awayScore).toBe(1)
      // pens flipped: { home: lm.pens.away (ARG=2), away: lm.pens.home (FRA=3) }
      expect(m.pens).toEqual({ home: 2, away: 3 })
    })

    it('does NOT flip when orientation matches even if codes alpha-sort the other way', () => {
      // pairKey sorts, but flip is decided purely by homeCode equality.
      // Seed home=BRA (> ARG alphabetically) — orientation kept, no flip.
      const seed = [makeMatch({ id: 's1', stage: 'group', homeCode: 'BRA', awayCode: 'ARG' })]
      const live = [
        makeMatch({ id: 'l1', stage: 'group', homeCode: 'BRA', awayCode: 'ARG', status: 'finished', homeScore: 5, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      const m = out[0]
      expect(m.homeCode).toBe('BRA')
      expect(m.awayCode).toBe('ARG')
      // flip = ('BRA' !== 'BRA') === false → scores kept as listed
      expect(m.homeScore).toBe(5)
      expect(m.awayScore).toBe(0)
    })
  })

  describe('mergeKey: stage namespacing prevents cross-stage collision', () => {
    it('a knockout rematch of the same pair does not overwrite the group meeting', () => {
      const seed = [
        makeMatch({ id: 'grp', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 1 }),
        makeMatch({ id: 'qf', stage: 'QF', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
      ]
      const live = [
        // Only the QF result arrives.
        makeMatch({ id: 'l-qf', stage: 'QF', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 2, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      const grp = out.find((m) => m.id === 'grp')!
      const qf = out.find((m) => m.id === 'qf')!
      // group meeting untouched
      expect(grp.homeScore).toBe(1)
      expect(grp.awayScore).toBe(1)
      // QF updated
      expect(qf.status).toBe('finished')
      expect(qf.homeScore).toBe(2)
      expect(qf.awayScore).toBe(0)
    })

    it('updates the correct stage even when both stages exist for a pair (group live)', () => {
      const seed = [
        makeMatch({ id: 'grp', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
        makeMatch({ id: 'r16', stage: 'R16', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
      ]
      const live = [
        makeMatch({ id: 'l-grp', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'live', homeScore: 1, awayScore: 0, minute: 30 }),
      ]
      const out = mergeMatches(seed, live)
      const grp = out.find((m) => m.id === 'grp')!
      const r16 = out.find((m) => m.id === 'r16')!
      expect(grp.status).toBe('live')
      expect(grp.minute).toBe(30)
      expect(r16.status).toBe('scheduled') // untouched
      expect(r16.homeScore).toBeNull()
    })
  })

  describe('appending brand-new live matches', () => {
    it('infers the knockout stage when ESPN reports a resolved bracket match as group', () => {
      const live = [
        makeMatch({
          id: 'espn-rsa-can',
          stage: 'group',
          homeCode: 'RSA',
          awayCode: 'CAN',
          kickoff: '2026-06-28T19:00:00Z',
          status: 'finished',
          homeScore: 1,
          awayScore: 2,
          apiFixtureId: 700073,
        }),
      ]
      const out = mergeMatches(SEED_MATCHES, live)
      const ko = out.find((m) => m.id === 'espn-rsa-can')!
      expect(ko.stage).toBe('R32')

      const resolved = resolveBracket(BRACKET, TEAMS, out)
      const m73 = resolved.find((m) => m.matchNo === 73)!
      expect(m73.status).toBe('finished')
      expect(m73.homeCode).toBe('RSA')
      expect(m73.awayCode).toBe('CAN')
      expect(m73.winnerCode).toBe('CAN')

      const score = scorePredictions({ 73: 'CAN', [PICKED_AT_KEY]: { 73: Date.parse('2026-06-28T18:00:00Z') } }, resolved)
      expect(score.perMatch[73]).toBe('correct')
      expect(score.points).toBe(1)
    })

    it('appends a live match whose pair is not in the seed', () => {
      const seed = [makeMatch({ id: 's1', stage: 'group', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [
        makeMatch({ id: 'new', stage: 'R16', homeCode: 'FRA', awayCode: 'GER', status: 'finished', homeScore: 2, awayScore: 1 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      expect(out[1]).toBe(live[0]) // appended verbatim (same reference, no copy/flip)
      expect(out[1].homeScore).toBe(2)
      expect(out[1].awayScore).toBe(1)
    })

    it('appends a live match for the same pair at a stage not present in the seed', () => {
      const seed = [makeMatch({ id: 's1', stage: 'group', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [
        makeMatch({ id: 'sf', stage: 'SF', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 3, awayScore: 2 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      expect(out.find((m) => m.id === 's1')!.status).toBe('scheduled')
      expect(out.find((m) => m.id === 'sf')!.homeScore).toBe(3)
    })

    it('two distinct new live matches are both appended in order', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [
        makeMatch({ id: 'n1', stage: 'QF', homeCode: 'FRA', awayCode: 'GER', status: 'finished', homeScore: 1, awayScore: 0 }),
        makeMatch({ id: 'n2', stage: 'QF', homeCode: 'ESP', awayCode: 'POR', status: 'finished', homeScore: 0, awayScore: 2 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out.map((m) => m.id)).toEqual(['s1', 'n1', 'n2'])
    })

    it('a second live match for a pair appended in this run updates the first appended one', () => {
      // First live match (new pair) is appended AND indexed; the second live
      // match for the same key then overlays the just-appended one.
      const seed: Match[] = []
      const live = [
        makeMatch({ id: 'first', stage: 'R16', homeCode: 'FRA', awayCode: 'GER', status: 'live', homeScore: 1, awayScore: 0, minute: 50 }),
        makeMatch({ id: 'second', stage: 'R16', homeCode: 'FRA', awayCode: 'GER', status: 'finished', homeScore: 2, awayScore: 1, minute: null, apiFixtureId: 88 }),
      ]
      const out = mergeMatches(seed, live)
      // Only one match for that pair+stage remains; the appended one was overlaid.
      expect(out).toHaveLength(1)
      const m = out[0]
      expect(m.id).toBe('first') // overlay preserves the appended match's id
      expect(m.status).toBe('finished')
      expect(m.homeScore).toBe(2)
      expect(m.awayScore).toBe(1)
      expect(m.minute).toBeNull()
      expect(m.apiFixtureId).toBe(88)
    })
  })

  describe('live matches missing codes are skipped', () => {
    it('skips a live match with a null homeCode', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [
        makeMatch({ id: 'bad', homeCode: null, awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('s1')
      expect(out[0].status).toBe('scheduled')
    })

    it('skips a live match with a null awayCode', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [
        makeMatch({ id: 'bad', homeCode: 'ARG', awayCode: null, status: 'finished', homeScore: 1, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(1)
      expect(out[0].status).toBe('scheduled')
    })

    it('skips a live match with both codes null', () => {
      const seed = [makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' })]
      const live = [makeMatch({ id: 'bad', homeCode: null, awayCode: null, status: 'finished', homeScore: 1, awayScore: 0 })]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(1)
      expect(out[0].id).toBe('s1')
    })

    it('processes valid live matches while skipping invalid ones', () => {
      const seed = [
        makeMatch({ id: 's1', homeCode: 'ARG', awayCode: 'BRA' }),
        makeMatch({ id: 's2', homeCode: 'FRA', awayCode: 'GER' }),
      ]
      const live = [
        makeMatch({ id: 'bad', homeCode: null, awayCode: 'GER', status: 'finished', homeScore: 9, awayScore: 9 }),
        makeMatch({ id: 'good', homeCode: 'FRA', awayCode: 'GER', status: 'finished', homeScore: 2, awayScore: 2 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      expect(out.find((m) => m.id === 's2')!.homeScore).toBe(2)
      expect(out.find((m) => m.id === 's2')!.awayScore).toBe(2)
    })
  })

  describe('seed matches missing codes are left as-is (never indexed)', () => {
    it('an unresolved knockout slot (null codes) is preserved and not matched', () => {
      const seed = [
        makeMatch({
          id: 'slot',
          stage: 'R16',
          homeCode: null,
          awayCode: null,
          homeLabel: 'Winner Group A',
          awayLabel: 'Runner-up Group B',
          status: 'scheduled',
        }),
      ]
      const live = [
        // Even a real result with concrete codes can't match the unindexed slot,
        // so it is appended instead of overlaying the slot.
        makeMatch({ id: 'res', stage: 'R16', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      const slot = out.find((m) => m.id === 'slot')!
      expect(slot.homeCode).toBeNull()
      expect(slot.awayCode).toBeNull()
      expect(slot.homeLabel).toBe('Winner Group A')
      expect(slot.status).toBe('scheduled')
      // the result got appended
      expect(out.find((m) => m.id === 'res')!.status).toBe('finished')
    })

    it('a seed with only homeCode (away null) is not indexed and stays put', () => {
      const seed = [makeMatch({ id: 'half', stage: 'QF', homeCode: 'ARG', awayCode: null, status: 'scheduled' })]
      const live = [
        makeMatch({ id: 'l', stage: 'QF', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 3, awayScore: 1 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      expect(out.find((m) => m.id === 'half')!.status).toBe('scheduled')
      expect(out.find((m) => m.id === 'l')!.homeScore).toBe(3)
    })
  })

  describe('multiple matches / realistic mixed batch', () => {
    it('overlays several, appends new, and leaves untouched all in one pass', () => {
      const seed = [
        makeMatch({ id: 'g1', stage: 'group', group: 'A', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
        makeMatch({ id: 'g2', stage: 'group', group: 'A', homeCode: 'FRA', awayCode: 'GER', status: 'scheduled' }),
        makeMatch({ id: 'slot', stage: 'R16', homeCode: null, awayCode: null, status: 'scheduled' }),
      ]
      const live = [
        // overlay g1, same orientation
        makeMatch({ id: 'lg1', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 2, awayScore: 0 }),
        // overlay g2, SWAPPED orientation (live: GER home 1, FRA away 4)
        makeMatch({ id: 'lg2', stage: 'group', homeCode: 'GER', awayCode: 'FRA', status: 'live', homeScore: 1, awayScore: 4, minute: 70 }),
        // brand new
        makeMatch({ id: 'lnew', stage: 'QF', homeCode: 'ESP', awayCode: 'POR', status: 'finished', homeScore: 1, awayScore: 1, pens: { home: 5, away: 4 } }),
        // invalid -> skipped
        makeMatch({ id: 'lbad', homeCode: null, awayCode: 'BRA', status: 'finished', homeScore: 9, awayScore: 9 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(4) // 3 seed + 1 appended

      const g1 = out.find((m) => m.id === 'g1')!
      expect(g1.status).toBe('finished')
      expect(g1.homeScore).toBe(2)
      expect(g1.awayScore).toBe(0)

      const g2 = out.find((m) => m.id === 'g2')!
      expect(g2.homeCode).toBe('FRA') // seed orientation kept
      expect(g2.awayCode).toBe('GER')
      // swapped: FRA(home) = lm.awayScore = 4; GER(away) = lm.homeScore = 1
      expect(g2.homeScore).toBe(4)
      expect(g2.awayScore).toBe(1)
      expect(g2.minute).toBe(70)
      expect(g2.status).toBe('live')

      const slot = out.find((m) => m.id === 'slot')!
      expect(slot.status).toBe('scheduled') // untouched

      const appended = out.find((m) => m.id === 'lnew')!
      expect(appended.homeScore).toBe(1)
      expect(appended.pens).toEqual({ home: 5, away: 4 })
    })
  })

  describe('duplicate seed keys (later wins the index)', () => {
    it('when two seed matches share a key, the live overlay hits the LAST indexed one', () => {
      // index.set runs in seed order, so the 2nd duplicate overwrites the 1st.
      const seed = [
        makeMatch({ id: 'dupA', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
        makeMatch({ id: 'dupB', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'scheduled' }),
      ]
      const live = [
        makeMatch({ id: 'l', stage: 'group', homeCode: 'ARG', awayCode: 'BRA', status: 'finished', homeScore: 1, awayScore: 0 }),
      ]
      const out = mergeMatches(seed, live)
      expect(out).toHaveLength(2)
      // dupA (first) stays scheduled; dupB (last indexed) is overlaid
      expect(out.find((m) => m.id === 'dupA')!.status).toBe('scheduled')
      expect(out.find((m) => m.id === 'dupB')!.status).toBe('finished')
      expect(out.find((m) => m.id === 'dupB')!.homeScore).toBe(1)
    })
  })
})
