/**
 * Seed generator. Reads the VERIFIED research snapshot in /.research and emits
 * typed data modules into /src/data. Run with: node scripts/build-seed.mjs
 *
 * This is the honest seed: a real snapshot of the 2026 World Cup as of the
 * `asOf` date. Live API data overrides it at runtime when a key is present; with
 * no key, the app simply holds at this real state (it never fabricates results).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, '.research', f), 'utf8'))
const OUT = path.join(ROOT, 'src', 'data')
fs.mkdirSync(OUT, { recursive: true })

const groups = R('groups.json')
const colorsData = R('colors.json')
const starsData = R('stars.json')
const fixtures = R('fixtures.json')
const bracket = R('bracket.json')
const apiRef = R('apiRef.json')

const HOSTS = new Set(['USA', 'CAN', 'MEX'])

// Traditional-Chinese country names (Taiwan standard) — exercises the Noto Sans TC stack.
const TC = {
  MEX: '墨西哥', RSA: '南非', KOR: '南韓', CZE: '捷克', CAN: '加拿大', BIH: '波士尼亞', QAT: '卡達',
  SUI: '瑞士', BRA: '巴西', MAR: '摩洛哥', HAI: '海地', SCO: '蘇格蘭', USA: '美國', PAR: '巴拉圭',
  AUS: '澳洲', TUR: '土耳其', GER: '德國', CUW: '古拉索', CIV: '象牙海岸', ECU: '厄瓜多', NED: '荷蘭',
  JPN: '日本', SWE: '瑞典', TUN: '突尼西亞', BEL: '比利時', EGY: '埃及', IRN: '伊朗', NZL: '紐西蘭',
  ESP: '西班牙', CPV: '維德角', KSA: '沙烏地阿拉伯', URU: '烏拉圭', FRA: '法國', SEN: '塞內加爾',
  IRQ: '伊拉克', NOR: '挪威', ARG: '阿根廷', ALG: '阿爾及利亞', AUT: '奧地利', JOR: '約旦', POR: '葡萄牙',
  COD: '剛果民主共和國', UZB: '烏茲別克', COL: '哥倫比亞', ENG: '英格蘭', CRO: '克羅埃西亞', GHA: '迦納', PAN: '巴拿馬',
}

const POS = { Goalkeeper: 'GK', Defender: 'DF', Midfielder: 'MF', Forward: 'FW', Coach: 'MGR' }
const shortPos = (p) => POS[p] || p

function luminance(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const ch = (c) => {
    const s = (c / 255)
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255)
}

const colorByCode = Object.fromEntries(colorsData.teams.map((t) => [t.code, t]))
const starByCode = Object.fromEntries(starsData.teams.map((t) => [t.code, t]))

/* ------------------------------- teams ------------------------------------ */
const TEAMS = []
for (const g of groups.groups) {
  for (const t of g.teams) {
    const c = colorByCode[t.code] || {}
    // Store the TRUE identity colors. Contrast against the gallery-white / dark
    // canvas is handled at runtime (the theme provider derives a readable accent
    // from these), so we never distort a team's real color here.
    const color = c.primaryHex || '#4a4a45'
    const color2 = c.secondaryHex || '#ffffff'
    TEAMS.push({
      code: t.code,
      name: t.name,
      nameTC: TC[t.code],
      group: g.id,
      color,
      color2,
      symbol: c.symbol || 'leaf',
      ...(HOSTS.has(t.code) ? { host: true } : {}),
    })
  }
}

/* ------------------------------- squads ----------------------------------- */
const SQUADS = {}
for (const code of TEAMS.map((t) => t.code)) {
  const s = starByCode[code]
  if (!s) continue
  const player = (p) => ({
    name: p.name,
    position: shortPos(p.position),
    number: p.number ?? null,
    ...(p.club ? { club: p.club } : {}),
  })
  SQUADS[code] = {
    star: player(s.star),
    notable: (s.notableSquad || []).map(player),
  }
}

/* ------------------------------- fixtures --------------------------------- */
function splitVenue(v) {
  if (!v) return { venue: undefined, city: undefined }
  const i = v.indexOf(',')
  if (i === -1) return { venue: v, city: undefined }
  return { venue: v.slice(0, i).trim(), city: v.slice(i + 1).trim() }
}

