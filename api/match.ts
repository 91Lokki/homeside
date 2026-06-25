import { afFetch, getConfig, hasKey, json, noData, ProxyError } from './_lib/apiFootball'

export const config = { runtime: 'edge' }

/**
 * GET /api/match?fixture=ID
 *
 * The light match report: goal/card timeline (events), possession & shots
 * (statistics), and lineups — fetched server-side in one shot so the client
 * makes a single request per finished/in-progress match it wants to expand.
 */
export default async function handler(req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  const { searchParams } = new URL(req.url)
  const fixture = searchParams.get('fixture') ?? ''
  if (!/^\d+$/.test(fixture)) {
    return json({ source: 'error', reason: 'missing or invalid fixture id' }, { status: 400, sMaxAge: 0 })
  }

  try {
    const [events, statistics, lineups] = await Promise.all([
      afFetch(cfg, 'fixtures/events', { fixture }),
      afFetch(cfg, 'fixtures/statistics', { fixture }),
      afFetch(cfg, 'fixtures/lineups', { fixture }),
    ])
    // Finished matches are immutable — cache hard. (Live ones still update
    // every ~30s via stale-while-revalidate.)
    return json({ source: 'live', fixture, events, statistics, lineups }, { sMaxAge: 30, swr: 600 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    return json({ source: 'error', reason: String(err) }, { status, sMaxAge: 15, swr: 30 })
  }
}
