import { describe, it, expect } from 'vitest'
import {
  scorePredictions,
  buildPredictedBracket,
  ROUND_POINTS,
  type Predictions,
} from '@/domain/predict'
import { BRACKET } from '@/data/bracket'
import type {
  BracketMatch,
  ResolvedBracketMatch,
  Stage,
  TeamCode,
} from '@/domain/types'

/* ------------------------------------------------------------------ helpers */

/**
 * Build a ResolvedBracketMatch fixture by hand. We only populate the fields
 * scorePredictions / buildPredictedBracket actually read (matchNo, stage,
 * status, winnerCode, homeCode, awayCode); the rest get harmless defaults so
 * the object still satisfies the interface shape.
 */
function rbm(opts: {
  matchNo: number
  stage: Stage
  status?: ResolvedBracketMatch['status']
  winnerCode?: TeamCode | null
  homeCode?: TeamCode | null
  awayCode?: TeamCode | null
}): ResolvedBracketMatch {
  return {
    matchNo: opts.matchNo,
    stage: opts.stage,
    // BracketMatch structural fields — unused by the functions under test but
    // required by the type. Minimal valid SlotRefs.
    home: { source: { kind: 'matchWinner', matchNo: 0 }, label: 'x' },
    away: { source: { kind: 'matchWinner', matchNo: 0 }, label: 'y' },
    homeCode: opts.homeCode ?? null,
    awayCode: opts.awayCode ?? null,
    homeScore: null,
    awayScore: null,
    status: opts.status ?? 'scheduled',
    winnerCode: opts.winnerCode ?? null,
  }
}

const matchByNo = new Map(BRACKET.map((m) => [m.matchNo, m]))
function bracketMatch(no: number): BracketMatch {
  const m = matchByNo.get(no)
  if (!m) throw new Error(`no bracket match ${no}`)
  return m
}

/* ============================================================= ROUND_POINTS */

describe('ROUND_POINTS', () => {
  it('has the exact documented per-stage values', () => {
    expect(ROUND_POINTS).toEqual({
      group: 0,
      R32: 1,
      R16: 2,
      QF: 3,
      SF: 5,
      F3: 1,
      F: 8,
    })
  })

  it('group stage is worth zero points', () => {
    expect(ROUND_POINTS.group).toBe(0)
  })

  it('the final is the single most valuable match', () => {
    const values = Object.values(ROUND_POINTS)
    expect(Math.max(...values)).toBe(8)
    expect(ROUND_POINTS.F).toBe(8)
  })
})

/* ========================================================== scorePredictions */

