import { espnFetch, json, ProxyError } from './_lib/espn'

export const config = { runtime: 'edge' }

/**
 * GET /api/match?fixture=ESPN_EVENT_ID
 *
 * The full match summary from ESPN: boxscore (per-team stats) + keyEvents (goal /
 * card timeline). No API key, no quota. Finished matches are immutable -> cache hard.
 */
export default async function handler(req: Request): Promise<Response> {
  const fixture = new URL(req.url).searchParams.get('fixture') ?? ''
  if (!/^\d+$/.test(fixture)) {
    return json({ source: 'error', reason: 'missing or invalid fixture id' }, { status: 400, sMaxAge: 0 })
  }

  try {
    const summary = await espnFetch('/summary', { event: fixture })
    return json({ source: 'espn', fixture, summary }, { sMaxAge: 86400, swr: 604800 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason }, { status, sMaxAge: 30, swr: 120 })
  }
}
