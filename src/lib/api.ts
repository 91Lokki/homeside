import { TEAMS } from '@/data/teams'
import type { Match, Stage, TeamCode } from '@/domain/types'

/**
 * Frontend data access. Talks ONLY to our own /api proxy (never to Highlightly
 * directly — the key lives server-side). When the proxy reports no key / an
 * error, we return null and the app keeps the real seed snapshot untouched.
 * Nothing here ever invents a result.
 */

interface ProxyResult {
  source?: 'none' | 'error' | 'highlightly'
  reason?: string
  matches?: unknown[]
}

async function getProxy(path: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as ProxyResult
    if (data.source !== 'highlightly') return null
    return Array.isArray(data.matches) ? data.matches : null
  } catch {
    return null
  }
}

/* --------------------------- name -> code mapping ------------------------- */

// Highlightly's WC team names reconciled to the seed's 3-letter codes. Names that
// already match a seed team verbatim don't need an entry here.
const ALIASES: Record<string, TeamCode> = {
  'united states': 'USA',
  usa: 'USA',
  'korea republic': 'KOR',
  'south korea': 'KOR',
  turkey: 'TUR',
  türkiye: 'TUR',
  'czech republic': 'CZE',
  czechia: 'CZE',
  'ivory coast': 'CIV',
  "côte d'ivoire": 'CIV',
  "cote d'ivoire": 'CIV',
  'cape verde islands': 'CPV',
  'cape verde': 'CPV',
  'cabo verde': 'CPV',
  curacao: 'CUW',
  curaçao: 'CUW',
  'dr congo': 'COD',
  'congo dr': 'COD',
  'democratic republic of the congo': 'COD',
  'saudi arabia': 'KSA',
  'bosnia and herzegovina': 'BIH', // "Bosnia & Herzegovina" is normalized to this below
  bosnia: 'BIH',
  'ir iran': 'IRN',
  iran: 'IRN',
  'south africa': 'RSA',
}

const NAME_TO_CODE: Record<string, TeamCode> = (() => {
  const m: Record<string, TeamCode> = { ...ALIASES }
  for (const t of TEAMS) m[t.name.toLowerCase()] = t.code
  return m
})()

