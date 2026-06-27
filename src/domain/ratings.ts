import type { TeamMatchStats } from '@/lib/api'

/**
 * Team "ability card" ratings — every axis from REAL aggregated stats over the
 * team's finished matches (live ESPN box scores). Each axis is scored DYNAMICALLY
 * against the rest of the field: a team's raw composite is placed on the field's
 * 5th–95th-percentile spread and mapped into [20, 93], so the scale adapts to the
 * tournament and no team is ever a flat 0 or a perfect 100. An axis with no data
 * stays null; <2 matches marks the card provisional. Nothing is ever fabricated.
 */
export type AxisKey = 'attack' | 'finishing' | 'possession' | 'defense' | 'creativity' | 'discipline'

export const AXIS_LABEL: Record<AxisKey, string> = {
  attack: 'Attack',
  finishing: 'Finishing',
  possession: 'Possession',
  defense: 'Defense',
  creativity: 'Creativity',
  discipline: 'Discipline',
}

export interface Ratings {
  axes: Record<AxisKey, number | null>
  /** Short headline, e.g. "Clinical · solid". */
  playstyle: string
  /** One-line plain-English read of the standout strength/weakness. */
  summary: string
  matchesUsed: number
  provisional: boolean
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
/** Scale a value into 0..100 against fixed [lo, hi] anchors. */
const scale = (v: number, lo: number, hi: number) => clamp(((v - lo) / (hi - lo)) * 100)

/** Average a numeric field over matches, ignoring nulls. Returns null if no data. */
function avg(stats: TeamMatchStats[], pick: (s: TeamMatchStats) => number | null): number | null {
  const vals = stats.map(pick).filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/** A weighted average that drops null components and renormalizes; null if all missing. */
function wavg(parts: [number | null, number][]): number | null {
  const live = parts.filter(([v]) => v != null) as [number, number][]
  if (live.length === 0) return null
  const tw = live.reduce((a, [, w]) => a + w, 0)
  return live.reduce((a, [v, w]) => a + v * w, 0) / tw
}

const round = (n: number | null): number | null => (n == null ? null : Math.round(n))

const EMPTY: Record<AxisKey, number | null> = {
  attack: null,
  finishing: null,
  possession: null,
  defense: null,
  creativity: null,
  discipline: null,
}

const AXES: AxisKey[] = ['attack', 'finishing', 'possession', 'defense', 'creativity', 'discipline']

/** The six raw composite axis values (0..100 on fixed anchors), BEFORE ranking
 *  against the field. Null for an axis with no underlying data. */
function rawAxes(stats: TeamMatchStats[]): Record<AxisKey, number | null> {
  const n = stats.length
  if (n === 0) return { ...EMPTY }

  const gf = avg(stats, (s) => s.goalsFor)
  const ga = avg(stats, (s) => s.goalsAgainst)
  const poss = avg(stats, (s) => s.possession)
  const shots = avg(stats, (s) => s.shots)
  const sot = avg(stats, (s) => s.shotsOnTarget)
  const passRaw = avg(stats, (s) => s.passPct)
  const passPct = passRaw == null ? null : passRaw <= 1 ? passRaw * 100 : passRaw // ESPN gives a 0..1 fraction
  const crosses = avg(stats, (s) => s.crosses)
  const corners = avg(stats, (s) => s.corners)
  const tackles = avg(stats, (s) => s.tackles)
  const intc = avg(stats, (s) => s.interceptions)
  const clr = avg(stats, (s) => s.clearances)
  const saves = avg(stats, (s) => s.gkSaves)
  const fouls = avg(stats, (s) => s.fouls)
  const cards = avg(stats, (s) => (s.yellow == null && s.red == null ? null : (s.yellow ?? 0) + (s.red ?? 0) * 2))
  const cleanRate = stats.filter((s) => s.cleanSheet).length / n

  // ATTACK — goal threat: scoring + shot volume + shots on target
  const attack = wavg([
    [gf == null ? null : scale(gf, 0.3, 2.6), 0.45],
    [shots == null ? null : scale(shots, 7, 18), 0.3],
    [sot == null ? null : scale(sot, 2, 8), 0.25],
  ])

  // FINISHING — conversion quality, tempered by output so one game can't max it
  const conv = gf != null && sot != null && sot > 0 ? gf / sot : null
  const finishing = wavg([
    [conv == null ? null : scale(conv, 0.15, 0.55), 0.6],
    [gf == null ? null : scale(gf, 0.3, 2.6), 0.4],
  ])

  // POSSESSION
  const possession = poss == null ? null : scale(poss, 36, 64)

  // DEFENSE — concede little + clean sheets + active defending + keeper saves
  const defActions = tackles == null && intc == null && clr == null ? null : (tackles ?? 0) + (intc ?? 0) + (clr ?? 0)
  const defense = wavg([
    [ga == null ? null : 100 - scale(ga, 0, 2.8), 0.45],
    [cleanRate * 100, 0.2],
    [defActions == null ? null : scale(defActions, 18, 60), 0.2],
    [saves == null ? null : scale(saves, 1, 6), 0.15],
  ])

  // CREATIVITY — chance creation / build-up: crosses + corners + passing accuracy
  const creativity = wavg([
    [crosses == null ? null : scale(crosses, 3, 16), 0.35],
    [corners == null ? null : scale(corners, 2, 9), 0.25],
    [passPct == null ? null : scale(passPct, 72, 90), 0.4],
  ])

  // DISCIPLINE — few fouls, few cards
  const discipline = wavg([
    [fouls == null ? null : 100 - scale(fouls, 6, 20), 0.6],
    [cards == null ? null : 100 - scale(cards, 0, 8), 0.4],
  ])

  return { attack, finishing, possession, defense, creativity, discipline }
}

export type League = Record<AxisKey, number[]>

/** Field distribution: every team's raw composite per axis, sorted ascending —
 *  the basis for ranking a team dynamically against the rest of the field. */
export function buildLeague(teamStats: TeamMatchStats[][]): League {
  const cols: League = { attack: [], finishing: [], possession: [], defense: [], creativity: [], discipline: [] }
  for (const s of teamStats) {
    if (!s || s.length === 0) continue
    const r = rawAxes(s)
    for (const k of AXES) if (r[k] != null) cols[k].push(r[k] as number)
  }
  for (const k of AXES) cols[k].sort((a, b) => a - b)
  return cols
}

// Dynamic scale: place a value on the field's 5th–95th-percentile spread, mapped
// into [LO, HI]. Bounds stay off 0/100; outliers clamp to the bounds.
const LO = 20
const HI = 93
function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const next = sorted[base + 1]
  return next == null ? sorted[base] : sorted[base] + (pos - base) * (next - sorted[base])
}
function relScale(v: number, sorted: number[]): number {
  const lo = quantile(sorted, 0.05)
  const hi = quantile(sorted, 0.95)
  if (hi <= lo) return (LO + HI) / 2
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  return LO + t * (HI - LO)
}

export function computeRatings(stats: TeamMatchStats[], league?: League): Ratings {
  const n = stats.length
  if (n === 0) return { axes: { ...EMPTY }, playstyle: 'No matches yet', summary: '', matchesUsed: 0, provisional: true }
  const raw = rawAxes(stats)
  const axes: Record<AxisKey, number | null> = { ...EMPTY }
  for (const k of AXES) {
    const v = raw[k]
    if (v == null) continue
    const dist = league?.[k]
    axes[k] = round(dist && dist.length >= 6 ? relScale(v, dist) : v)
  }
  return { axes, playstyle: describePlaystyle(axes), summary: describeSummary(axes), matchesUsed: n, provisional: n < 2 }
}

const PHRASE: Record<AxisKey, string> = {
  attack: 'Attack-minded',
  finishing: 'Clinical',
  possession: 'Possession-based',
  defense: 'Defensively solid',
  creativity: 'Creative',
  discipline: 'Disciplined',
}

function rank(axes: Record<AxisKey, number | null>): [AxisKey, number][] {
  return (Object.entries(axes) as [AxisKey, number | null][])
    .filter(([, v]) => v != null)
    .map(([k, v]) => [k, v as number] as [AxisKey, number])
    .sort((a, b) => b[1] - a[1])
}

function describePlaystyle(axes: Record<AxisKey, number | null>): string {
  const ranked = rank(axes)
  if (ranked.length === 0) return 'Awaiting stats'
  const [top, second] = ranked
  if (second && second[1] >= top[1] - 8) return `${PHRASE[top[0]]} · ${PHRASE[second[0]].toLowerCase()}`
  return PHRASE[top[0]]
}

const HIGH: Record<AxisKey, string> = {
  attack: 'a constant threat going forward',
  finishing: 'ruthless in front of goal',
  possession: 'in control of the ball',
  defense: 'hard to break down',
  creativity: 'a chance-creating machine',
  discipline: 'clean and composed',
}
const LOW: Record<AxisKey, string> = {
  attack: 'short of attacking punch',
  finishing: 'wasteful with their chances',
  possession: 'happy to play without the ball',
  defense: 'shaky at the back',
  creativity: 'lacking a creative spark',
  discipline: 'living on the edge',
}

/** A one-liner from the standout high (and a notable low, if any). */
function describeSummary(axes: Record<AxisKey, number | null>): string {
  const ranked = rank(axes)
  if (ranked.length === 0) return ''
  const top = ranked[0]
  const bottom = ranked[ranked.length - 1]
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  let out = cap(HIGH[top[0]])
  if (bottom[0] !== top[0] && bottom[1] < 50) out += `, but ${LOW[bottom[0]]}`
  return out + '.'
}
