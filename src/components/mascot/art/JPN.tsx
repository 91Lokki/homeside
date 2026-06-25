import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Japan — a serene red-crowned crane: long curving neck, small head with a pointed bill, and the signature red crown cap. */
export const JPN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* slender legs */}
      <path d="M90,168 L86,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M110,168 L114,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      {/* dark feet */}
      <path d="M86,196 L78,198 M86,196 L92,198" fill="none" stroke={palette.outline} strokeWidth={sw - 0.6} strokeLinecap="round" />
      <path d="M114,196 L108,198 M114,196 L120,198" fill="none" stroke={palette.outline} strokeWidth={sw - 0.6} strokeLinecap="round" />

      {/* drooping tertial plume — the elegant bustle tail (secondary white, dark tip) */}
      <path
        d="M118,142 Q156,140 160,170 Q150,178 138,170 Q130,160 116,158 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M150,168 Q156,170 159,170" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* rounded body */}
      <ellipse cx={100} cy={150} rx={42} ry={36} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={96} cy={158} rx={24} ry={24} fill={palette.belly} />

      {/* folded wing accent */}
      <path d="M76,138 Q60,150 70,170 Q84,166 86,146 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* long graceful neck rising from the body to the head */}
      <path
        d="M92,124 Q80,96 82,76 Q84,58 100,54 Q112,58 108,74 Q100,92 110,120 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* small head */}
      <circle cx={100} cy={56} r={20} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* pointed bill (this is the mouth) */}
      <path d="M118,54 Q138,52 144,56 Q138,62 118,60 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* the signature: bare red crown cap */}
      <path d="M86,46 Q100,30 114,46 Q100,52 86,46 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* eyes only — the bill is the mouth */}
      <Face mood={mood} cx={97} cy={58} w={20} eyeR={6.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
