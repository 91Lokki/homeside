/**
 * Shared helper for the ESPN public Soccer API proxy.
 *
 * ESPN's site API is free and needs NO key or auth — so these Edge functions just
 * forward a small whitelisted set of read-only requests and cache them (the dev
 * server also disk-caches; production uses Vercel's CDN). Being unofficial, the
 * shape can change without notice, so normalisers downstream are defensive.
 *
 * Files in /api/_lib are NOT deployed as routes (Vercel ignores `_`-prefixed
 * paths) — this is plain shared code.
 */

export const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

export class ProxyError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

/** Call an ESPN endpoint. `path` starts with `/`, e.g. "/scoreboard" or "/summary". */
export async function espnFetch(path: string, params: Record<string, string | number | undefined> = {}): Promise<any> {
  const url = new URL(ESPN_BASE + path)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), { headers: { 'user-agent': 'Mozilla/5.0' } })
  const bodyText = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(bodyText)
  } catch {
    /* non-JSON */
  }

  console.log(`[espn] ${path}?${url.searchParams.toString()} status=${res.status}`)

  if (!res.ok) throw new ProxyError(`upstream ${res.status}`, res.status === 429 ? 429 : 502)
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
