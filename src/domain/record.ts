import type { GroupId, Match, StandingRow, TeamCode } from './types'

/** Result of a finished match from one team's perspective. */
export type Result = 'W' | 'D' | 'L'

export function involves(m: Match, code: TeamCode): boolean {
  return m.homeCode === code || m.awayCode === code
}

/** The result for `code` in match `m`, or null if not finished / not involved. */
export function resultFor(m: Match, code: TeamCode): Result | null {
  if (m.status !== 'finished') return null
  if (m.homeScore == null || m.awayScore == null) return null
  const isHome = m.homeCode === code
  const isAway = m.awayCode === code
  if (!isHome && !isAway) return null
  const own = isHome ? m.homeScore : m.awayScore
  const opp = isHome ? m.awayScore : m.homeScore
  if (own > opp) return 'W'
  if (own < opp) return 'L'
  // Knockout draws are decided on penalties — fold the shootout in.
  if (m.pens) {
    const ownP = isHome ? m.pens.home : m.pens.away
    const oppP = isHome ? m.pens.away : m.pens.home
    if (ownP > oppP) return 'W'
    if (ownP < oppP) return 'L'
  }
  return 'D'
}

/** All of a team's matches in kickoff order. */
export function matchesFor(matches: Match[], code: TeamCode): Match[] {
  return matches
    .filter((m) => involves(m, code))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
}

/** Finished matches for a team, oldest first. */
export function finishedFor(matches: Match[], code: TeamCode): Match[] {
  return matchesFor(matches, code).filter((m) => resultFor(m, code) !== null)
}

export interface TeamRecord {
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  played: number
  form: Result[]
}

export function recordFor(matches: Match[], code: TeamCode): TeamRecord {
  const rec: TeamRecord = { win: 0, draw: 0, loss: 0, gf: 0, ga: 0, played: 0, form: [] }
  for (const m of finishedFor(matches, code)) {
    const r = resultFor(m, code)!
    const isHome = m.homeCode === code
    const own = (isHome ? m.homeScore : m.awayScore) ?? 0
    const opp = (isHome ? m.awayScore : m.homeScore) ?? 0
    rec.played++
    rec.gf += own
    rec.ga += opp
    rec.form.push(r)
    if (r === 'W') rec.win++
    else if (r === 'D') rec.draw++
    else rec.loss++
  }
  return rec
}

/** The team's next not-yet-finished match, if any. */
export function nextMatchFor(matches: Match[], code: TeamCode): Match | null {
  const upcoming = matchesFor(matches, code).filter((m) => m.status !== 'finished')
  return upcoming[0] ?? null
}

/** A live match the team is currently playing, if any. */
export function liveMatchFor(matches: Match[], code: TeamCode): Match | null {
  return matchesFor(matches, code).find((m) => m.status === 'live') ?? null
}

/**
 * Compute a group's standings table from finished group matches only.
 * (When the live API provides standings we prefer those; this is the fallback
 * and what the seed snapshot uses.)
 */
export function computeGroupStandings(matches: Match[], group: GroupId, teams: TeamCode[]): StandingRow[] {
  const rows = new Map<TeamCode, StandingRow>()
  for (const code of teams) {
    rows.set(code, {
      code,
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: [],
      rank: 0,
    })
  }

  const groupMatches = matches
    .filter((m) => m.stage === 'group' && m.group === group && m.status === 'finished')
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  for (const m of groupMatches) {
    if (m.homeCode == null || m.awayCode == null) continue
    if (m.homeScore == null || m.awayScore == null) continue
    const home = rows.get(m.homeCode)
    const away = rows.get(m.awayCode)
    if (!home || !away) continue
    home.played++
    away.played++
    home.gf += m.homeScore
    home.ga += m.awayScore
    away.gf += m.awayScore
    away.ga += m.homeScore
    if (m.homeScore > m.awayScore) {
      home.win++, away.loss++, (home.points += 3)
      home.form.push('W'), away.form.push('L')
    } else if (m.homeScore < m.awayScore) {
      away.win++, home.loss++, (away.points += 3)
      away.form.push('W'), home.form.push('L')
    } else {
      home.draw++, away.draw++, (home.points += 1), (away.points += 1)
      home.form.push('D'), away.form.push('D')
    }
  }

  const out = [...rows.values()]
  for (const r of out) r.gd = r.gf - r.ga
  // FIFA group ranking (Art. 14): overall points, GD, GF; then, among any teams
  // still level, a head-to-head mini-table (points, GD, GF using only matches
  // between the tied teams). Remaining ties keep a stable order rather than an
  // arbitrary alphabetical one (the further criteria — fair play, FIFA ranking,
  // drawing of lots — aren't available in this data).
  out.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
  const ranked = breakTiesByHeadToHead(out, groupMatches)
  ranked.forEach((r, i) => (r.rank = i + 1))
  return ranked
}

/** Reorder clusters of teams level on points/GD/GF using a head-to-head mini-table. */
function breakTiesByHeadToHead(rows: StandingRow[], groupMatches: Match[]): StandingRow[] {
  const result: StandingRow[] = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (
      j < rows.length &&
      rows[j].points === rows[i].points &&
      rows[j].gd === rows[i].gd &&
      rows[j].gf === rows[i].gf
    ) {
      j++
    }
    const cluster = rows.slice(i, j)
    if (cluster.length > 1) {
      const codes = new Set(cluster.map((r) => r.code))
      const mini = new Map(cluster.map((r) => [r.code, { pts: 0, gd: 0, gf: 0 }]))
      for (const m of groupMatches) {
        if (m.homeCode == null || m.awayCode == null || m.homeScore == null || m.awayScore == null) continue
        if (!codes.has(m.homeCode) || !codes.has(m.awayCode)) continue
        const h = mini.get(m.homeCode)!
        const a = mini.get(m.awayCode)!
        h.gf += m.homeScore
        h.gd += m.homeScore - m.awayScore
        a.gf += m.awayScore
        a.gd += m.awayScore - m.homeScore
        if (m.homeScore > m.awayScore) h.pts += 3
        else if (m.homeScore < m.awayScore) a.pts += 3
        else (h.pts += 1), (a.pts += 1)
      }
      cluster.sort((x, y) => {
        const mx = mini.get(x.code)!
        const my = mini.get(y.code)!
        return my.pts - mx.pts || my.gd - mx.gd || my.gf - mx.gf
      })
    }
    result.push(...cluster)
    i = j
  }
  return result
}
