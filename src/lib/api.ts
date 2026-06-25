import { TEAMS } from '@/data/teams'
import type { Match, Stage, TeamCode } from '@/domain/types'

/**
 * Frontend data access. Talks ONLY to our own /api proxy (never to API-Football
 * directly — the key lives server-side). When the proxy reports no key / an
 * error, we return null and the app keeps the real seed snapshot untouched.
 * Nothing here ever invents a result.
 */

interface ProxyResult {
  source?: 'none' | 'error' | 'live'
  reason?: string
  response?: unknown[]
}

async function getProxy(path: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as ProxyResult
    if (data.source === 'none' || data.source === 'error') return null
    return Array.isArray(data.response) ? data.response : null
  } catch {
    return null
  }
}

/** True if the live API is configured (proxy returns real data). */
export async function apiAvailable(): Promise<boolean> {
  return (await getProxy('/api/fixtures')) !== null
}

/* --------------------------- name -> code mapping ------------------------- */

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
  'bosnia and herzegovina': 'BIH',
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
  return NAME_TO_CODE[name.toLowerCase().trim()] ?? null
}

/* ------------------------- API-Football normalizers ----------------------- */

function stageFromRound(round: string | undefined): { stage: Stage; group?: string } {
  const r = (round ?? '').toLowerCase()
  const g = r.match(/group\s+([a-l])/)
  if (g) return { stage: 'group', group: g[1].toUpperCase() }
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) {
    if (r.includes('3rd') || r.includes('third')) return { stage: 'F3' }
    return { stage: 'F' }
  }
  if (r.includes('semi')) return { stage: 'SF' }
  if (r.includes('quarter')) return { stage: 'QF' }
  if (r.includes('16')) return { stage: 'R16' }
  if (r.includes('32')) return { stage: 'R32' }
  return { stage: 'group' }
}

interface AfFixture {
  fixture?: { id?: number; date?: string; status?: { short?: string; elapsed?: number | null } }
  league?: { round?: string }
  teams?: { home?: { name?: string }; away?: { name?: string } }
  goals?: { home?: number | null; away?: number | null }
  score?: { penalty?: { home?: number | null; away?: number | null } }
}

function normalizeFixture(af: AfFixture): Match | null {
  const homeCode = codeFromName(af.teams?.home?.name)
  const awayCode = codeFromName(af.teams?.away?.name)
  if (!homeCode || !awayCode) return null

  const short = af.fixture?.status?.short ?? 'NS'
  const status: Match['status'] =
    ['FT', 'AET', 'PEN'].includes(short) ? 'finished' : ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(short) ? 'live' : 'scheduled'

  const { stage, group } = stageFromRound(af.league?.round)
  const pen = af.score?.penalty
  const hasPens = pen && pen.home != null && pen.away != null

  return {
    id: `af-${af.fixture?.id ?? `${homeCode}-${awayCode}`}`,
    stage,
    group,
    homeCode,
    awayCode,
    kickoff: af.fixture?.date ?? new Date().toISOString(),
    status,
    homeScore: status === 'scheduled' ? null : af.goals?.home ?? null,
    awayScore: status === 'scheduled' ? null : af.goals?.away ?? null,
    minute: status === 'live' ? af.fixture?.status?.elapsed ?? null : null,
    pens: hasPens ? { home: pen!.home!, away: pen!.away! } : undefined,
    apiFixtureId: af.fixture?.id,
  }
}

export async function fetchLiveMatches(): Promise<Match[] | null> {
  const raw = await getProxy('/api/fixtures')
  if (!raw) return null
  return raw.map((x) => normalizeFixture(x as AfFixture)).filter((m): m is Match => m !== null)
}

/* ------------------------------ merge with seed --------------------------- */

const pairKey = (a: TeamCode, b: TeamCode) => [a, b].sort().join('~')

/**
 * Overlay live matches onto the seed. Live updates an existing seed match (by
 * unordered team pair), preserving the seed's home/away orientation; brand-new
 * matches (knockout fixtures once teams are known) are appended.
 */
export function mergeMatches(seed: Match[], live: Match[]): Match[] {
  const out = seed.map((m) => ({ ...m }))
  const index = new Map<string, number>()
  out.forEach((m, i) => {
    if (m.homeCode && m.awayCode) index.set(pairKey(m.homeCode, m.awayCode), i)
  })

  for (const lm of live) {
    if (!lm.homeCode || !lm.awayCode) continue
    const key = pairKey(lm.homeCode, lm.awayCode)
    const i = index.get(key)
    if (i != null) {
      const seedMatch = out[i]
      const flip = seedMatch.homeCode !== lm.homeCode
      out[i] = {
        ...seedMatch,
        status: lm.status,
        minute: lm.minute,
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
  events: AfEvent[]
  possession: { home: number | null; away: number | null }
  shots: { home: number | null; away: number | null }
  shotsOnTarget: { home: number | null; away: number | null }
}

interface AfEvent {
  minute: number | null
  team: TeamCode | null
  player: string
  type: string
  detail: string
}

function statValue(stats: any[], homeAwayName: string | undefined, type: string): number | null {
  const block = stats?.find((s) => s?.team?.name === homeAwayName)
  const row = block?.statistics?.find((r: any) => r?.type === type)
  if (!row) return null
  const v = row.value
  if (v == null) return null
  if (typeof v === 'string') return parseInt(v.replace('%', ''), 10) || 0
  return v
}

export async function fetchMatchReport(fixtureId: number, homeName?: string, awayName?: string): Promise<MatchReport | null> {
  try {
    const res = await fetch(`/api/match?fixture=${fixtureId}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.source === 'none' || data.source === 'error') return null

    const events: AfEvent[] = (data.events?.response ?? []).map((e: any) => ({
      minute: e?.time?.elapsed ?? null,
      team: codeFromName(e?.team?.name),
      player: e?.player?.name ?? '',
      type: e?.type ?? '',
      detail: e?.detail ?? '',
    }))
    const stats = data.statistics?.response ?? []
    return {
      events,
      possession: { home: statValue(stats, homeName, 'Ball Possession'), away: statValue(stats, awayName, 'Ball Possession') },
      shots: { home: statValue(stats, homeName, 'Total Shots'), away: statValue(stats, awayName, 'Total Shots') },
      shotsOnTarget: { home: statValue(stats, homeName, 'Shots on Goal'), away: statValue(stats, awayName, 'Shots on Goal') },
    }
  } catch {
    return null
  }
}
