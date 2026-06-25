/**
 * One-shot Highlightly Football API diagnosis. Reads HIGHLIGHTLY_KEY from the
 * environment or a .env* file (never prints the key) and checks, for the World
 * Cup (league 1635, season 2026):
 *   - /matches returns real fixtures (count, statuses, rounds, team names)
 *   - a finished match resolves goal EVENTS via /matches/{id}
 *   - /statistics/{id} returns possession / shots (with their exact displayNames)
 *   - the x-ratelimit-requests-remaining header (free tier = 100/day)
 *
 * Run:  node scripts/diagnose-highlightly.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFiles() {
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

const fileEnv = loadEnvFiles()
const get = (k) => process.env[k] ?? fileEnv[k]
const key = get('HIGHLIGHTLY_KEY')
const BASE = 'https://soccer.highlightly.net'
const league = get('WC_LEAGUE_ID') || '1635'
const season = get('WC_SEASON') || '2026'

if (!key || /貼這裡|your key|<.*>/.test(key)) {
  console.log('✗ No real HIGHLIGHTLY_KEY found. Put it in .env.local as: HIGHLIGHTLY_KEY=<your key>')
  process.exit(1)
}

let remaining = '?'
async function call(p, params = {}) {
  const url = new URL(BASE + p)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { 'x-rapidapi-key': key } })
  remaining = res.headers.get('x-ratelimit-requests-remaining') ?? remaining
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* */
  }
  return { status: res.status, json, text }
}

console.log(`\nBase: ${BASE}   league=${league} season=${season}\n`)

// matches — limit caps at 100, so page through to enumerate everything.
const page1 = await call('/matches', { leagueId: league, season, limit: '100', offset: '0' })
const arr = Array.isArray(page1.json) ? page1.json : page1.json?.data ?? []
const total = page1.json?.pagination?.totalCount ?? arr.length
console.log(`[GET /matches] HTTP ${page1.status}  page1=${arr.length}  totalCount=${total}  rateRemaining=${remaining}`)
if (!arr.length) {
  console.log('  no matches. Raw (first 400 chars):', page1.text.slice(0, 400))
  process.exit(1)
}
if (total > arr.length) {
  const page2 = await call('/matches', { leagueId: league, season, limit: '100', offset: String(arr.length) })
  const more = Array.isArray(page2.json) ? page2.json : page2.json?.data ?? []
  arr.push(...more)
  console.log(`  page2=${more.length}  total fetched=${arr.length}  rateRemaining=${remaining}`)
}

const statuses = new Set()
const rounds = new Set()
const names = new Set()
let finished = null
for (const m of arr) {
  statuses.add(m?.state?.description)
  rounds.add(m?.round)
  names.add(m?.homeTeam?.name)
  names.add(m?.awayTeam?.name)
  const desc = (m?.state?.description ?? '').toLowerCase()
  const cur = m?.state?.score?.current
  if (!finished && (desc.includes('finish') || desc.includes('after') || desc.includes('penalt')) && cur) finished = m
}
console.log('  distinct statuses:', [...statuses].join(' | '))
console.log('  distinct rounds:', [...rounds].join(' | '))
console.log(`  distinct team names (${names.size}):`)
console.log('   ', [...names].filter(Boolean).sort().join(', '))

console.log('\n  sample match object:')
console.log('   ', JSON.stringify(arr[0], null, 0).slice(0, 500))

if (!finished) {
  console.log('\nNo finished match found yet — cannot test events/statistics.')
  process.exit(0)
}
console.log(`\n  first finished: id=${finished.id} round="${finished.round}" ${finished.homeTeam?.name} ${finished.state?.score?.current} ${finished.awayTeam?.name}`)

// events via /matches/{id}
{
  const r = await call(`/matches/${finished.id}`)
  const detail = Array.isArray(r.json) ? r.json[0] : r.json
  const events = detail?.events ?? []
  console.log(`\n[GET /matches/${finished.id}] HTTP ${r.status}  events=${events.length}  rateRemaining=${remaining}`)
  const goals = events.filter((e) => (e?.type ?? '').toLowerCase() === 'goal')
  console.log('  goal events:', goals.map((g) => `${g.time} ${g.player} (${g.team?.name})`).join(' | ') || '(none)')
  if (events[0]) console.log('  sample event:', JSON.stringify(events[0]))
}

// statistics / box score
{
  const r = await call(`/statistics/${finished.id}`)
  const blocks = Array.isArray(r.json) ? r.json : r.json?.data ?? []
  console.log(`\n[GET /statistics/${finished.id}] HTTP ${r.status}  teamBlocks=${blocks.length}  rateRemaining=${remaining}`)
  for (const b of blocks) {
    console.log(`  ${b?.team?.name}: ` + (b?.statistics ?? []).map((s) => `${s.displayName}=${s.value}`).join(', '))
  }
}

console.log(`\nDone. requests remaining today: ${remaining}`)
