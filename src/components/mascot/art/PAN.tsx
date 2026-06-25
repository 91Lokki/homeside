import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Panama — a perched harpy eagle: a wide grey head crowned by its signature double feather crest, with a soft hooked beak and sturdy talons. */
export const PAN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* the harpy's signature double crest — two raised feather tufts in the strong team color */}
      <path
        d="M86,66 Q70,30 84,40 Q92,48 96,62 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M114,66 Q130,30 116,40 Q108,48 104,62 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* folded wings tucked at the sides (behind the body) */}
      <path
        d="M64,140 Q40,144 50,182 Q62,176 70,160 Q66,150 70,142 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M136,140 Q160,144 150,182 Q138,176 130,160 Q134,150 130,142 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* talons */}
      <ellipse cx={86} cy={192} rx={11} ry={7.5} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={192} rx={11} ry={7.5} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />

      {/* upright body */}
      <path
        d="M62,150 Q60,108 100,104 Q140,108 138,150 Q138,188 100,190 Q62,188 62,150 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* pale chest (the harpy's barred breast) */}
      <ellipse cx={100} cy={158} rx={28} ry={30} fill={palette.belly} />

      {/* broad grey facial disc / head — wider than tall, the harpy's distinctive owl-like face */}
      <path
        d="M64,86 Q62,58 100,56 Q138,58 136,86 Q134,108 100,110 Q66,108 64,86 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* soft hooked beak in the strong team color (this is the mouth) */}
      <path
        d="M93,92 Q100,90 107,92 Q107,104 101,112 Q96,108 95,101 Q94,96 93,92 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={100} cy={80} w={30} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
