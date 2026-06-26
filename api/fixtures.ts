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
 *
 * GET /api/fixtures?date=YYYY-MM-DD -> just that day's matches in a single page,
 * cached briefly (~2 min). The client polls this only while a knockout match is
 * actually on, so an end-of-match result lands within a couple of minutes
 * without ever hammering the daily quota.
 */
export default async function handler(req: Request): Promise<Response> {
  const cfg = getConfig()
  if (!hasKey(cfg)) return noData('no API key configured')

  const dateParam = new URL(req.url).searchParams.get('date')
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined

  try {
    // Live mode: one short-cached page scoped to a single match day.
    if (date) {
      const res = (await hlFetch(cfg, '/matches', { leagueId: cfg.leagueId, season: cfg.season, date, limit: 100 })) as MatchesPage
      return json({ source: 'highlightly', matches: res?.data ?? [] }, { sMaxAge: 120, swr: 600 })
    }

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
