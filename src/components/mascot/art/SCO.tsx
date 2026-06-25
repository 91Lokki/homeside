import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Scotland — a gentle thistle sprite: a spiky bloom crowns a round calyx body. */
export const SCO: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* little feet (behind the stem) */}
      <ellipse cx={88} cy={192} rx={9} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={9} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* slim stem to the ground */}
      <path d="M96,172 L95,187 Q100,191 105,187 L104,172 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* jagged thistle leaves (behind body) */}
      <path d="M70,156 Q44,150 40,166 Q52,166 50,176 Q60,170 66,176 Q66,164 78,162 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,156 Q156,150 160,166 Q148,166 150,176 Q140,170 134,176 Q134,164 122,162 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* calyx body — the bulbous spiny seed-cup the face rests in */}
      <path
        d="M100,170
           Q60,170 60,128
           Q60,98 100,98
           Q140,98 140,128
           Q140,170 100,170 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* soft inner belly */}
      <ellipse cx={100} cy={142} rx={28} ry={24} fill={palette.belly} />
      {/* gentle cross-hatch hint of the calyx weave */}
      <path d="M74,124 Q100,140 126,124" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.3} />
      <path d="M76,138 Q100,154 124,138" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.3} />

      {/* the spiky thistle bloom — the signature crown (strong team color) */}
      <path
        d="M64,104
           L60,80 L70,92
           L72,66 L82,86
           L88,58 L95,82
           L100,52 L105,82
           L112,58 L118,86
           L128,66 L130,92
           L140,80 L136,104
           Q120,90 100,90
           Q80,90 64,104 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* base of the bloom tucking into the calyx */}
      <path d="M68,100 Q100,86 132,100 Q116,108 100,108 Q84,108 68,100 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* face nestled in the calyx (its own bloom sits above, so a soft mouth is fine) */}
      <Face mood={mood} cx={100} cy={134} w={30} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}
