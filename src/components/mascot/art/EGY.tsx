import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Egypt — a gentle lotus sprite: a rounded bud body cradled in an open crown of upright petals. */
export const EGY: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* two floating lily pads (the feet / base, behind) */}
      <ellipse cx={78} cy={190} rx={20} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={122} cy={190} rx={20} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* lily-pad notches */}
      <path d="M78,181 L74,190 M122,181 L126,190" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />

      {/* outer side petals (broaden the bloom silhouette, behind body) */}
      <path d="M64,128 Q34,118 42,92 Q60,104 72,124 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M136,128 Q166,118 158,92 Q140,104 128,124 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* bud body — a rounded lotus base that tapers gently downward */}
      <path d="M58,128 Q60,184 100,184 Q140,184 142,128 Q142,108 100,108 Q58,108 58,128 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={100} cy={148} rx={28} ry={28} fill={palette.belly} />
      {/* soft petal seams on the body */}
      <path d="M84,116 Q82,150 92,178 M116,116 Q118,150 108,178" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.4} />

      {/* the open lotus crown — three tall pointed petals (the signature) */}
      <path d="M100,104 Q86,66 100,42 Q114,66 100,104 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M78,110 Q56,82 60,56 Q82,74 86,108 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M122,110 Q144,82 140,56 Q118,74 114,108 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* slender petal midribs */}
      <path d="M100,98 L100,56 M80,104 Q72,82 66,66 M120,104 Q128,82 134,66" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.4} />

      {/* a tiny dark stamen dot tucked at the crown's heart */}
      <circle cx={100} cy={104} r={3.2} fill={palette.color2} />

      {/* face nestled in the bloom's open center */}
      <Face mood={mood} cx={100} cy={130} w={30} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}
