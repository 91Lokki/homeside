import { afFetch, getConfig, hasKey, json, noData, ProxyError } from './_lib/apiFootball'

export const config = { runtime: 'edge' }

/** GET /api/standings -> group standings for the World Cup season. */
export default async function handler(_req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  try {
    const data = await afFetch(cfg, 'standings', { league: cfg.leagueId, season: cfg.season })
    return json(data, { sMaxAge: 120, swr: 600 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    return json({ source: 'error', reason: String(err), response: [] }, { status, sMaxAge: 15, swr: 30 })
  }
}