describe('scorePredictions', () => {
  describe('empty / trivial inputs', () => {
    it('returns all-zero totals and empty perMatch for no resolved matches', () => {
      const s = scorePredictions({ 73: 'ARG' }, [])
      expect(s).toEqual({ points: 0, correct: 0, graded: 0, perMatch: {} })
    })

    it('marks every resolved match unpicked when predictions is empty', () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
        rbm({ matchNo: 74, stage: 'R32', status: 'scheduled' }),
      ]
      const s = scorePredictions({}, resolved)
      expect(s.points).toBe(0)
      expect(s.correct).toBe(0)
      expect(s.graded).toBe(0)
      expect(s.perMatch).toEqual({ 73: 'unpicked', 74: 'unpicked' })
    })
  })

  describe('per-match status branches', () => {
    it("'correct' when the pick equals a finished match winner", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 73: 'ARG' }, resolved)
      expect(s.perMatch[73]).toBe('correct')
      expect(s.correct).toBe(1)
      expect(s.graded).toBe(1)
      expect(s.points).toBe(ROUND_POINTS.R32) // 1
    })

    it("'wrong' when the pick differs from a finished match winner", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'BRA', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 73: 'ARG' }, resolved)
      expect(s.perMatch[73]).toBe('wrong')
      expect(s.correct).toBe(0)
      expect(s.graded).toBe(1) // still graded — match is finished
      expect(s.points).toBe(0)
    })

    it("'pending' when a picked match is finished but has no winnerCode (draw/undecided)", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: null, homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 73: 'ARG' }, resolved)
      expect(s.perMatch[73]).toBe('pending')
      expect(s.graded).toBe(0) // not graded without a winnerCode
      expect(s.correct).toBe(0)
      expect(s.points).toBe(0)
    })

    it("'pending' when a picked match is not finished (scheduled)", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'scheduled', winnerCode: null }),
      ]
      const s = scorePredictions({ 73: 'ARG' }, resolved)
      expect(s.perMatch[73]).toBe('pending')
      expect(s.graded).toBe(0)
    })

    it("'pending' when a picked match is live, even with an interim winnerCode", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'live', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 73: 'ARG' }, resolved)
      // Only 'finished' matches are graded — a live leader is not yet scored.
      expect(s.perMatch[73]).toBe('pending')
      expect(s.graded).toBe(0)
      expect(s.points).toBe(0)
    })

    it("'unpicked' when there is no prediction for that match", () => {
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 99: 'GER' }, resolved)
      expect(s.perMatch[73]).toBe('unpicked')
      expect(s.graded).toBe(0)
      expect(s.correct).toBe(0)
      expect(s.points).toBe(0)
    })
  })

  describe('round-weighted points per stage', () => {
    const cases: Array<[Stage, number]> = [
      ['group', 0],
      ['R32', 1],
      ['R16', 2],
      ['QF', 3],
      ['SF', 5],
      ['F3', 1],
      ['F', 8],
    ]
    it.each(cases)('a correct %s pick awards %i point(s)', (stage, pts) => {
      const resolved = [
        rbm({ matchNo: 1, stage, status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 1: 'ARG' }, resolved)
      expect(s.points).toBe(pts)
      expect(s.correct).toBe(1)
      expect(s.graded).toBe(1)
    })

    it('a correct group pick is graded and counted as correct but adds zero points', () => {
      const resolved = [
        rbm({ matchNo: 1, stage: 'group', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const s = scorePredictions({ 1: 'ARG' }, resolved)
      expect(s.points).toBe(0)
      expect(s.correct).toBe(1)
      expect(s.graded).toBe(1)
      expect(s.perMatch[1]).toBe('correct')
    })
  })

  describe('mixed set — totals add up across statuses', () => {
    it('tallies points, correct and graded across every branch at once', () => {
      const resolved = [
        // correct R32  -> +1
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
        // correct SF   -> +5
        rbm({ matchNo: 101, stage: 'SF', status: 'finished', winnerCode: 'FRA', homeCode: 'FRA', awayCode: 'ESP' }),
        // correct F    -> +8
        rbm({ matchNo: 104, stage: 'F', status: 'finished', winnerCode: 'FRA', homeCode: 'FRA', awayCode: 'ARG' }),
        // wrong QF     -> +0, graded
        rbm({ matchNo: 97, stage: 'QF', status: 'finished', winnerCode: 'GER', homeCode: 'GER', awayCode: 'ENG' }),
        // pending (finished, no winner)
        rbm({ matchNo: 90, stage: 'R16', status: 'finished', winnerCode: null, homeCode: 'POR', awayCode: 'NED' }),
        // pending (scheduled, picked)
        rbm({ matchNo: 91, stage: 'R16', status: 'scheduled' }),
        // unpicked (finished)
        rbm({ matchNo: 92, stage: 'R16', status: 'finished', winnerCode: 'ITA', homeCode: 'ITA', awayCode: 'CRO' }),
      ]
      const predictions: Predictions = {
        73: 'ARG', // correct
        101: 'FRA', // correct
        104: 'FRA', // correct
        97: 'ENG', // wrong
        90: 'POR', // pending (finished no winner)
        91: 'ITA', // pending (scheduled)
        // 92 intentionally unpicked
      }
      const s = scorePredictions(predictions, resolved)

      expect(s.points).toBe(1 + 5 + 8) // 14
      expect(s.correct).toBe(3)
      // graded = finished matches that had a winnerCode AND a pick = 73,101,104,97
      expect(s.graded).toBe(4)
      expect(s.perMatch).toEqual({
        73: 'correct',
        101: 'correct',
        104: 'correct',
        97: 'wrong',
        90: 'pending',
        91: 'pending',
        92: 'unpicked',
      })
    })
  })

  describe('determinism & isolation', () => {
    it('does not mutate the inputs', () => {
      const predictions: Predictions = { 73: 'ARG' }
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', status: 'finished', winnerCode: 'ARG', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const predSnapshot = JSON.stringify(predictions)
      const resSnapshot = JSON.stringify(resolved)
      scorePredictions(predictions, resolved)
      expect(JSON.stringify(predictions)).toBe(predSnapshot)
      expect(JSON.stringify(resolved)).toBe(resSnapshot)
    })
  })
})

/* ====================================================== buildPredictedBracket */

describe('buildPredictedBracket', () => {
  it('returns an entry for every bracket match', () => {
    const out = buildPredictedBracket(BRACKET, [], {})
    expect(Object.keys(out).length).toBe(BRACKET.length)
    for (const m of BRACKET) {
      expect(out[m.matchNo]).toBeDefined()
    }
  })

  describe('R32 slots come from real group results', () => {
    it('fills R32 occupants from the resolved match (per side), ignoring predictions for the slot itself', () => {
      // Match 73: Runner-up A vs Runner-up B (group-derived on both sides).
      const resolved = [
        rbm({ matchNo: 73, stage: 'R32', homeCode: 'ARG', awayCode: 'BRA' }),
      ]
      const out = buildPredictedBracket([bracketMatch(73)], resolved, {})
      expect(out[73]).toEqual({ homeCode: 'ARG', awayCode: 'BRA' })
    })

    it('yields null occupants for an R32 match the group stage has not resolved', () => {
      const out = buildPredictedBracket([bracketMatch(73)], [], {})
      expect(out[73]).toEqual({ homeCode: null, awayCode: null })
    })

    it('uses the side-specific real code (home from real home, away from real away)', () => {
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
      ]
      // Match 74: Winner E (home) vs 3rd A/B/C/D/F (away)
      const out = buildPredictedBracket([bracketMatch(74)], resolved, {})
      expect(out[74].homeCode).toBe('ESP')
      expect(out[74].awayCode).toBe('POR')
    })
  })

  describe('matchWinner propagation', () => {
    it('fills a later slot with the user predicted winner of the feeding match', () => {
      // R32 feeders 74 and 77 -> R16 match 89 (home = winner 74, away = winner 77).
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
        rbm({ matchNo: 77, stage: 'R32', homeCode: 'GER', awayCode: 'NED' }),
      ]
      const predictions: Predictions = { 74: 'ESP', 77: 'NED' }
      const out = buildPredictedBracket(
        [bracketMatch(74), bracketMatch(77), bracketMatch(89)],
        resolved,
        predictions,
      )
      expect(out[74]).toEqual({ homeCode: 'ESP', awayCode: 'POR' })
      expect(out[77]).toEqual({ homeCode: 'GER', awayCode: 'NED' })
      expect(out[89]).toEqual({ homeCode: 'ESP', awayCode: 'NED' })
    })

    it('leaves a downstream slot null when the feeder match has no prediction', () => {
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
        rbm({ matchNo: 77, stage: 'R32', homeCode: 'GER', awayCode: 'NED' }),
      ]
      const predictions: Predictions = { 74: 'ESP' } // 77 unpicked
      const out = buildPredictedBracket(
        [bracketMatch(74), bracketMatch(77), bracketMatch(89)],
        resolved,
        predictions,
      )
      expect(out[89]).toEqual({ homeCode: 'ESP', awayCode: null })
    })

    it('rejects a stale pick that is no longer one of the feeder occupants (returns null)', () => {
      // Feeder 74 resolves to ESP vs POR, but the saved pick says BRA — stale.
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
        rbm({ matchNo: 77, stage: 'R32', homeCode: 'GER', awayCode: 'NED' }),
      ]
      const predictions: Predictions = { 74: 'BRA', 77: 'NED' }
      const out = buildPredictedBracket(
        [bracketMatch(74), bracketMatch(77), bracketMatch(89)],
        resolved,
        predictions,
      )
      expect(out[89].homeCode).toBeNull() // stale pick rejected
      expect(out[89].awayCode).toBe('NED')
    })

    it('accepts a pick whose feeder occupants are not yet fully known (no staleness check possible)', () => {
      // Feeder 77 has no resolved occupants AND no upstream prediction, so
      // out[77] = { null, null }. The staleness guard only fires when BOTH
      // feeder occupants are known, so any pick is accepted here.
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
        // 77 not resolved
      ]
      const predictions: Predictions = { 74: 'ESP', 77: 'SOMETEAM' }
      const out = buildPredictedBracket(
        [bracketMatch(74), bracketMatch(77), bracketMatch(89)],
        resolved,
        predictions,
      )
      expect(out[77]).toEqual({ homeCode: null, awayCode: null })
      expect(out[89]).toEqual({ homeCode: 'ESP', awayCode: 'SOMETEAM' })
    })
  })

  describe('matchLoser propagation (third-place play-off, match 103)', () => {
    // Match 103: Loser M101 (home) vs Loser M102 (away). The SF feeders are
    // 101 (winners of 97 & 98) and 102 (winners of 99 & 100). We supply the SF
    // occupants directly via resolved on the SF matches? No — SF occupants come
    // from QF predictions. To keep this focused we resolve the QFs and predict
    // forward to SF, then to the loser slot.
    function buildFullSemiSetup(predictions: Predictions) {
      const resolved = [
        // SF 101 feeders: winners of QF 97 and 98. Resolve those QFs' occupants.
        rbm({ matchNo: 97, stage: 'QF', homeCode: 'FRA', awayCode: 'ESP' }),
        rbm({ matchNo: 98, stage: 'QF', homeCode: 'GER', awayCode: 'ENG' }),
        rbm({ matchNo: 99, stage: 'QF', homeCode: 'ARG', awayCode: 'BRA' }),
        rbm({ matchNo: 100, stage: 'QF', homeCode: 'POR', awayCode: 'NED' }),
      ]
      const chain = [97, 98, 99, 100, 101, 102, 103, 104].map(bracketMatch)
      return buildPredictedBracket(chain, resolved, predictions)
    }

    it('the loser slot is the OTHER feeder occupant (not the predicted winner)', () => {
      const predictions: Predictions = {
        97: 'FRA', 98: 'GER', 99: 'ARG', 100: 'POR', // QF winners
        101: 'FRA', // SF1: FRA vs GER -> FRA wins, GER loses
        102: 'ARG', // SF2: ARG vs POR -> ARG wins, POR loses
      }
      const out = buildFullSemiSetup(predictions)
      // SF occupants
      expect(out[101]).toEqual({ homeCode: 'FRA', awayCode: 'GER' })
      expect(out[102]).toEqual({ homeCode: 'ARG', awayCode: 'POR' })
      // Third-place play-off = losers of each SF
      expect(out[103]).toEqual({ homeCode: 'GER', awayCode: 'POR' })
      // Final = winners of each SF
      expect(out[104]).toEqual({ homeCode: 'FRA', awayCode: 'ARG' })
    })

    it('loser slot returns null when the SF has no winner prediction', () => {
      const predictions: Predictions = {
        97: 'FRA', 98: 'GER', 99: 'ARG', 100: 'POR',
        // 101 picked, 102 NOT picked
        101: 'FRA',
      }
      const out = buildFullSemiSetup(predictions)
      expect(out[103].homeCode).toBe('GER') // loser of 101 known
      expect(out[103].awayCode).toBeNull() // 102 has no winner pick
    })

    it('loser slot returns null on a stale SF winner pick', () => {
      const predictions: Predictions = {
        97: 'FRA', 98: 'GER', 99: 'ARG', 100: 'POR',
        101: 'ITA', // ITA is not in SF1 (FRA vs GER) -> stale
        102: 'ARG',
      }
      const out = buildFullSemiSetup(predictions)
      // SF1's own occupants are unaffected by the stale 101 pick (they come from
      // the QF winners): FRA vs GER.
      expect(out[101]).toEqual({ homeCode: 'FRA', awayCode: 'GER' })
      // But the loser-of-101 cannot be derived: the winner pick 'ITA' is neither
      // FRA nor GER, so the matchLoser slot is rejected to null.
      expect(out[103].homeCode).toBeNull()
      expect(out[103].awayCode).toBe('POR') // loser of valid SF2 (ARG beats POR)
    })
  })

  describe('full propagation to the champion', () => {
    it('propagates a single team all the way from R32 to the final winner slot', () => {
      // Pick ESP to win every match on one half of the bracket:
      // 74 -> 89 -> 97 -> 101 -> 104.
      // Provide ESP as an R32 occupant of 74, and the opposing winners so the
      // staleness guard is satisfied at each merge point.
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'X3' }),
        rbm({ matchNo: 77, stage: 'R32', homeCode: 'GER', awayCode: 'NED' }),
        rbm({ matchNo: 73, stage: 'R32', homeCode: 'A1', awayCode: 'A2' }),
        rbm({ matchNo: 75, stage: 'R32', homeCode: 'B1', awayCode: 'B2' }),
        rbm({ matchNo: 78, stage: 'R32', homeCode: 'C1', awayCode: 'C2' }),
        rbm({ matchNo: 76, stage: 'R32', homeCode: 'D1', awayCode: 'D2' }),
      ]
      const predictions: Predictions = {
        // R32 winners feeding 89 & 90 & 91 ...
        74: 'ESP', 77: 'GER',
        73: 'A1', 75: 'B1',
        76: 'D1', 78: 'C1',
        // R16
        89: 'ESP', // ESP vs GER -> ESP
        90: 'A1', // A1 vs B1 -> A1
        91: 'D1', // D1 vs C1 -> D1
        // QF
        97: 'ESP', // winner89 vs winner90 = ESP vs A1 -> ESP
        // SF
        101: 'ESP', // winner97 vs winner98
        // Final
        104: 'ESP',
      }
      const chain = [73, 74, 75, 76, 77, 78, 89, 90, 91, 97, 101, 104].map(bracketMatch)
      const out = buildPredictedBracket(chain, resolved, predictions)

      expect(out[89].homeCode).toBe('ESP')
      expect(out[97].homeCode).toBe('ESP') // winner of 89
      expect(out[101].homeCode).toBe('ESP') // winner of 97
      expect(out[104].homeCode).toBe('ESP') // winner of 101 -> final
    })
  })

  describe('ordering independence', () => {
    it('produces identical output regardless of input bracket order (it sorts internally)', () => {
      const resolved = [
        rbm({ matchNo: 74, stage: 'R32', homeCode: 'ESP', awayCode: 'POR' }),
        rbm({ matchNo: 77, stage: 'R32', homeCode: 'GER', awayCode: 'NED' }),
      ]
      const predictions: Predictions = { 74: 'ESP', 77: 'NED' }
      const forward = buildPredictedBracket(
        [bracketMatch(74), bracketMatch(77), bracketMatch(89)],
        resolved,
        predictions,
      )
      const shuffled = buildPredictedBracket(
        [bracketMatch(89), bracketMatch(77), bracketMatch(74)],
        resolved,
        predictions,
      )
      expect(shuffled).toEqual(forward)
      expect(shuffled[89]).toEqual({ homeCode: 'ESP', awayCode: 'NED' })
    })
  })

  describe('against the real full BRACKET', () => {
    it('with no results and no predictions, every R32 occupant is null and downstream is null', () => {
      const out = buildPredictedBracket(BRACKET, [], {})
      // R32 (group-derived) -> null because nothing resolved
      expect(out[73]).toEqual({ homeCode: null, awayCode: null })
      // R16 winner-of-match -> null because no predictions
      expect(out[89]).toEqual({ homeCode: null, awayCode: null })
      // Final -> null
      expect(out[104]).toEqual({ homeCode: null, awayCode: null })
      // Third place -> null
      expect(out[103]).toEqual({ homeCode: null, awayCode: null })
    })
  })
})
