import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

/**
 * Run the /api Edge functions during `npm run dev` — no Vercel CLI needed.
 *
 * The functions in /api are standard Request->Response handlers; here we adapt
 * Node's req/res to them and expose the server-side env (from .env) so the
 * Highlightly key works locally exactly as it will in production.
 *
 * Crucially we ALSO cache responses to disk, honouring each response's own
 * `s-maxage`. In production Vercel's CDN does this; locally there is no CDN, so
 * without it every reload/HMR/poll hit Highlightly directly and quickly drained
 * the free tier's 100 requests/day. This makes dev consume like prod: one
 * upstream fetch per cache window, reused across reloads and restarts. It lives
 * only here — this file is never bundled or deployed to the edge runtime.
 */
const API_CACHE_DIR = path.resolve(__dirname, 'node_modules/.cache/homeside-api')

interface CacheEntry {
  expiry: number
  status: number
  contentType: string
  cacheControl: string
  body: string
}

function readApiCache(key: string): CacheEntry | null {
  try {
    const entry = JSON.parse(fs.readFileSync(path.join(API_CACHE_DIR, key + '.json'), 'utf8')) as CacheEntry
    if (typeof entry.expiry === 'number' && Date.now() < entry.expiry) return entry
  } catch {
    /* miss or unreadable — treat as no cache */
  }
  return null
}

function writeApiCache(key: string, entry: CacheEntry): void {
  try {
    fs.mkdirSync(API_CACHE_DIR, { recursive: true })
    // Write to a unique temp file then rename — rename is atomic on one
    // filesystem, so two concurrent MISS writes can't interleave into corruption.
    const file = path.join(API_CACHE_DIR, key + '.json')
    const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(entry))
    fs.renameSync(tmp, file)
  } catch {
    /* a cache write must never break the request */
  }
}

function apiDev(env: Record<string, string>): Plugin {
  const ROUTES = new Set(['fixtures', 'match'])
  return {
    name: 'homeside-api-dev',
    configureServer(server: ViteDevServer) {
      for (const k of ['HIGHLIGHTLY_KEY', 'WC_LEAGUE_ID', 'WC_SEASON']) {
        if (env[k] != null && env[k] !== '' && process.env[k] == null) process.env[k] = env[k]
      }
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const route = new URL(req.url, 'http://localhost').pathname.replace(/^\/api\//, '').split('/')[0]
        if (!ROUTES.has(route)) return next()

        // Cache key is the full URL (path + query) — distinct fixture ids and
        // ?date= live polls each get their own entry. The Highlightly key travels
        // as a request header upstream, never in the URL, so it never hits disk.
        const cacheKey = crypto.createHash('sha1').update(req.url).digest('hex')

        const hit = readApiCache(cacheKey)
        if (hit) {
          res.statusCode = hit.status
          res.setHeader('content-type', hit.contentType)
          if (hit.cacheControl) res.setHeader('cache-control', hit.cacheControl)
          res.setHeader('x-homeside-dev-cache', 'HIT')
          res.end(hit.body)
          return
        }

        try {
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          const response: Response = await mod.default(new Request('http://localhost' + req.url))
          const body = await response.text()
          const cacheControl = response.headers.get('cache-control') || ''
          const sMaxAge = Number(/s-maxage=(\d+)/.exec(cacheControl)?.[1] ?? 0)
          // Cache real data and brief error backoffs, but never the "no key set"
          // state — that's config, not a resource; it must clear the instant a key
          // is added rather than linger from a persisted entry.
          const isNoKey = /"source"\s*:\s*"none"/.test(body)
          if (sMaxAge > 0 && !isNoKey) {
            writeApiCache(cacheKey, {
              expiry: Date.now() + sMaxAge * 1000,
              status: response.status,
              contentType: response.headers.get('content-type') || 'application/json',
              cacheControl,
              body,
            })
          }
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.setHeader('x-homeside-dev-cache', 'MISS')
          res.end(body)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ source: 'error', reason: 'dev api: ' + (e as Error).message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load ALL env vars (including non-VITE_ server-only ones) from .env for the dev API.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), apiDev(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Honour a preview-assigned port (PORT env) so the dev server isn't pinned to
    // 5173; the app has no hard dependency on a specific port.
    server: {
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
    },
  }
})
