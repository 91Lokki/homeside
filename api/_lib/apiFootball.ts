/**
 * Shared helper for the API-Football proxy.
 *
 * Why a proxy at all: the API key must never reach the browser. These Edge
 * functions hold the key, forward a *whitelisted* set of read-only requests to
 * API-Football, and add CDN caching so we stay inside the free-tier rate limit.
 *
 * Files in /api/_lib are NOT deployed as routes (Vercel ignores `_`-prefixed
 * paths) — this is plain shared code.
 */

export interface AfConfig {
  key: string | undefined
  host: string
  leagueId: string
  season: string
  isRapidApi: boolean
}

export function getConfig(): AfConfig {
  const key = process.env.API_FOOTBALL_KEY
  const host = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io'
  return {
    key,
    host,
    leagueId: process.env.WC_LEAGUE_ID || '1',
    season: process.env.WC_SEASON || '2026',
    isRapidApi: host.includes('rapidapi'),
  }
}

/** True when no key is configured — callers should return a "no live data" signal. */
export function hasKey(cfg: AfConfig): boolean {
  return Boolean(cfg.key && cfg.key.length > 0)
}

/**
 * Call an API-Football endpoint. `path` is the API-Football path WITHOUT host,
 * e.g. "fixtures" or "fixtures/events". `params` are query params.
 */
export async function afFetch(
  cfg: AfConfig,
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<unknown> {
  // RapidAPI serves the same API under a /v3 prefix; the direct host does not.
  const base = cfg.isRapidApi ? `https://${cfg.host}/v3` : `https://${cfg.host}`
  const url = new URL(`${base}/${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const headers: Record<string, string> = cfg.isRapidApi
    ? { 'x-rapidapi-key': cfg.key!, 'x-rapidapi-host': cfg.host }
    : { 'x-apisports-key': cfg.key! }

  const res = await fetch(url.toString(), { headers })
  const bodyText = await res.text()
  let data: any = null
  try {
    data = JSON.parse(bodyText)
  } catch {
    /* non-JSON error body */
  }

  // Log status, result count, and API-Football's own `errors` (it returns HTTP
  // 200 with a populated `errors` object for out-of-plan seasons, bad params,
  // etc.). The key is never part of the URL or this log.
  const errs = data?.errors
  const errCount = Array.isArray(errs) ? errs.length : errs && typeof errs === 'object' ? Object.keys(errs).length : 0
  console.log(
    `[api-football] ${path}?${url.searchParams.toString()} status=${res.status} results=${data?.results ?? '?'}` +
      (errCount ? ` errors=${JSON.stringify(errs)}` : ''),
  )

  if (!res.ok) {
    throw new ProxyError(`upstream ${res.status}`, res.status === 429 ? 429 : 502)
  }
  return data ?? JSON.parse(bodyText)
}

export class ProxyError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/** A JSON response with sane CDN caching. `sMaxAge` in seconds. */
export function json(
  body: unknown,
  { status = 200, sMaxAge = 60, swr = 300 }: { status?: number; sMaxAge?: number; swr?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Cache at the edge; serve stale while revalidating to smooth over the
      // upstream rate limit. Live endpoints pass a short sMaxAge.
      'cache-control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    },
  })
}

/** Signals to the client that live data is unavailable (no key / upstream down). */
export function noData(reason: string): Response {
  return json({ source: 'none', reason, response: [] }, { status: 200, sMaxAge: 30, swr: 30 })
}
