import { BRACKET } from '@/data/bracket'
import { TEAMS } from '@/data/teams'
import { resolveBracket } from '@/domain/bracket'
import type { Match, Stage, TeamCode } from '@/domain/types'

/**
 * Frontend data access. Talks ONLY to our own /api proxy, which forwards to ESPN's
 * free public API (no key, no quota). On any error we return null and the app keeps
 * the real seed snapshot untouched. Nothing here ever invents a result.
 */

interface ProxyResult {
  source?: 'espn' | 'error'
  reason?: string
  events?: unknown[]
  summary?: any
}

/** What the live feed is doing right now — so the UI can be honest about it. */
export type ApiStatus = 'ok' | 'no-key' | 'rate-limited' | 'error'
export interface ApiHealth {
  status: ApiStatus
  reason?: string
}

interface ProxyRaw {
  httpStatus: number
  body: ProxyResult | null
}

async function getProxyRaw(path: string): Promise<ProxyRaw> {
  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } })
    let body: ProxyResult | null = null
    try {
      body = (await res.json()) as ProxyResult
    } catch {
      /* non-JSON / empty */
    }
    return { httpStatus: res.status, body }
  } catch {
    return { httpStatus: 0, body: null }
  }
}

function healthFrom({ httpStatus, body }: ProxyRaw): ApiHealth {
  if (body?.source === 'espn') return { status: 'ok' }
  if (httpStatus === 429) return { status: 'rate-limited', reason: body?.reason }
  return { status: 'error', reason: body?.reason || (httpStatus ? `upstream ${httpStatus}` : 'feed unreachable') }
}

/* --------------------------- name -> code mapping ------------------------- */