function codeFromName(name: string | undefined): TeamCode | null {
  if (!name) return null
  // Normalize curly apostrophes and "&" -> "and" so e.g. "Bosnia & Herzegovina"
  // and "Côte d'Ivoire" match regardless of punctuation.
  const key = name
    .toLowerCase()
    .trim()
    .replace(/[’`´]/g, "'")
    .replace(/\s*&\s*/g, ' and ')
  return NAME_TO_CODE[key] ?? null
}

/* ------------------------- Highlightly normalizers ------------------------ */

/** Highlightly group rounds are "Group Stage - N" (no letter); the seed carries
 *  the group letter, so for group matches we only need stage = 'group'. */
function stageFromRound(round: string | undefined): Stage {
  const r = (round ?? '').toLowerCase()
  if (r.includes('group')) return 'group'
  if (r.includes('round of 32') || r.includes('r32')) return 'R32'
  if (r.includes('round of 16') || r.includes('r16')) return 'R16'
  if (r.includes('quarter')) return 'QF'
  if (r.includes('semi')) return 'SF'
  if (r.includes('third') || r.includes('3rd') || r.includes('play-off')) return 'F3'
  if (r.includes('final')) return 'F'
  return 'group'
}

function isFinished(description: string | undefined): boolean {
  const d = (description ?? '').toLowerCase()
  return d.includes('finish') || d.includes('after extra') || d.includes('penalt') || d === 'aet' || d === 'ft'
}

/** Parse a Highlightly score string like "3 - 1" into numbers. */
function parseScore(s: string | null | undefined): { home: number; away: number } | null {
  if (!s) return null
  const m = String(s).split(/\s*[-–]\s*/)
  if (m.length !== 2) return null
  const home = Number(m[0])
  const away = Number(m[1])
  if (Number.isNaN(home) || Number.isNaN(away)) return null
  return { home, away }
}

interface HlTeam {
  id?: number
  name?: string
}
interface HlMatch {
  id?: number
  round?: string
  date?: string
  state?: { description?: string; clock?: number | null; score?: { current?: string | null; penalties?: string | null } }
  homeTeam?: HlTeam
  awayTeam?: HlTeam
}

function normalizeMatch(hl: HlMatch): Match | null {
  const homeCode = codeFromName(hl.homeTeam?.name)
  const awayCode = codeFromName(hl.awayTeam?.name)
  if (!homeCode || !awayCode) return null

  const finished = isFinished(hl.state?.description)
  const score = finished ? parseScore(hl.state?.score?.current) : null
  const pens = finished ? parseScore(hl.state?.score?.penalties) : null

  return {
    id: `hl-${hl.id}`,
    stage: stageFromRound(hl.round),
    homeCode,
    awayCode,
    kickoff: hl.date ?? new Date().toISOString(),
    status: finished ? 'finished' : 'scheduled',
    homeScore: score ? score.home : null,
    awayScore: score ? score.away : null,
    minute: null,
    pens: pens ?? undefined,
    apiFixtureId: hl.id,
  }
}

/**
 * Fetch real, FINISHED match results from the proxy. Low-frequency results
 * updater — not live: only final scores reach the app. Returns null when the
 * proxy has no key (the caller then keeps the real seed snapshot untouched).
 */
export async function fetchResults(): Promise<Match[] | null> {
  const raw = await getProxy('/api/fixtures')
  if (!raw) return null
  return raw
    .map((x) => normalizeMatch(x as HlMatch))
    .filter((m): m is Match => m !== null && m.status === 'finished')
}

/* ------------------------------ merge with seed --------------------------- */

const pairKey = (a: TeamCode, b: TeamCode) => [a, b].sort().join('~')
// Include the stage so a knockout rematch never collides with (and overwrites)
// the same two teams' group-stage meeting.
const mergeKey = (m: Match) => `${m.stage}:${pairKey(m.homeCode!, m.awayCode!)}`

/**
 * Overlay real results onto the seed. A result updates an existing seed match (by
 * stage + unordered team pair), preserving the seed's home/away orientation and
 * its group letter; brand-new matches (knockout fixtures once teams are known)
 * are appended.
 */
export function mergeMatches(seed: Match[], live: Match[]): Match[] {
  const out = seed.map((m) => ({ ...m }))
  const index = new Map<string, number>()
  out.forEach((m, i) => {
    if (m.homeCode && m.awayCode) index.set(mergeKey(m), i)
  })

  for (const lm of live) {
    if (!lm.homeCode || !lm.awayCode) continue
    const key = mergeKey(lm)
    const i = index.get(key)
    if (i != null) {
      const seedMatch = out[i]
      const flip = seedMatch.homeCode !== lm.homeCode
      out[i] = {
        ...seedMatch,
        status: lm.status,
        minute: lm.minute,
        kickoff: lm.kickoff || seedMatch.kickoff,
        apiFixtureId: lm.apiFixtureId ?? seedMatch.apiFixtureId,
        homeScore: flip ? lm.awayScore : lm.homeScore,
        awayScore: flip ? lm.homeScore : lm.awayScore,
        pens: lm.pens ? (flip ? { home: lm.pens.away, away: lm.pens.home } : lm.pens) : seedMatch.pens,
      }
    } else {
      out.push(lm)
      index.set(key, out.length - 1)
    }
  }
  return out
}

/* ------------------------------ match report ------------------------------ */

export interface MatchReport {
  events: ReportEvent[]
  possession: { home: number | null; away: number | null }
  shots: { home: number | null; away: number | null }
  shotsOnTarget: { home: number | null; away: number | null }
}

interface ReportEvent {
  minute: number | null
  team: TeamCode | null
  player: string
  type: string
  detail: string
}

interface HlStatBlock {
  team?: { name?: string }
  statistics?: Array<{ displayName?: string; value?: number | string | null }>
}

/** Read one statistic for a team (by code), matched on Highlightly's displayName. */
function statVal(blocks: HlStatBlock[], code: TeamCode | null, displayName: string): number | null {
  const block = blocks.find((b) => codeFromName(b?.team?.name) === code)
  const row = block?.statistics?.find((s) => (s?.displayName ?? '').toLowerCase() === displayName.toLowerCase())
  const v = row?.value
  if (v == null) return null
  return typeof v === 'number' ? v : Number.isNaN(parseFloat(v)) ? null : parseFloat(v)
}

function parseMinute(time: unknown): number | null {
  const m = String(time ?? '').match(/^\d+/)
  return m ? Number(m[0]) : null
}

export async function fetchMatchReport(
  fixtureId: number,
  homeCode?: TeamCode | null,
  awayCode?: TeamCode | null,
): Promise<MatchReport | null> {
  try {
    const res = await fetch(`/api/match?fixture=${fixtureId}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.source !== 'highlightly') return null

    // /matches/{id} returns an array; statistics is an array of team blocks.
    const detail = Array.isArray(data.match) ? data.match[0] : data.match
    const blocks: HlStatBlock[] = Array.isArray(data.statistics) ? data.statistics : (data.statistics?.data ?? [])

    const events: ReportEvent[] = (detail?.events ?? []).map((e: any) => ({
      minute: parseMinute(e?.time),
      team: codeFromName(e?.team?.name),
      player: e?.player ?? '',
      type: e?.type ?? '',
      detail: e?.substituted ? `for ${e.substituted}` : '',
    }))

    const home = homeCode ?? null
    const away = awayCode ?? null
    const poss = (c: TeamCode | null) => {
      const p = statVal(blocks, c, 'Possession')
      return p == null ? null : Math.round(p * 100) // Highlightly reports a fraction
    }
    // Highlightly has no single "total shots"; sum shots by pitch location.
    const totalShots = (c: TeamCode | null) => {
      const inside = statVal(blocks, c, 'Shots within penalty area')
      const outside = statVal(blocks, c, 'Shots outside penalty area')
      return inside == null && outside == null ? null : (inside ?? 0) + (outside ?? 0)
    }

    return {
      events,
      possession: { home: poss(home), away: poss(away) },
      shots: { home: totalShots(home), away: totalShots(away) },
      shotsOnTarget: { home: statVal(blocks, home, 'Shots on target'), away: statVal(blocks, away, 'Shots on target') },
    }
  } catch {
    return null
  }
}

