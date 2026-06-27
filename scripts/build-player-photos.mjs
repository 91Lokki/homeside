/**
 * Scrape Transfermarkt portrait photos for every World Cup squad player and
 * build a name→photo mapping. ONE-TIME build tool (like build-squads.mjs).
 *
 *   node scripts/build-player-photos.mjs
 *
 * Strategy: Transfermarkt has no public API, and portrait URLs need an
 * unguessable timestamp (`/portrait/big/{id}-{ts}.jpg`). But the quick-search
 * endpoint returns server-side HTML with each candidate's id, portrait URL,
 * current club, and nationality — enough to match against our squad rows
 * (name + club). Output is keyed by the same playerKey the app uses
 * (`${code}·${name}·${number}`), with full candidate lists kept for any match
 * that isn't an exact name + club hit, so a follow-up pass can disambiguate.
 *
 * Resumable: re-running skips players already in the output file.
 * Images are NOT downloaded here — see download-player-photos.mjs.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SQUADS = JSON.parse(readFileSync('.research/squads-2026.json', 'utf8'))
const OUT = '.research/player-photos.json'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const norm = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const toks = (s) => new Set(norm(s).split(' ').filter(Boolean))
const sameTokens = (a, b) => {
  const A = toks(a), B = toks(b)
  if (A.size !== B.size || !A.size) return false
  for (const x of A) if (!B.has(x)) return false
  return true
}
const jac = (a, b) => {
  const A = toks(a), B = toks(b)
  if (!A.size || !B.size) return 0
  let i = 0
  for (const x of A) if (B.has(x)) i++
  return i / (A.size + B.size - i)
}
const playerKey = (code, name, number) => `${code}·${name}·${number ?? ''}`

async function fetchSearch(query, tries = 3) {
  const url = 'https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=' + encodeURIComponent(query)
  for (let t = 0; t < tries; t++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } })
      if (res.status === 200) return parse(await res.text())
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (t + 1))
        continue
      }
      return []
    } catch {
      await sleep(1500 * (t + 1))
    }
  }
  return null // signal failure (distinct from "no results")
}

/** Query variants: handles East-Asian family-first order (our "Kim Min-jae" =
 *  Transfermarkt "Min-jae Kim") and hyphen differences. Stops at first hit. */
function nameVariants(name) {
  const parts = name.trim().split(/\s+/)
  const out = [name]
  if (parts.length >= 2) out.push([...parts].reverse().join(' '))
  const deh = name.replace(/-/g, ' ')
  if (deh !== name) {
    out.push(deh)
    const dp = deh.split(/\s+/)
    if (dp.length >= 2) out.push([...dp].reverse().join(' '))
  }
  return [...new Set(out)]
}

async function search(name) {
  for (const q of nameVariants(name)) {
    const r = await fetchSearch(q)
    if (r === null) return null // hard failure — let caller retry later
    if (r.length) return r
    await sleep(250)
  }
  return []
}

function parse(html) {
  const cands = []
  // Each player result row: portrait <img ... portrait/{size}/{id}-{ts}.{ext}... title="NAME" class="bilderrahmen-fixed">
  const re = /portrait\/(?:small|medium|big)\/(\d+)-(\d+)\.(jpg|png)\?[^"]*"\s+title="([^"]+)"\s+alt="[^"]*"\s+class="bilderrahmen-fixed"/g
  let m
  while ((m = re.exec(html))) {
    const [, id, ts, ext, pname] = m
    const seg = html.slice(m.index, m.index + 700)
    const club = seg.match(/startseite\/verein\/\d+"\s*>([^<]+)<\/a>/)?.[1]?.trim() ?? null
    const nat = seg.match(/flaggenrahmen"\s+title="([^"]+)"/)?.[1]?.trim() ?? null
    cands.push({
      id,
      url: `https://img.a.transfermarkt.technology/portrait/big/${id}-${ts}.${ext}`,
      name: pname,
      club,
      nat,
    })
  }
  return cands
}

function score(player, c) {
  const exact = sameTokens(c.name, player.name) ? 1 : 0
  const ns = jac(c.name, player.name)
  const cs = player.club && c.club ? jac(c.club, player.club) : 0
  return { total: exact * 2 + ns + cs * 0.9, exact, ns, cs }
}

function pickBest(player, cands) {
  let best = null, bestS = null
  for (const c of cands) {
    const s = score(player, c)
    if (!bestS || s.total > bestS.total) {
      best = c
      bestS = s
    }
  }
  return { best, s: bestS }
}

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
let done = 0, hit = 0, miss = 0, fail = 0
const t0 = Date.now()

for (const team of SQUADS) {
  const code = team.code
  for (const p of team.players) {
    const key = playerKey(code, p.name, p.number)
    if (out[key]) continue // resume
    const cands = await search(p.name)
    done++
    if (cands === null) {
      fail++
      console.log(`  ⚠  FETCH-FAIL ${code} ${p.name}`)
      await sleep(800)
      continue
    }
    if (cands.length === 0) {
      out[key] = { teamCode: code, name: p.name, number: p.number ?? null, club: p.club ?? null, position: p.position, chosen: null, confidence: 'NONE', candidates: [] }
      miss++
      console.log(`  ∅  ${code} ${p.name} (no results)`)
    } else {
      const { best, s } = pickBest(p, cands)
      const confidence = s.exact && s.cs > 0 ? 'HIGH' : s.exact ? 'MED' : 'LOW'
      out[key] = {
        teamCode: code,
        name: p.name,
        number: p.number ?? null,
        club: p.club ?? null,
        position: p.position,
        chosen: best,
        confidence,
        // keep all candidates unless it's a clean HIGH hit, so we can re-pick
        candidates: confidence === 'HIGH' ? undefined : cands,
      }
      hit++
      if (confidence !== 'HIGH') console.log(`  ?  [${confidence}] ${code} ${p.name} -> ${best.name} @ ${best.club} (${cands.length} cands)`)
    }
    // checkpoint every 10 players so an interruption never loses much
    if (done % 10 === 0) {
      writeFileSync(OUT, JSON.stringify(out, null, 2))
      const rate = (Date.now() - t0) / done / 1000
      console.log(`… ${done} done (hit ${hit}, miss ${miss}, fail ${fail}) ~${rate.toFixed(2)}s/ea`)
    }
    await sleep(550)
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 2))
const total = Object.keys(out).length
const byConf = {}
for (const v of Object.values(out)) byConf[v.confidence] = (byConf[v.confidence] || 0) + 1
console.log(`\nDONE. ${total} players in ${OUT}`)
console.log('confidence:', JSON.stringify(byConf))
console.log(`hit ${hit}, miss ${miss}, fetch-fail ${fail}`)
