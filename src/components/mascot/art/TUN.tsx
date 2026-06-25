import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Tunisia — a small, proud Eagle of Carthage: broad spread wings + a gentle hooked beak. */
export const TUN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* spread wings (the signature) — broad, calm sweeps in the strong team color */}
      <path
        d="M86,128 Q44,108 30,128 Q44,134 40,150 Q56,146 60,158 Q74,150 88,156 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M114,128 Q156,108 170,128 Q156,134 160,150 Q144,146 140,158 Q126,150 112,156 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* tail feathers (behind, below the body) */}
      <path
        d="M88,176 Q92,200 100,200 Q108,200 112,176 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* feet */}
      <ellipse cx={88} cy={190} rx={9} ry={6.5} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={190} rx={9} ry={6.5} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />

      {/* upright body */}
      <path
        d="M100,116 Q138,118 136,152 Q134,184 100,186 Q66,184 64,152 Q62,118 100,116 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <ellipse cx={100} cy={158} rx={22} ry={24} fill={palette.belly} />

      {/* rounded eagle head */}
      <circle cx={100} cy={86} r={32} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* feathered crest — three soft tufts in the team color */}
      <path
        d="M100,56 Q92,38 82,54 Q90,58 92,68 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M100,52 Q100,32 100,52 Q104,40 108,50 Q104,56 100,58 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M100,56 Q108,38 118,54 Q110,58 108,68 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* gentle hooked beak — this is the mouth */}
      <path
        d="M100,90 Q116,90 118,100 Q116,108 106,108 Q100,104 100,90 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={94} cy={84} w={26} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
