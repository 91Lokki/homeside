import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Morocco — a gentle Atlas lion cub framed by a soft, rounded mane in the team color. */
export const MAR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* tufted tail (behind, curling up to the side) */}
      <path
        d="M142,168 Q166,166 168,140 Q160,144 156,156 Q150,160 142,158 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M168,140 Q178,128 174,116 Q166,122 164,134 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* feet */}
      <ellipse cx={86} cy={192} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={192} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* rounded body */}
      <ellipse cx={100} cy={158} rx={40} ry={40} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={170} rx={23} ry={24} fill={palette.belly} />

      {/* small rounded ears peeking through the mane */}
      <circle cx={72} cy={70} r={12} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={128} cy={70} r={12} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={72} cy={70} r={5.5} fill={palette.belly} />
      <circle cx={128} cy={70} r={5.5} fill={palette.belly} />

      {/* the mane — the signature feature: a soft halo of rounded lobes */}
      <path
        d="M100,42
           Q116,40 122,52 Q138,46 144,62 Q160,62 158,80
           Q172,90 160,104 Q170,120 154,126 Q156,144 138,142
           Q132,156 116,150 Q108,160 100,160 Q92,160 84,150
           Q68,156 62,142 Q46,144 46,126 Q30,120 40,104
           Q28,90 42,80 Q40,62 56,62 Q62,46 78,52 Q84,40 100,42 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* calm face disc framed inside the mane */}
      <ellipse cx={100} cy={100} rx={36} ry={34} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />

      {/* soft muzzle with the nose acting as the mouth */}
      <ellipse cx={100} cy={114} rx={15} ry={11} fill={palette.body} />
      <path
        d="M100,108 Q108,110 105,116 Q100,120 95,116 Q92,110 100,108 Z"
        fill={palette.outline}
        stroke={palette.outline}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M100,118 Q100,124 92,125" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M100,118 Q100,124 108,125" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={96} w={28} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
