import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Senegal — the Lion of Teranga: a calm seated cub crowned by a bold, flame-petalled mane. */
export const SEN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* tufted tail arcing up behind the body */}
      <path
        d="M138,176 Q166,172 164,138 Q156,118 144,124 Q154,132 152,150 Q150,166 132,166 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* tail tuft in the strong team color */}
      <path
        d="M144,124 Q150,104 138,98 Q132,108 134,120 Q138,126 144,124 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* hind feet */}
      <ellipse cx={82} cy={190} rx={12} ry={8} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={118} cy={190} rx={12} ry={8} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* seated body */}
      <ellipse cx={100} cy={160} rx={38} ry={38} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={172} rx={21} ry={22} fill={palette.belly} />

      {/* raised front paw — a friendly little wave */}
      <path
        d="M70,150 Q56,140 58,124 Q64,118 72,124 Q70,136 80,148 Q76,154 70,150 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* resting front paw */}
      <ellipse cx={120} cy={178} rx={11} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* upright tufted ears peeking through the mane */}
      <path d="M74,60 Q66,42 82,46 Q88,58 86,70 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M126,60 Q134,42 118,46 Q112,58 114,70 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M77,60 Q74,52 81,53 Q84,60 83,66 Z" fill={palette.color2} />
      <path d="M123,60 Q126,52 119,53 Q116,60 117,66 Z" fill={palette.color2} />

      {/* the signature: a bold flame-petalled mane in the strong team color */}
      <path
        d="M100,46
           Q108,36 116,48 Q132,40 134,58 Q152,52 150,72
           Q168,74 158,92 Q172,104 154,112 Q166,128 146,130
           Q150,148 130,142 Q124,154 110,148 Q100,156 90,148
           Q76,154 70,142 Q50,148 54,130 Q34,128 46,112
           Q28,104 42,92 Q32,74 50,72 Q48,52 66,58 Q68,40 84,48 Q92,36 100,46 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* face disc framed inside the mane */}
      <ellipse cx={100} cy={98} rx={34} ry={33} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />

      {/* soft muzzle with a small nose acting as the mouth */}
      <ellipse cx={100} cy={112} rx={14} ry={10} fill={palette.body} />
      <path
        d="M100,106 Q107,108 104,114 Q100,117 96,114 Q93,108 100,106 Z"
        fill={palette.outline}
        stroke={palette.outline}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M100,116 Q100,121 93,122" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M100,116 Q100,121 107,122" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={94} w={27} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