// ESPN's WC team names reconciled to the seed's 3-letter codes. Names that already
// match a seed team verbatim don't need an entry here.
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
  'bosnia and herzegovina': 'BIH', // also covers "Bosnia & Herzegovina" / "Bosnia-Herzegovina" below
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
  // Normalize curly apostrophes, "&" -> "and", and hyphens to spaces so e.g.
  // "Bosnia & Herzegovina", "Bosnia-Herzegovina" and "Côte d'Ivoire" all match.
  const key = name
    .toLowerCase()
    .trim()
    .replace(/[’`´]/g, "'")
    .replace(/\s*&\s*/g, ' and ')
    .replace(/-/g, ' ')
  return NAME_TO_CODE[key] ?? null
}

/* ----------------------------- ESPN normalizers --------------------------- */

/** Map ESPN's `season.slug` to our stage. */
function stageFromSlug(slug: string | undefined): Stage {
  const s = (slug ?? '').toLowerCase()
  if (s.includes('group')) return 'group'
  if (s.includes('32')) return 'R32'
  if (s.includes('16')) return 'R16'
  if (s.includes('quarter')) return 'QF'
  if (s.includes('semi')) return 'SF'
  if (s.includes('third') || s.includes('3rd')) return 'F3'
  if (s.includes('final')) return 'F'
  return 'group'
}

const num = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseMinute(time: unknown): number | null {
  const m = String(time ?? '').match(/^\d+/)
  return m ? Number(m[0]) : null
}

/** Normalize one raw ESPN scoreboard event to our Match shape. */
function normalizeMatch(e: any): Match | null {
  const c = e?.competitions?.[0]
  if (!c) return null
  const comps = c.competitors ?? []
  const h = comps.find((x: any) => x.homeAway === 'home')
  const a = comps.find((x: any) => x.homeAway === 'away')
  const homeCode = codeFromName(h?.team?.displayName)
  const awayCode = codeFromName(a?.team?.displayName)
  if (!homeCode || !awayCode) return null

  const state = c.status?.type?.state // 'pre' | 'in' | 'post'
  const finished = state === 'post'
  const live = state === 'in'
  const hso = num(h?.shootoutScore)
  const aso = num(a?.shootoutScore)

  return {
    id: `espn-${e.id}`,
    stage: stageFromSlug(e.season?.slug),
    homeCode,
    awayCode,
    kickoff: e.date ?? new Date().toISOString(),
    status: finished ? 'finished' : live ? 'live' : 'scheduled',
    homeScore: finished || live ? num(h?.score) : null,
    awayScore: finished || live ? num(a?.score) : null,
    minute: live ? parseMinute(c.status?.displayClock ?? c.status?.type?.shortDetail) : null,
    pens: hso != null && aso != null ? { home: hso, away: aso } : undefined,
    apiFixtureId: Number(e.id) || undefined,
  }
}

/**
 * Fetch real, FINISHED match results from the proxy AND report what the feed is
 * doing — derived from the same request, so no extra calls. `matches` is null when
 * real data didn't arrive (the caller then keeps the seed). Only final scores
 * reach the app, never an in-play score.
 *
 * Pass `date` (YYYY-MM-DD) to poll just that match day; omit it for the full feed.
 */
export async function fetchResultsWithHealth(date?: string): Promise<{ matches: Match[] | null; health: ApiHealth }> {
  const raw = await getProxyRaw(date ? `/api/fixtures?date=${encodeURIComponent(date)}` : '/api/fixtures')
  const health = healthFrom(raw)
  // Surface finished AND live matches (standings/bracket/scoring still count only
  // finished — see record.ts / bracket.ts — so a live match shows but doesn't score).
  const matches =
    raw.body?.source === 'espn' && Array.isArray(raw.body.events)
      ? raw.body.events.map((x) => normalizeMatch(x)).filter((m): m is Match => m !== null && (m.status === 'finished' || m.status === 'live'))
      : null
  return { matches, health }
}

/* ------------------------------ merge with seed --------------------------- */

const pairKey = (a: TeamCode, b: TeamCode) => [a, b].sort().join('~')
// Include the stage so a knockout rematch never collides with (and overwrites)
// the same two teams' group-stage meeting.
const mergeKey = (m: Match) => `${m.stage}:${pairKey(m.homeCode!, m.awayCode!)}`
const kickoffTime = (iso?: string): number | null => {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}
const firstKnockoutKickoffMs = Math.min(...BRACKET.map((m) => kickoffTime(m.kickoff)).filter((ms): ms is number => ms != null))

function inferKnockoutStage(lm: Match, mergedSoFar: Match[]): Match {
  if (lm.stage !== 'group' || !lm.homeCode || !lm.awayCode) return lm
  const kickoffMs = kickoffTime(lm.kickoff)
  if (kickoffMs == null || kickoffMs < firstKnockoutKickoffMs) return lm

  const livePair = pairKey(lm.homeCode, lm.awayCode)
  const candidates = resolveBracket(BRACKET, TEAMS, mergedSoFar).filter(
    (m) => m.homeCode && m.awayCode && pairKey(m.homeCode, m.awayCode) === livePair,
  )
  if (!candidates.length) return lm

  const nearest = candidates.reduce((best, m) => {
    const bestMs = kickoffTime(best.kickoff) ?? Number.POSITIVE_INFINITY
    const ms = kickoffTime(m.kickoff) ?? Number.POSITIVE_INFINITY
    const bestDist = Math.abs(kickoffMs - bestMs)
    const dist = Math.abs(kickoffMs - ms)
    return dist < bestDist ? m : best
  })
  return { ...lm, stage: nearest.stage }
}

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
    const normalized = inferKnockoutStage(lm, out)
    const key = mergeKey(normalized)
    const i = index.get(key)
    if (i != null) {
      const seedMatch = out[i]
      const flip = seedMatch.homeCode !== normalized.homeCode
      out[i] = {
        ...seedMatch,
        status: normalized.status,
        minute: normalized.minute,
        kickoff: normalized.kickoff || seedMatch.kickoff,
        apiFixtureId: normalized.apiFixtureId ?? seedMatch.apiFixtureId,
        homeScore: flip ? normalized.awayScore : normalized.homeScore,
        awayScore: flip ? normalized.homeScore : normalized.awayScore,
        pens: normalized.pens ? (flip ? { home: normalized.pens.away, away: normalized.pens.home } : normalized.pens) : seedMatch.pens,
      }
    } else {
      out.push(normalized)
      index.set(key, out.length - 1)
    }
  }
  return out
}

/* ----------------------------- ESPN summary ------------------------------- */

/** Read one ESPN boxscore statistic for a team block, by its `name`. */
function espnStat(team: any, name: string): number | null {
  const s = (team?.statistics ?? []).find((x: any) => x.name === name)
  if (!s) return null
  const v = typeof s.value === 'number' ? s.value : parseFloat(s.displayValue)
  return Number.isFinite(v) ? v : null
}

/** Map an ESPN keyEvent to our event type (goals, cards, own goals, missed pens). */
function mapEventType(espnType?: string, text?: string): string {
  const t = (espnType ?? '').toLowerCase()
  const x = (text ?? '').toLowerCase()
  if (t.includes('own goal') || x.includes('own goal')) return 'Own Goal'
  if ((t.includes('penalty') || x.includes('penalty')) && (t.includes('miss') || x.includes('miss') || x.includes('saved'))) return 'Missed Penalty'
  if (t === 'goal' || t.includes('goal') || x.startsWith('goal')) return 'Goal'
  if (t.includes('yellow')) return 'Yellow Card'
  if (t.includes('red')) return 'Red Card'
  if (t.includes('substitution')) return 'Substitution'
  return '' // kickoff, delays, VAR, etc. — ignored
}

async function fetchSummary(fixtureId: number): Promise<any | null> {
  try {
    const res = await fetch(`/api/match?fixture=${fixtureId}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data?.source !== 'espn' || !data.summary) return null
    return data.summary
  } catch {
    return null
  }
}

