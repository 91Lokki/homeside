import type { TeamMatchStats } from '@/lib/api'

/**
 * Team "ability card" ratings — every axis derived from REAL aggregated stats
 * over the team's finished matches. Axes are scaled to fixed, typical ranges
 * (not ranked against other teams — that would cost ~104 API calls). An axis
 * with no underlying data stays null; <2 matches marks the whole card provisional.
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
  playstyle: string
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

export function computeRatings(stats: TeamMatchStats[]): Ratings {
  const n = stats.length
  if (n === 0) {
    return {
      axes: { attack: null, finishing: null, possession: null, defense: null, creativity: null, discipline: null },
      playstyle: 'No matches yet',
      matchesUsed: 0,
      provisional: true,
    }
  }

  const gf = avg(stats, (s) => s.goalsFor)
  const ga = avg(stats, (s) => s.goalsAgainst)
  const poss = avg(stats, (s) => s.possession)
  const shots = avg(stats, (s) => s.shots)
  const sot = avg(stats, (s) => s.shotsOnTarget)
  const xa = avg(stats, (s) => s.xa)
  const keyP = avg(stats, (s) => s.keyPasses)
  const fouls = avg(stats, (s) => s.fouls)
  const cards = avg(stats, (s) => (s.yellow ?? 0) + (s.red ?? 0) * 2)
  const cleanRate = stats.filter((s) => s.cleanSheet).length / n

  const attack =
    gf == null && shots == null ? null : 0.6 * scale(gf ?? 0, 0, 2.5) + 0.4 * scale(shots ?? 0, 4, 18)

  const finishing =
    gf == null || sot == null || sot === 0 ? (gf != null && (sot ?? 0) === 0 ? scale(gf, 0, 2.5) * 0.5 : null) : scale(gf / sot, 0, 0.6)

  const possession = poss == null ? null : scale(poss, 30, 70)

  const defense = ga == null ? null : 0.65 * (100 - scale(ga, 0, 2.5)) + 0.35 * (cleanRate * 100)

  const creativity =
    keyP == null && xa == null ? null : 0.6 * scale(keyP ?? 0, 3, 14) + 0.4 * scale(xa ?? 0, 0.3, 2)

  const discipline = fouls == null && cards == null ? null : 100 - scale((fouls ?? 0) + 3 * (cards ?? 0), 5, 28)

  const axes: Record<AxisKey, number | null> = {
    attack: round(attack),
    finishing: round(finishing),
    possession: round(possession),
    defense: round(defense),
    creativity: round(creativity),
    discipline: round(discipline),
  }

  return { axes, playstyle: describePlaystyle(axes), matchesUsed: n, provisional: n < 2 }
}

function round(n: number | null): number | null {
  return n == null ? null : Math.round(n)
}

const PHRASE: Record<AxisKey, string> = {
  attack: 'Attack-minded',
  finishing: 'Clinical',
  possession: 'Possession-based',
  defense: 'Defensively solid',
  creativity: 'Creative',
  discipline: 'Disciplined',
}

function describePlaystyle(axes: Record<AxisKey, number | null>): string {
  const ranked = (Object.entries(axes) as [AxisKey, number | null][])
    .filter(([, v]) => v != null)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  if (ranked.length === 0) return 'Awaiting stats'
  const [top, second] = ranked
  if (second && (second[1] as number) >= (top[1] as number) - 8) {
    return `${PHRASE[top[0]]} · ${PHRASE[second[0]].toLowerCase()}`
  }
  return PHRASE[top[0]]
}
