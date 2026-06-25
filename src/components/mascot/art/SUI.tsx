import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Switzerland — an edelweiss sprite: a star of woolly white petals crowns a tiny alpine body. */
export const SUI: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  // A ring of pointed, woolly petals (edelweiss bracts) around the head at (100,108).
  // Two staggered rings give the characteristic double-star silhouette.
  const cx = 100
  const cy = 108
  const petal = (angle: number, len: number, halfW: number) => {
    const a = (angle * Math.PI) / 180
    const tx = cx + Math.cos(a) * len
    const ty = cy + Math.sin(a) * len
    // base offsets perpendicular to the petal axis
    const px = Math.cos(a + Math.PI / 2)
    const py = Math.sin(a + Math.PI / 2)
    const bx = cx + Math.cos(a) * 12
    const by = cy + Math.sin(a) * 12
    return `M${bx + px * halfW},${by + py * halfW} Q${tx + px * halfW * 0.4},${ty + py * halfW * 0.4} ${tx},${ty} Q${tx - px * halfW * 0.4},${ty - py * halfW * 0.4} ${bx - px * halfW},${by - py * halfW} Z`
  }

  return (
    <g>
      {/* alpine leaves (behind the body) */}
      <path d="M62,168 Q40,160 44,134 Q62,144 68,168 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M138,168 Q160,160 156,134 Q138,144 132,168 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={89} cy={196} rx={9} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={111} cy={196} rx={9} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* small rounded stem-body */}
      <ellipse cx={100} cy={170} rx={30} ry={28} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={178} rx={17} ry={16} fill={palette.belly} />

      {/* outer petal ring — 6 long woolly bracts (the signature star) */}
      <g fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
        <path d={petal(-90, 48, 13)} />
        <path d={petal(-30, 48, 13)} />
        <path d={petal(30, 48, 13)} />
        <path d={petal(90, 44, 13)} />
        <path d={petal(150, 48, 13)} />
        <path d={petal(210, 48, 13)} />
      </g>

      {/* inner petal ring — staggered shorter bracts for the double-star look */}
      <g fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
        <path d={petal(-60, 34, 10)} />
        <path d={petal(0, 34, 10)} />
        <path d={petal(60, 34, 10)} />
        <path d={petal(120, 34, 10)} />
        <path d={petal(180, 34, 10)} />
        <path d={petal(240, 34, 10)} />
      </g>

      {/* florescent center disc */}
      <circle cx={cx} cy={cy} r={20} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />

      {/* the ONE strong-color feature: a ring of little florets framing the face */}
      <g fill={palette.color} stroke={palette.outline} strokeWidth={1.4}>
        <circle cx={cx - 13} cy={cy - 9} r={3.2} />
        <circle cx={cx} cy={cy - 13} r={3.2} />
        <circle cx={cx + 13} cy={cy - 9} r={3.2} />
        <circle cx={cx - 6} cy={cy + 11} r={3.2} />
        <circle cx={cx + 6} cy={cy + 11} r={3.2} />
      </g>

      {/* face nestled in the bloom center */}
      <Face mood={mood} cx={cx} cy={cy - 1} w={22} eyeR={6} ink={palette.ink} />
    </g>
  )
}
