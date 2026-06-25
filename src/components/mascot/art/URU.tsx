import { Face } from '../faces'
import type { MascotArt } from '../types'
import { rgba } from '@/lib/prng'

/** Uruguay — a little Sun of May sprite: a radiant ray-crowned sun that stands and waves. */
export const URU: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  const cx = 100
  const cy = 102
  const rDisc = 42

  // The signature: a ring of alternating straight + wavy rays (the Sun of May).
  const N = 16
  const rays = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2
    const base = rDisc - 1
    const long = i % 2 === 0
    const tip = rDisc + (long ? 26 : 15)
    const wob = long ? 0.1 : 0.16
    const x1 = cx + Math.cos(a - wob) * base
    const y1 = cy + Math.sin(a - wob) * base
    const x2 = cx + Math.cos(a) * tip
    const y2 = cy + Math.sin(a) * tip
    const x3 = cx + Math.cos(a + wob) * base
    const y3 = cy + Math.sin(a + wob) * base
    // long rays come to a soft point; short rays curve gently for variety
    return long
      ? `M${x1},${y1} L${x2},${y2} L${x3},${y3} Z`
      : `M${x1},${y1} Q${x2},${y2} ${x3},${y3} Z`
  }).join(' ')

  return (
    <g>
      {/* the radiant ray-crown (the signature feature, strong team color) */}
      <path d={rays} fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet peeking below the sun */}
      <ellipse cx={86} cy={188} rx={11} ry={7} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={188} rx={11} ry={7} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />

      {/* stubby waving arms tucked at the sun's sides */}
      <path d="M60,118 Q40,118 44,138 Q56,134 64,130 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M140,118 Q160,114 158,134 Q146,132 136,130 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* the sun's disc face/body */}
      <circle cx={cx} cy={cy} r={rDisc} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={cx} cy={cy + 4} r={rDisc - 12} fill={palette.belly} />

      {/* a soft glow halo just inside the rim */}
      <circle cx={cx} cy={cy} r={rDisc - 4} fill="none" stroke={rgba('#ffffff', 0.45)} strokeWidth={2.4} />

      {/* gentle face on the sun */}
      <Face mood={mood} cx={cx} cy={cy - 2} w={32} ink={palette.ink} />
    </g>
  )
}
