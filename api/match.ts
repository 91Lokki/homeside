import { getConfig, hasKey, hlFetch, json, noData, ProxyError } from './_lib/highlightly'

export const config = { runtime: 'edge' }

/**
 * GET /api/match?fixture=ID
 *
 * The light match report for a finished match: goal/card timeline via
 * /matches/{id} (its `events`), and possession/shots via /statistics/{id}.
 * Finished matches are immutable, so this is cached hard.
 */
export default async function handler(req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  const fixture = new URL(req.url).searchParams.get('fixture') ?? ''
  if (!/^\d+$/.test(fixture)) {
    return json({ source: 'error', reason: 'missing or invalid fixture id' }, { status: 400, sMaxAge: 0 })
  }

  try {
    const [match, statistics] = await Promise.all([
      hlFetch(cfg, `/matches/${fixture}`),
      hlFetch(cfg, `/statistics/${fixture}`),
    ])
    return json({ source: 'highlightly', fixture, match, statistics }, { sMaxAge: 86400, swr: 604800 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason }, { status, sMaxAge: 30, swr: 120 })
  }
}
