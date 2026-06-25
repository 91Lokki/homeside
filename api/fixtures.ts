import { getConfig, hasKey, hlFetch, json, noData, ProxyError } from './_lib/highlightly'

export const config = { runtime: 'edge' }

interface MatchesPage {
  data?: unknown[]
  pagination?: { totalCount?: number }
}

/**
 * GET /api/fixtures -> all World Cup matches for the season (raw Highlightly
 * shape). Low-frequency results feed; the client reads only finished matches.
 * `/matches` caps `limit` at 100, so we page through and cache hard.
 */
export default async function handler(_req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  try {
    const matches: unknown[] = []
    let offset = 0
    let total = Infinity
    // Bounded loop: WC is ~104 matches; cap pages defensively.
    for (let page = 0; page < 4 && offset < total; page++) {
      const res = (await hlFetch(cfg, '/matches', {
        leagueId: cfg.leagueId,
        season: cfg.season,
        limit: 100,
        offset,
      })) as MatchesPage
      const batch = res?.data ?? []
      matches.push(...batch)
      total = res?.pagination?.totalCount ?? matches.length
      if (batch.length === 0) break
      offset += batch.length
    }
    return json({ source: 'highlightly', matches }, { sMaxAge: 1800, swr: 86400 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason, matches: [] }, { status, sMaxAge: 30, swr: 120 })
  }
}
