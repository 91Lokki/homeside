import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Ghana — the Black Star: a calm five-pointed star sprite with soft rounded rays and little waving arms. */
export const GHA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* little legs peeking from beneath the lower rays */}
      <ellipse cx={86} cy={192} rx={9} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={192} rx={9} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* the signature: one soft five-pointed Black Star with gently rounded points */}
      <path
        d="M100,42
           Q108,68 112,78 Q124,80 158,84
           Q138,104 128,114 Q132,134 140,176
           Q116,156 100,150 Q84,156 60,176
           Q68,134 72,114 Q62,104 42,84
           Q76,80 88,78 Q92,68 100,42 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* soft inner glow disc — the friendly face cushion in the star's heart */}
      <ellipse cx={100} cy={104} rx={32} ry={31} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={110} rx={18} ry={16} fill={palette.body} />

      {/* tiny secondary-color sparkles tucked beside the upper rays */}
      <circle cx={62} cy={86} r={3.4} fill={palette.color2} stroke={palette.outline} strokeWidth={1.6} />
      <circle cx={138} cy={86} r={3.4} fill={palette.color2} stroke={palette.outline} strokeWidth={1.6} />

      {/* little waving arms reaching out along the side rays */}
      <path
        d="M70,116 Q52,118 44,108 Q50,104 58,108 Q62,110 70,110 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M130,116 Q148,118 156,108 Q150,104 142,108 Q138,110 130,110 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* one calm face in the star's heart */}
      <Face mood={mood} cx={100} cy={100} w={26} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}