/* ------------------------------ match report ------------------------------ */

type Pair = { home: number | null; away: number | null }
export interface MatchReport {
  events: ReportEvent[]
  possession: Pair
  shots: Pair
  shotsOnTarget: Pair
  corners: Pair
  passes: Pair
  passAcc: Pair
  offsides: Pair
  fouls: Pair
  cards: Pair
}

interface ReportEvent {
  minute: number | null
  team: TeamCode | null
  player: string
  type: string
  detail: string
}

export async function fetchMatchReport(
  fixtureId: number,
  homeCode?: TeamCode | null,
  awayCode?: TeamCode | null,
): Promise<MatchReport | null> {
  const s = await fetchSummary(fixtureId)
  if (!s) return null

  const events: ReportEvent[] = (s.keyEvents ?? [])
    .map((e: any) => {
      const x = (e?.text ?? '').toLowerCase()
      return {
        minute: parseMinute(e?.clock?.displayValue),
        team: codeFromName(e?.team?.displayName),
        player: e?.participants?.[0]?.athlete?.displayName ?? '',
        type: mapEventType(e?.type?.text, e?.text),
        detail: x.includes('own goal') ? 'own goal' : x.includes('penalty') ? 'penalty' : '',
      }
    })
    .filter((e: ReportEvent) => e.type)

  const bt = s.boxscore?.teams ?? []
  const blockFor = (code: TeamCode | null) => bt.find((b: any) => codeFromName(b?.team?.displayName) === code)
  const poss = (code: TeamCode | null) => {
    const v = espnStat(blockFor(code), 'possessionPct')
    return v == null ? null : Math.round(v)
  }
  const home = homeCode ?? null
  const away = awayCode ?? null
  const pair = (name: string) => ({ home: espnStat(blockFor(home), name), away: espnStat(blockFor(away), name) })
  const pct = (v: number | null) => (v == null ? null : Math.round(v <= 1 ? v * 100 : v))

  return {
    events,
    possession: { home: poss(home), away: poss(away) },
    shots: pair('totalShots'),
    shotsOnTarget: pair('shotsOnTarget'),
    corners: pair('wonCorners'),
    passes: pair('totalPasses'),
    passAcc: { home: pct(espnStat(blockFor(home), 'passPct')), away: pct(espnStat(blockFor(away), 'passPct')) },
    offsides: pair('offsides'),
    fouls: pair('foulsCommitted'),
    cards: pair('yellowCards'),
  }
}

