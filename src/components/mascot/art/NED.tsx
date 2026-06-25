import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Netherlands — a little tulip sprite: a bloom crown over a rounded body. */
export const NED: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* leaves (behind body) */}
      <path d="M58,150 Q34,138 40,108 Q60,120 66,150 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M142,150 Q166,138 160,108 Q140,120 134,150 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={88} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* body */}
      <ellipse cx={100} cy={146} rx={44} ry={46} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={160} rx={26} ry={28} fill={palette.belly} />

      {/* tulip bloom crown */}
      <g>
        <path d="M74,104 Q72,72 100,66 Q128,72 126,104 Q100,114 74,104 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M100,66 Q102,84 100,108" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.5} />
        <path d="M86,70 Q88,88 90,106" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />
        <path d="M114,70 Q112,88 110,106" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />
      </g>

      {/* face on the body */}
      <Face mood={mood} cx={100} cy={140} w={34} ink={palette.ink} />
    </g>
  )
}
