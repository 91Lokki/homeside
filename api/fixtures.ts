import { afFetch, getConfig, hasKey, json, noData, ProxyError } from './_lib/apiFootball'

export const config = { runtime: 'edge' }

/**
 * GET /api/fixtures -> all World Cup fixtures for the season.
 *
 * This is a low-frequency results feed (not live): the client reads only the
 * finished matches and refreshes every few hours, so the full list is cached
 * generously at the edge. Returns a "no data" signal when no key is configured.
 */
export default async function handler(_req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  try {
    const data = await afFetch(cfg, 'fixtures', { league: cfg.leagueId, season: cfg.season })
    return json(data, { sMaxAge: 600, swr: 3600 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason, response: [] }, { status, sMaxAge: 30, swr: 120 })
  }
}