/* --------------------- rich match detail (radar + fantasy) ---------------- */

export interface MatchEvent {
  minute: number | null
  /** Raw ESPN clock string, e.g. "45'+2" — kept so a penalty-shootout kick can be
   *  told apart from an in-play penalty (refined once a knockout shootout occurs). */
  rawTime: string
  teamCode: TeamCode | null
  type: string // "Goal" | "Own Goal" | "Missed Penalty" | "Yellow Card" | "Red Card" | "Substitution"
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
  passPct: number | null
  crosses: number | null // accurate crosses
  corners: number | null // won corners
  tackles: number | null // effective tackles
  interceptions: number | null
  clearances: number | null // effective clearances
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
  /** True when the match was decided by a penalty shootout. */
  hadShootout: boolean
  events: MatchEvent[]
  teamStats: Partial<Record<TeamCode, TeamMatchStats>>
}

/**
 * The full box score for one finished match — raw events (for fantasy scoring)
 * plus per-team stats + goals (for the radar). Reads the hard-cached /api/match
 * once; both games share this. Returns null when unavailable. ESPN has no
 * xG / xA / key passes, so those stay null (never fabricated).
 */
export async function fetchMatchDetail(fixtureId: number): Promise<MatchDetail | null> {
  const s = await fetchSummary(fixtureId)
  if (!s) return null

  const comps = s.header?.competitions?.[0]?.competitors ?? []
  const hC = comps.find((x: any) => x.homeAway === 'home')
  const aC = comps.find((x: any) => x.homeAway === 'away')
  const home = codeFromName(hC?.team?.displayName)
  const away = codeFromName(aC?.team?.displayName)
  const homeGoals = num(hC?.score) ?? 0
  const awayGoals = num(aC?.score) ?? 0
  const hadShootout = num(hC?.shootoutScore) != null && num(aC?.shootoutScore) != null

  const events: MatchEvent[] = (s.keyEvents ?? [])
    .map((e: any) => ({
      minute: parseMinute(e?.clock?.displayValue),
      rawTime: String(e?.clock?.displayValue ?? ''),
      teamCode: codeFromName(e?.team?.displayName),
      type: mapEventType(e?.type?.text, e?.text),
      player: e?.participants?.[0]?.athlete?.displayName ?? '',
      playerNumber: null,
      assist: e?.participants?.[1]?.athlete?.displayName ?? null,
    }))
    .filter((e: MatchEvent) => e.type)

  const bt = s.boxscore?.teams ?? []
  const blockFor = (code: TeamCode | null) => bt.find((b: any) => codeFromName(b?.team?.displayName) === code)
  const teamStats: Partial<Record<TeamCode, TeamMatchStats>> = {}
  const build = (code: TeamCode | null, gf: number, ga: number) => {
    if (!code) return
    const b = blockFor(code)
    const poss = espnStat(b, 'possessionPct')
    teamStats[code] = {
      code,
      goalsFor: gf,
      goalsAgainst: ga,
      cleanSheet: ga === 0,
      possession: poss == null ? null : Math.round(poss),
      shots: espnStat(b, 'totalShots'),
      shotsOnTarget: espnStat(b, 'shotsOnTarget'),
      passPct: espnStat(b, 'passPct'),
      crosses: espnStat(b, 'accurateCrosses'),
      corners: espnStat(b, 'wonCorners'),
      tackles: espnStat(b, 'effectiveTackles'),
      interceptions: espnStat(b, 'interceptions'),
      clearances: espnStat(b, 'effectiveClearance'),
      fouls: espnStat(b, 'foulsCommitted'),
      yellow: espnStat(b, 'yellowCards'),
      red: espnStat(b, 'redCards'),
      gkSaves: espnStat(b, 'saves'),
    }
  }
  build(home, homeGoals, awayGoals)
  build(away, awayGoals, homeGoals)

  return { fixtureId, home, away, hadShootout, events, teamStats }
}