const SEED_MATCHES = fixtures.matches.map((m, i) => {
  const { venue, city } = splitVenue(m.venue)
  return {
    id: `g${i + 1}`,
    stage: 'group',
    group: m.group,
    homeCode: m.homeCode,
    awayCode: m.awayCode,
    kickoff: m.kickoffUtc,
    venue,
    city,
    status: m.status === 'finished' ? 'finished' : m.status === 'live' ? 'live' : 'scheduled',
    homeScore: m.status === 'finished' ? m.homeScore : null,
    awayScore: m.status === 'finished' ? m.awayScore : null,
  }
})

/* ------------------------------- bracket ---------------------------------- */
function parseSlot(str) {
  const winner = str.match(/^Winner Group ([A-L])$/i)
  if (winner) return { source: { kind: 'winner', group: winner[1] }, label: `Winner ${winner[1]}` }
  const ru = str.match(/^Runner-?up Group ([A-L])$/i)
  if (ru) return { source: { kind: 'runnerUp', group: ru[1] }, label: `Runner-up ${ru[1]}` }
  const third = str.match(/Third Place Group ([A-L/]+)/i)
  if (third) {
    const gs = third[1].split('/').map((x) => x.trim()).filter(Boolean)
    return { source: { kind: 'third', groups: gs }, label: `3rd ${gs.join('/')}` }
  }
  return { source: { kind: 'winner', group: '?' }, label: str }
}

const BRACKET = []
for (const m of bracket.r32) {
  const { venue, city } = splitVenue(m.venue)
  BRACKET.push({
    matchNo: m.matchNo,
    stage: 'R32',
    home: parseSlot(m.slotHome),
    away: parseSlot(m.slotAway),
    kickoff: m.kickoffUtc,
    venue,
    city,
  })
}

