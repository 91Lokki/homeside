import type {
  BracketMatch,
  GroupId,
  Match,
  ResolvedBracketMatch,
  SlotRef,
  StandingRow,
  Stage,
  Team,
  TeamCode,
} from './types'
import { computeGroupStandings, resultFor } from './record'

export const STAGE_ORDER: Stage[] = ['R32', 'R16', 'QF', 'SF', 'F3', 'F']
export const STAGE_LABEL: Record<Stage, string> = {
  group: 'Group stage',
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  F3: 'Third place',
  F: 'Final',
}

interface ResolveContext {
  standings: Map<GroupId, StandingRow[]>
  complete: Map<GroupId, boolean>
  thirdAssign: Map<number, TeamCode>
  koResult: Map<number, { winner: TeamCode | null; loser: TeamCode | null }>
}

/** Group winners that face a third-placed team, matched to the slot match number. */
function buildContext(bracket: BracketMatch[], teams: Team[], matches: Match[]): ResolveContext {
  const byGroup = new Map<GroupId, TeamCode[]>()
  for (const t of teams) {
    const arr = byGroup.get(t.group) ?? []
    arr.push(t.code)
    byGroup.set(t.group, arr)
  }

  const standings = new Map<GroupId, StandingRow[]>()
  const complete = new Map<GroupId, boolean>()
  for (const [g, codes] of byGroup) {
    standings.set(g, computeGroupStandings(matches, g, codes))
    const finished = matches.filter((m) => m.stage === 'group' && m.group === g && m.status === 'finished').length
    complete.set(g, finished >= 6)
  }

  // Best third-placed assignment — only when every group has finished.
  const thirdAssign = new Map<number, TeamCode>()
  const allComplete = [...complete.values()].every(Boolean)
  if (allComplete) assignThirds(bracket, standings, thirdAssign)

  // Knockout results (from live data, when present): map a finished KO match to
  // its bracket match number by comparing resolved occupants.
  const koResult = new Map<number, { winner: TeamCode | null; loser: TeamCode | null }>()
  // Filled lazily during resolution below (see resolveAll).

  return { standings, complete, thirdAssign, koResult }
}

/** Find a valid assignment of the 8 qualifying thirds to the 8 third slots. */
function assignThirds(
  bracket: BracketMatch[],
  standings: Map<GroupId, StandingRow[]>,
  out: Map<number, TeamCode>,
) {
  // Collect each group's 3rd-placed team, ranked across groups.
  const thirds = [...standings.entries()]
    .map(([g, rows]) => ({ group: g, row: rows[2] }))
    .filter((x) => x.row)
    // points, then GD, then GF. Remaining ties stay in a stable order (the next
    // FIFA criteria — fair play, FIFA ranking — aren't available in this data),
    // rather than being decided by an arbitrary alphabetical group letter.
    .sort((a, b) => b.row.points - a.row.points || b.row.gd - a.row.gd || b.row.gf - a.row.gf)
  const qualifying = thirds.slice(0, 8) // 8 best thirds
  const qualifyingGroups = new Set(qualifying.map((q) => q.group))

  // The third-place slots, each with its candidate groups.
  const slots = bracket
    .filter((m) => m.home.source.kind === 'third' || m.away.source.kind === 'third')
    .map((m) => {
      const ref = m.home.source.kind === 'third' ? m.home : m.away
      const groups = ref.source.kind === 'third' ? ref.source.groups : []
      return { matchNo: m.matchNo, groups: groups.filter((g) => qualifyingGroups.has(g)) }
    })

  // Backtracking perfect matching (8x8, trivially small).
  const byGroup = new Map(qualifying.map((q) => [q.group, q.row.code]))
  const usedGroups = new Set<GroupId>()
  const order = [...slots].sort((a, b) => a.groups.length - b.groups.length) // most-constrained first

  const solve = (i: number): boolean => {
    if (i === order.length) return true
    for (const g of order[i].groups) {
      if (usedGroups.has(g)) continue
      usedGroups.add(g)
      out.set(order[i].matchNo, byGroup.get(g)!)
      if (solve(i + 1)) return true
      usedGroups.delete(g)
      out.delete(order[i].matchNo)
    }
    return false
  }
  solve(0)
}

/**
 * Resolve every bracket match's occupants from real results. Group winners /
 * runners-up / best-thirds come from completed groups; knockout occupants come
 * from earlier knockout results once those are known (live data).
 */
