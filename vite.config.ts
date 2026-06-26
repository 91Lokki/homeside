import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * Run the /api Edge functions during `npm run dev` — no Vercel CLI needed.
 *
 * The functions in /api are standard Request->Response handlers; here we adapt
 * Node's req/res to them and expose the server-side env (from .env) so the
 * Highlightly key works locally exactly as it will in production.
 */
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
        try {
          const mod = await server.ssrLoadModule(`/api/${route}.ts`)
          const response: Response = await mod.default(new Request('http://localhost' + req.url))
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(await response.text())
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
