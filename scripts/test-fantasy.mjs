/**
 * Validates the in-play-vs-shootout penalty separation against REAL data: the
 * 2022 World Cup final (Argentina 3-3 France, 4-2 pens). Mirrors the helper in
 * src/domain/fantasy.ts (isShootoutKick). Run: node scripts/test-fantasy.mjs
 */
import fs from 'node:fs'

// --- mirror of src/domain/fantasy.ts isShootoutKick ---
const isShootoutKick = (rawTime, hadShootout) => hadShootout && /^120\+\d+$/.test((rawTime || '').trim())

function loadEnv() {
  const out = {}
  for (const f of ['.env', '.env.local']) {
    if (!fs.existsSync(f)) continue
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !l.trimStart().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return out
}
const key = process.env.HIGHLIGHTLY_KEY || loadEnv().HIGHLIGHTLY_KEY
const FINAL_ID = 833248073 // Argentina v France, 2022 final

let pass = 0
let fail = 0
const check = (name, cond) => {
  if (cond) {
    pass++
    console.log('  ✓', name)
  } else {
    fail++
    console.log('  ✗ FAIL:', name)
  }
}

// unit checks on the helper alone
console.log('isShootoutKick unit checks:')
check('120+1 with shootout → true', isShootoutKick('120+1', true) === true)
check('120+3 with shootout → true', isShootoutKick('120+3', true) === true)
check('120+1 WITHOUT shootout → false', isShootoutKick('120+1', false) === false)
check('in-play "23" → false', isShootoutKick('23', true) === false)
check('extra-time "118" → false', isShootoutKick('118', true) === false)
check('stoppage "90+2" → false', isShootoutKick('90+2', true) === false)

if (!key || /貼這裡|your key/.test(key)) {
  console.log('\n(no HIGHLIGHTLY_KEY — skipping live 2022-final check)')
  process.exit(fail ? 1 : 0)
}

const res = await fetch(`https://soccer.highlightly.net/matches/${FINAL_ID}`, { headers: { 'x-rapidapi-key': key } })
const json = await res.json()
const detail = Array.isArray(json) ? json[0] : json
const hadShootout = detail?.state?.score?.penalties != null
const events = detail?.events ?? []

console.log(`\nLive 2022 final: score ${detail?.state?.score?.current}, pens ${detail?.state?.score?.penalties}, hadShootout=${hadShootout}`)
const pens = events.filter((e) => /penalty/i.test(e.type))
const inPlay = pens.filter((e) => !isShootoutKick(e.time, hadShootout))
const shootout = pens.filter((e) => isShootoutKick(e.time, hadShootout))
console.log('  in-play penalties:', inPlay.map((e) => `${e.time} ${e.type} ${e.player}`).join(' | '))
console.log('  shootout kicks:   ', shootout.map((e) => `${e.time} ${e.type} ${e.player}`).join(' | '))

console.log('\nClassification checks:')
check('match detected as shootout', hadShootout === true)
check('in-play penalties exist (Messi/Mbappé)', inPlay.length >= 2)
check('shootout kicks exist', shootout.length >= 2)
check('no in-play penalty is timed 120+N', inPlay.every((e) => !/^120\+/.test(e.time)))
check('every shootout kick is timed 120+N', shootout.every((e) => /^120\+/.test(e.time)))
// clean sheet must ignore the shootout: final was 3-3 → neither side a clean sheet
const cs = detail?.state?.score?.current
check('regulation/ET score (clean-sheet basis) excludes shootout', cs === '3 - 3')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