export function resolveBracket(bracket: BracketMatch[], teams: Team[], matches: Match[]): ResolvedBracketMatch[] {
  const ctx = buildContext(bracket, teams, matches)
  const byNo = new Map(bracket.map((m) => [m.matchNo, m]))
  const resolvedCache = new Map<number, ResolvedBracketMatch>()

  // Index finished knockout matches by the unordered code pair, so live KO
  // results can be attached to the right bracket match once occupants resolve.
  const finishedKo = matches.filter((m) => m.stage !== 'group' && m.status === 'finished' && m.homeCode && m.awayCode)

  function slotCode(ref: SlotRef): TeamCode | null {
    const s = ref.source
    if (s.kind === 'winner') return ctx.complete.get(s.group) ? ctx.standings.get(s.group)![0]?.code ?? null : null
    if (s.kind === 'runnerUp') return ctx.complete.get(s.group) ? ctx.standings.get(s.group)![1]?.code ?? null : null
    if (s.kind === 'third') return ctx.thirdAssign.get(refMatchNo(ref)) ?? null
    if (s.kind === 'matchWinner') return resolve(s.matchNo)?.winnerCode ?? null
    if (s.kind === 'matchLoser') {
      const r = resolve(s.matchNo)
      if (!r || r.status !== 'finished' || r.winnerCode == null) return null
      return r.homeCode === r.winnerCode ? r.awayCode : r.homeCode
    }
    return null
  }

  function refMatchNo(ref: SlotRef): number {
    // third slots are identified by their bracket match number
    for (const m of bracket) {
      if (m.home === ref || m.away === ref) return m.matchNo
    }
    return -1
  }

  function resolve(no: number): ResolvedBracketMatch | undefined {
    if (resolvedCache.has(no)) return resolvedCache.get(no)
    const def = byNo.get(no)
    if (!def) return undefined

    const homeCode = slotCode(def.home)
    const awayCode = slotCode(def.away)

    // attach a finished KO result if one matches these two occupants
    let homeScore: number | null = null
    let awayScore: number | null = null
    let pens: { home: number; away: number } | undefined
    let status: ResolvedBracketMatch['status'] = 'scheduled'
    let winnerCode: TeamCode | null = null

    if (homeCode && awayCode) {
      const ko = finishedKo.find(
        (m) =>
          (m.homeCode === homeCode && m.awayCode === awayCode) ||
          (m.homeCode === awayCode && m.awayCode === homeCode),
      )
      if (ko) {
        const flip = ko.homeCode !== homeCode
        homeScore = flip ? ko.awayScore : ko.homeScore
        awayScore = flip ? ko.homeScore : ko.awayScore
        pens = ko.pens ? (flip ? { home: ko.pens.away, away: ko.pens.home } : ko.pens) : undefined
        status = 'finished'
        const r = resultFor(ko, homeCode)
        winnerCode = r === 'W' ? homeCode : r === 'L' ? awayCode : null
      }
    }

    const out: ResolvedBracketMatch = {
      ...def,
      homeCode,
      awayCode,
      homeScore,
      awayScore,
      pens,
      status,
      winnerCode,
    }
    resolvedCache.set(no, out)
    return out
  }

  return bracket.map((m) => resolve(m.matchNo)!).sort((a, b) => a.matchNo - b.matchNo)
}

/**
 * The home team's structural path to the final: the fixed chain of bracket
 * matches it would play, found from its R32 slot and followed forward through
 * the wiring. Returns the set of match numbers to highlight.
 */
export function homePath(resolved: ResolvedBracketMatch[], homeCode: TeamCode | null): Set<number> {
  const path = new Set<number>()
  if (!homeCode) return path
  const byNo = new Map(resolved.map((m) => [m.matchNo, m]))

  // entry: the R32 match this team occupies
  let current = resolved.find((m) => m.stage === 'R32' && (m.homeCode === homeCode || m.awayCode === homeCode))
  if (!current) return path

  while (current) {
    path.add(current.matchNo)
    // find the next match that consumes this match's winner
    const next = resolved.find(
      (m) =>
        (m.home.source.kind === 'matchWinner' && m.home.source.matchNo === current!.matchNo) ||
        (m.away.source.kind === 'matchWinner' && m.away.source.matchNo === current!.matchNo),
    )
    if (!next) break
    current = byNo.get(next.matchNo)
  }
  return path
}
