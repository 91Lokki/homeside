import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Argentina — a gentle sun (a nod to the Sol de Mayo), no body, just warmth. */
export const ARG: MascotArt = ({ palette, mood }) => {
  const sw = 3.2
  const cx = 100
  const cy = 112
  const rDisc = 46
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    const base = rDisc - 2
    const tip = rDisc + 20
    const wob = 0.13
    const x1 = cx + Math.cos(a - wob) * base
    const y1 = cy + Math.sin(a - wob) * base
    const x2 = cx + Math.cos(a) * tip
    const y2 = cy + Math.sin(a) * tip
    const x3 = cx + Math.cos(a + wob) * base
    const y3 = cy + Math.sin(a + wob) * base
    return `M${x1},${y1} L${x2},${y2} L${x3},${y3} Z`
  }).join(' ')

  return (
    <g>
      {/* rays */}
      <path d={rays} fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* disc */}
      <circle cx={cx} cy={cy} r={rDisc} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={rDisc - 9} fill={palette.belly} opacity={0.7} />
      {/* face */}
      <Face mood={mood} cx={cx} cy={cy - 4} w={34} ink={palette.ink} />
    </g>
  )
}
