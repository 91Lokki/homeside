import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Türkiye — a calm crescent-moon sprite cradling a star, with a little tulip bud sprout. */
export const TUR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* little feet peeking from under the crescent */}
      <ellipse cx={86} cy={190} rx={11} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={116} cy={190} rx={11} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* tulip-bud sprout rising from the crown (secondary motif) */}
      <path d="M126,60 Q124,40 134,48 Q132,56 130,62 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw - 1} strokeLinejoin="round" />
      <path d="M130,60 Q138,42 142,54 Q136,60 132,64 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw - 1} strokeLinejoin="round" />
      <path d="M131,62 Q131,74 132,84" fill="none" stroke={palette.outline} strokeWidth={sw - 1} strokeLinecap="round" />

      {/* the crescent body — the unmistakable silhouette.
          A fat outer arc bites inward on the right to form the moon. */}
      <path
        d="M124,66
           Q72,62 60,114
           Q48,166 100,184
           Q138,186 150,158
           Q124,166 110,134
           Q100,108 118,86
           Q126,76 124,66 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* soft belly glow along the inner curve */}
      <path
        d="M104,96
           Q92,116 100,138
           Q108,158 130,160
           Q116,150 112,130
           Q108,110 116,96 Z"
        fill={palette.belly}
      />

      {/* the five-pointed star — the ONE signature feature, in the strong color */}
      <polygon
        points="99,118 105,134 122,134 108,145 113,162 99,151 85,162 90,145 76,134 93,134"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw - 1}
        strokeLinejoin="round"
      />

      {/* face nestled on the upper inner cheek of the crescent */}
      <Face mood={mood} cx={92} cy={98} w={28} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}
