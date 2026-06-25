import { Face } from '../faces'
import type { MascotArt } from '../types'

/** United States — a calm bald eagle: bright white head, gently spread wings, a soft hooked beak. */
export const USA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* spread wings (behind the body) — broad, gently lifted */}
      <path
        d="M68,128 Q26,108 30,150 Q36,150 44,148 Q34,162 42,176 Q56,166 62,150 Q66,140 72,138 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M132,128 Q174,108 170,150 Q164,150 156,148 Q166,162 158,176 Q144,166 138,150 Q134,140 128,138 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* talons */}
      <ellipse cx={88} cy={192} rx={10} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={10} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />

      {/* dark body */}
      <ellipse cx={100} cy={150} rx={44} ry={48} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={166} rx={26} ry={28} fill={palette.belly} opacity={0.6} />

      {/* the bald eagle's bright white head (the signature silhouette) */}
      <path
        d="M62,98 Q60,58 100,54 Q140,58 138,98 Q120,110 100,110 Q80,110 62,98 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* soft hooked beak in the strong team color (this is the mouth) */}
      <path
        d="M92,98 Q100,96 108,98 Q108,110 102,116 Q96,113 96,107 Q94,103 92,98 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={100} cy={84} w={30} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
