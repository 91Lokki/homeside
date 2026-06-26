import { espnFetch, json, ProxyError } from './_lib/espn'

export const config = { runtime: 'edge' }

/**
 * GET /api/fixtures -> all 2026 World Cup matches (raw ESPN scoreboard events) in
 * a single date-range call (group stage through final). No API key, no quota.
 *
 * GET /api/fixtures?date=YYYY-MM-DD -> just that day's matches, cached briefly, so
 * the client can poll near-real-time while a match is on.
 */
export default async function handler(req: Request): Promise<Response> {
  const dateParam = new URL(req.url).searchParams.get('date')
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined

  try {
    if (date) {
      const sb = await espnFetch('/scoreboard', { dates: date.replace(/-/g, ''), limit: 200 })
      return json({ source: 'espn', events: sb?.events ?? [] }, { sMaxAge: 120, swr: 600 })
    }
    // The whole tournament window in one request.
    const sb = await espnFetch('/scoreboard', { dates: '20260611-20260719', limit: 400 })
    return json({ source: 'espn', events: sb?.events ?? [] }, { sMaxAge: 1800, swr: 86400 })
  } catch (err) {
    const status = err instanceof ProxyError ? err.status : 502
    const reason = err instanceof ProxyError ? err.message : 'upstream request failed'
    return json({ source: 'error', reason, events: [] }, { status, sMaxAge: 30, swr: 120 })
  }
}
