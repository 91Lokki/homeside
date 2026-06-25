/**
 * Shared helper for the Highlightly Football API proxy.
 *
 * The key must never reach the browser. These Edge functions hold it, forward a
 * small whitelisted set of read-only requests to Highlightly, and cache hard so
 * we stay well under the free tier's 100 requests/day.
 *
 * NOTE: Highlightly's own platform (https://soccer.highlightly.net) uses the
 * header `x-rapidapi-key` and does NOT want `x-rapidapi-host`. (Only the RapidAPI
 * base URL would need a host header — we use the direct platform.)
 *
 * Files in /api/_lib are NOT deployed as routes (Vercel ignores `_`-prefixed
 * paths) — this is plain shared code.
 */

export interface HlConfig {
  key: string | undefined
  base: string
  leagueId: string
  season: string
}

export function getConfig(): HlConfig {
  return {
    key: process.env.HIGHLIGHTLY_KEY,
    base: 'https://soccer.highlightly.net',
    leagueId: process.env.WC_LEAGUE_ID || '1635',
    season: process.env.WC_SEASON || '2026',
  }
}

export function hasKey(cfg: HlConfig): boolean {
  return Boolean(cfg.key && cfg.key.length > 0)
}

export class ProxyError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/**
 * Call a Highlightly endpoint. `path` starts with `/`, e.g. "/matches" or
 * "/statistics/123". Logs status + the remaining daily quota (never the key).
 */
export async function hlFetch(
  cfg: HlConfig,
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<unknown> {
  const url = new URL(cfg.base + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), { headers: { 'x-rapidapi-key': cfg.key! } })
  const remaining = res.headers.get('x-ratelimit-requests-remaining') ?? '?'
  const bodyText = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(bodyText)
  } catch {
    /* non-JSON */
  }

  console.log(`[highlightly] ${path}?${url.searchParams.toString()} status=${res.status} quotaRemaining=${remaining}`)

  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : `upstream ${res.status}`
    throw new ProxyError(msg, res.status === 429 ? 429 : 502)
  }
  return data
}

/** A JSON response with CDN caching. `sMaxAge`/`swr` in seconds. */
export function json(
  body: unknown,
  { status = 200, sMaxAge = 1800, swr = 86400 }: { status?: number; sMaxAge?: number; swr?: number } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
    },
  })
}

/** Signals the client that no real data is available (no key / upstream down). */
export function noData(reason: string): Response {
  return json({ source: 'none', reason, matches: [] }, { status: 200, sMaxAge: 30, swr: 30 })
}