// Fixed bracket wiring for R16 -> Final (match numbers per official FIFA schedule).
const LATER = [
  { matchNo: 89, stage: 'R16', h: 74, a: 77, date: '2026-07-04', venue: 'Lincoln Financial Field', city: 'Philadelphia' },
  { matchNo: 90, stage: 'R16', h: 73, a: 75, date: '2026-07-04', venue: 'NRG Stadium', city: 'Houston' },
  { matchNo: 91, stage: 'R16', h: 76, a: 78, date: '2026-07-05', venue: 'MetLife Stadium', city: 'East Rutherford' },
  { matchNo: 92, stage: 'R16', h: 79, a: 80, date: '2026-07-05', venue: 'Estadio Azteca', city: 'Mexico City' },
  { matchNo: 93, stage: 'R16', h: 83, a: 84, date: '2026-07-06', venue: 'AT&T Stadium', city: 'Arlington' },
  { matchNo: 94, stage: 'R16', h: 81, a: 82, date: '2026-07-06', venue: 'Lumen Field', city: 'Seattle' },
  { matchNo: 95, stage: 'R16', h: 86, a: 88, date: '2026-07-07', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { matchNo: 96, stage: 'R16', h: 85, a: 87, date: '2026-07-07', venue: 'BC Place', city: 'Vancouver' },
  { matchNo: 97, stage: 'QF', h: 89, a: 90, date: '2026-07-09', venue: 'Gillette Stadium', city: 'Foxborough' },
  { matchNo: 98, stage: 'QF', h: 93, a: 94, date: '2026-07-10', venue: 'SoFi Stadium', city: 'Inglewood' },
  { matchNo: 99, stage: 'QF', h: 91, a: 92, date: '2026-07-11', venue: 'Hard Rock Stadium', city: 'Miami Gardens' },
  { matchNo: 100, stage: 'QF', h: 95, a: 96, date: '2026-07-11', venue: 'Arrowhead Stadium', city: 'Kansas City' },
  { matchNo: 101, stage: 'SF', h: 97, a: 98, date: '2026-07-14', venue: 'AT&T Stadium', city: 'Arlington' },
  { matchNo: 102, stage: 'SF', h: 99, a: 100, date: '2026-07-15', venue: 'Mercedes-Benz Stadium', city: 'Atlanta' },
  { matchNo: 103, stage: 'F3', h: 101, a: 102, loser: true, date: '2026-07-18', venue: 'Hard Rock Stadium', city: 'Miami Gardens' },
  { matchNo: 104, stage: 'F', h: 101, a: 102, date: '2026-07-19', venue: 'MetLife Stadium', city: 'East Rutherford' },
]
for (const m of LATER) {
  const kind = m.loser ? 'matchLoser' : 'matchWinner'
  const tag = m.loser ? 'Loser' : 'Winner'
  BRACKET.push({
    matchNo: m.matchNo,
    stage: m.stage,
    home: { source: { kind, matchNo: m.h }, label: `${tag} M${m.h}` },
    away: { source: { kind, matchNo: m.a }, label: `${tag} M${m.a}` },
    kickoff: `${m.date}T18:00:00Z`,
    venue: m.venue,
    city: m.city,
  })
}

/* ------------------------------- write ------------------------------------ */
const banner = (extra = '') =>
  `/**\n * AUTO-GENERATED by scripts/build-seed.mjs — do not edit by hand.\n * Verified 2026 World Cup snapshot as of ${fixtures.asOf}.${extra}\n */\n`

function writeTs(file, name, value, type) {
  const baseType = type.replace(/\[\]$/, '')
  const body = `${banner()}import type { ${baseType} } from '@/domain/types'\n\nexport const ${name}: ${type} = ${JSON.stringify(value, null, 2)}\n`
  fs.writeFileSync(path.join(OUT, file), body)
}

// teams.ts (+ lookup)
fs.writeFileSync(
  path.join(OUT, 'teams.ts'),
  `${banner()}import type { Team } from '@/domain/types'\n\nexport const TEAMS: Team[] = ${JSON.stringify(TEAMS, null, 2)}\n\nexport const teamByCode: Record<string, Team> = Object.fromEntries(\n  TEAMS.map((t) => [t.code, t]),\n)\n\nexport const GROUP_IDS = [${[...new Set(TEAMS.map((t) => t.group))].map((g) => `'${g}'`).join(', ')}] as const\n`,
)

// squads.ts
fs.writeFileSync(
  path.join(OUT, 'squads.ts'),
  `${banner()}import type { Squad } from '@/domain/types'\n\nexport const SQUADS: Record<string, Squad> = ${JSON.stringify(SQUADS, null, 2)}\n`,
)

writeTs('fixtures.ts', 'SEED_MATCHES', SEED_MATCHES, 'Match[]')
writeTs('bracket.ts', 'BRACKET', BRACKET, 'BracketMatch[]')

// meta.ts
fs.writeFileSync(
  path.join(OUT, 'meta.ts'),
  `${banner()}\nexport const DATA_META = {\n  asOf: ${JSON.stringify(fixtures.asOf)},\n  finishedCount: ${SEED_MATCHES.filter((m) => m.status === 'finished').length},\n  totalGroupMatches: ${SEED_MATCHES.length},\n  thirdPlaceRule: ${JSON.stringify(bracket.thirdPlaceRule)},\n  api: {\n    provider: 'API-Football',\n    leagueId: ${JSON.stringify(apiRef.leagueId ?? '1')},\n    season: ${JSON.stringify(apiRef.season ?? '2026')},\n  },\n  sources: ${JSON.stringify((groups.sources || []).concat(fixtures.sources || []).slice(0, 8), null, 2)},\n} as const\n`,
)

// index.ts
fs.writeFileSync(
  path.join(OUT, 'index.ts'),
  `export * from './teams'\nexport * from './squads'\nexport * from './fixtures'\nexport * from './bracket'\nexport * from './meta'\n`,
)

console.log('Wrote src/data: teams(%d), squads(%d), matches(%d finished %d), bracket(%d), meta',
  TEAMS.length, Object.keys(SQUADS).length, SEED_MATCHES.length,
  SEED_MATCHES.filter((m) => m.status === 'finished').length, BRACKET.length)

// quick light-primary report
const light = TEAMS.filter((t) => luminance(t.color) > 0.7).map((t) => `${t.code}:${t.color}`)
if (light.length) console.log('note: light primaries kept:', light.join(', '))
