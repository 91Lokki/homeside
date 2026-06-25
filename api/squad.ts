import { afFetch, getConfig, hasKey, json, noData, ProxyError } from './_lib/apiFootball'

export const config = { runtime: 'edge' }

/** GET /api/squad?team=ID -> full squad list for a national team. */
export default async function handler(req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  const { searchParams } = new URL(req.url)
  const team = searchParams.get('team') ?? ''
  if (!/^\d+$/.test(team)) {
    return json({ source: 'error', reason: 'missing or invalid team id' }, { status: 400, sMaxAge: 0 })
  }

  try {
    const data = await afFetch(cfg, 'players/squads', { team })
    return json(data, { sMaxAge: 3600, swr: 86400 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    return json({ source: 'error', reason: String(err), response: [] }, { status, sMaxAge: 30, swr: 60 })
  }
}
