/**
 * One-shot API-Football diagnosis. Reads .env (never prints the key) and checks:
 *   - your account plan + remaining requests   (/status)
 *   - that the World Cup league + 2026 season are in your plan   (/leagues)
 *   - what the fixtures call actually returns: status, count, errors, team names
 *   - whether events/statistics resolve for a finished fixture
 *
 * Run:  node scripts/diagnose-api.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  // Same precedence as Vite: .env then .env.local (local wins), plus dev variants.
  const out = {}
  for (const name of ['.env', '.env.development', '.env.local', '.env.development.local']) {
    const file = path.join(ROOT, name)
    if (!fs.existsSync(file)) continue
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !line.trimStart().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}

const fileEnv = loadEnv()
// Prefer a real exported shell var, then .env. (Either way the key is never printed.)
const get = (k) => process.env[k] ?? fileEnv[k]
const key = get('API_FOOTBALL_KEY')
const host = get('API_FOOTBALL_HOST') || 'v3.football.api-sports.io'
const league = get('WC_LEAGUE_ID') || '1'
const season = get('WC_SEASON') || '2026'
const isRapid = host.includes('rapidapi')

if (!key || key === 'your key') {
  console.log('✗ No real API_FOOTBALL_KEY found in .env')
  console.log('  Create a .env file (NOT .env.example) at the project root with:')
  console.log('    API_FOOTBALL_KEY=<your actual key>')
  console.log('    API_FOOTBALL_HOST=' + host)
  console.log('    WC_LEAGUE_ID=' + league)
  console.log('    WC_SEASON=' + season)
  process.exit(1)
}

const base = isRapid ? `https://${host}/v3` : `https://${host}`
const headers = isRapid ? { 'x-rapidapi-key': key, 'x-rapidapi-host': host } : { 'x-apisports-key': key }

async function call(p, params = {}) {
  const url = new URL(base + p)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* */
  }
  return { status: res.status, json, text }
}

console.log(`\nHost: ${base}  (${isRapid ? 'RapidAPI' : 'direct API-Sports'})`)
console.log(`Params: league=${league} season=${season}\n`)

// 1) account status
{
  const { status, json } = await call('/status')
  console.log(`[/status] HTTP ${status}`)
  const r = json?.response
  if (r) {
    console.log(`  account: ${r.account?.firstname ?? ''} ${r.account?.lastname ?? ''}`.trim())
    console.log(`  plan: ${r.subscription?.plan}   active: ${r.subscription?.active}   ends: ${r.subscription?.end}`)
    console.log(`  requests today: ${r.requests?.current}/${r.requests?.limit_day}`)
  }
  if (json?.errors && Object.keys(json.errors).length) console.log('  errors:', JSON.stringify(json.errors))
}

// 2) league + available seasons
{
  const { status, json } = await call('/leagues', { id: league })
  console.log(`\n[/leagues?id=${league}] HTTP ${status}`)
  const lg = json?.response?.[0]
  if (lg) {
    console.log(`  league: ${lg.league?.name} (${lg.league?.type})`)
    const seasons = (lg.seasons ?? []).map((s) => s.year)
    console.log(`  seasons available on your plan: ${seasons.join(', ') || '(none)'}`)
    console.log(`  includes ${season}? ${seasons.includes(Number(season)) ? 'YES' : 'NO  <-- likely the problem'}`)
  } else {
    console.log('  no league returned', json?.errors ? JSON.stringify(json.errors) : '')
  }
}

// 3) fixtures
let finishedId = null
let homeName, awayName
{
  const { status, json } = await call('/fixtures', { league, season })
  console.log(`\n[/fixtures] HTTP ${status}  results=${json?.results ?? '?'}`)
  if (json?.errors && (Array.isArray(json.errors) ? json.errors.length : Object.keys(json.errors).length))
    console.log('  errors:', JSON.stringify(json.errors), '  <-- read this carefully')
  const arr = json?.response ?? []
  const names = new Set()
  for (const f of arr) {
    names.add(f.teams?.home?.name)
    names.add(f.teams?.away?.name)
    if (!finishedId && ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short)) {
      finishedId = f.fixture?.id
      homeName = f.teams?.home?.name
      awayName = f.teams?.away?.name
    }
  }
  if (arr.length) {
    console.log(`  distinct team names (${names.size}): ${[...names].slice(0, 48).join(', ')}`)
    console.log(`  first finished fixture: id=${finishedId} (${homeName} vs ${awayName})`)
  }
}

// 4) events + statistics for one finished fixture
if (finishedId) {
  const ev = await call('/fixtures/events', { fixture: String(finishedId) })
  const st = await call('/fixtures/statistics', { fixture: String(finishedId) })
  console.log(`\n[/fixtures/events?fixture=${finishedId}] HTTP ${ev.status} results=${ev.json?.results ?? '?'}`)
  console.log(`[/fixtures/statistics?fixture=${finishedId}] HTTP ${st.status} results=${st.json?.results ?? '?'}`)
  const statTeams = (st.json?.response ?? []).map((s) => s.team?.name)
  if (statTeams.length) console.log(`  statistics team names: ${statTeams.join(', ')}`)
} else {
  console.log('\nNo finished fixture found — cannot test events/statistics (expected if the season returned nothing).')
}

console.log('\nDone.')