/* --------------------- rich match detail (radar + fantasy) ---------------- */

export interface MatchEvent {
  minute: number | null
  /** Raw Highlightly clock string, e.g. "45+1" or "120+3" — needed to tell a
   *  penalty-shootout kick (timed "120+N") from an in-play penalty. */
  rawTime: string
  teamCode: TeamCode | null
  type: string // "Goal" | "Own Goal" | "Penalty" | "Missed Penalty" | "Yellow Card" | "Red Card" | "Substitution" | ...
  player: string
  playerNumber: number | null
  assist: string | null
}

export interface TeamMatchStats {
  code: TeamCode
  goalsFor: number
  goalsAgainst: number
  cleanSheet: boolean
  possession: number | null // %
  shots: number | null
  shotsOnTarget: number | null
  xg: number | null
  xa: number | null
  keyPasses: number | null
  fouls: number | null
  yellow: number | null
  red: number | null
  /** Team goalkeeper saves (one keeper plays, so this is the keeper's saves). */
  gkSaves: number | null
}

export interface MatchDetail {
  fixtureId: number
  home: TeamCode | null
  away: TeamCode | null
  /** True when the match was decided by a penalty shootout (score.penalties present). */
  hadShootout: boolean
  events: MatchEvent[]
  teamStats: Partial<Record<TeamCode, TeamMatchStats>>
}

/**
 * The full box score for one finished match — raw events (for fantasy scoring)
 * plus per-team stats + goals (for the radar). Reads the hard-cached /api/match
 * once; both games share this. Returns null when unavailable (no key / not played).
 */
export async function fetchMatchDetail(fixtureId: number): Promise<MatchDetail | null> {
  try {
    const res = await fetch(`/api/match?fixture=${fixtureId}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.source !== 'highlightly') return null

    const detail = Array.isArray(data.match) ? data.match[0] : data.match
    if (!detail) return null
    const blocks: HlStatBlock[] = Array.isArray(data.statistics) ? data.statistics : (data.statistics?.data ?? [])

    const home = codeFromName(detail.homeTeam?.name)
    const away = codeFromName(detail.awayTeam?.name)
    const score = parseScore(detail.state?.score?.current)
    const homeGoals = score ? score.home : null
    const awayGoals = score ? score.away : null
    const hadShootout = detail.state?.score?.penalties != null && detail.state?.score?.penalties !== ''

    const events: MatchEvent[] = (detail.events ?? []).map((e: any) => ({
      minute: parseMinute(e?.time),
      rawTime: String(e?.time ?? ''),
      teamCode: codeFromName(e?.team?.name),
      type: e?.type ?? '',
      player: e?.player ?? '',
      playerNumber: typeof e?.playerNumber === 'number' ? e.playerNumber : null,
      assist: e?.assist ?? null,
    }))

    const teamStats: Partial<Record<TeamCode, TeamMatchStats>> = {}
    const build = (code: TeamCode | null, gf: number | null, ga: number | null) => {
      if (!code) return
      const possRaw = statVal(blocks, code, 'Possession')
      const inside = statVal(blocks, code, 'Shots within penalty area')
      const outside = statVal(blocks, code, 'Shots outside penalty area')
      teamStats[code] = {
        code,
        goalsFor: gf ?? 0,
        goalsAgainst: ga ?? 0,
        cleanSheet: ga === 0,
        possession: possRaw == null ? null : Math.round(possRaw * 100),
        shots: inside == null && outside == null ? null : (inside ?? 0) + (outside ?? 0),
        shotsOnTarget: statVal(blocks, code, 'Shots on target'),
        xg: statVal(blocks, code, 'Expected Goals'),
        xa: statVal(blocks, code, 'Expected Assists'),
        keyPasses: statVal(blocks, code, 'Key Passes'),
        fouls: statVal(blocks, code, 'Fouls'),
        yellow: statVal(blocks, code, 'Yellow cards'),
        red: statVal(blocks, code, 'Red cards'),
        gkSaves: statVal(blocks, code, 'Goalkeeper saves'),
      }
    }
    build(home, homeGoals, awayGoals)
    build(away, awayGoals, homeGoals)

    return { fixtureId, home, away, hadShootout, events, teamStats }
  } catch {
    return null
  }
}
