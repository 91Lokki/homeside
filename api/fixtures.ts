import { afFetch, getConfig, hasKey, json, noData, ProxyError } from './_lib/apiFootball'

export const config = { runtime: 'edge' }

/**
 * GET /api/fixtures            -> all World Cup fixtures for the season
 * GET /api/fixtures?live=1     -> only fixtures currently in progress
 *
 * Live requests get a short cache (the client polls every ~45s); the full list
 * is cached longer since the schedule rarely changes.
 */
export default async function handler(req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  const liveParam = new URL(req.url).searchParams.get('live')
  const live = liveParam === '1' || liveParam === 'all'

  try {
    const params: Record<string, string> = { league: cfg.leagueId, season: cfg.season }
    if (live) params.live = 'all'
    const data = await afFetch(cfg, 'fixtures', params)
    return json(data, live ? { sMaxAge: 25, swr: 60 } : { sMaxAge: 120, swr: 600 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason, response: [] }, { status, sMaxAge: 15, swr: 30 })
  }
}
