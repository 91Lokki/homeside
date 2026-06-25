import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Algeria — a tiny fennec fox whose two enormous, gently rounded ears are the signature. */
export const ALG: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* bushy tail curling behind to the side */}
      <path
        d="M138,176 Q170,176 174,144 Q168,122 150,124 Q160,140 152,154 Q146,166 138,164 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M174,144 Q176,132 170,124 Q162,128 162,140 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* little paws */}
      <ellipse cx={88} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* compact rounded body */}
      <ellipse cx={100} cy={160} rx={36} ry={36} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={172} rx={20} ry={21} fill={palette.belly} />

      {/* the signature: two oversized fennec ears, broad and tall */}
      <path
        d="M76,96 Q44,72 40,40 Q66,52 80,80 Q82,90 76,96 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M124,96 Q156,72 160,40 Q134,52 120,80 Q118,90 124,96 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* soft inner ears */}
      <path d="M70,90 Q52,72 51,52 Q66,62 74,82 Z" fill={palette.belly} />
      <path d="M130,90 Q148,72 149,52 Q134,62 126,82 Z" fill={palette.belly} />

      {/* head — a gently pointed little fox face */}
      <path
        d="M70,108 Q70,82 100,82 Q130,82 130,108 Q130,128 116,138 Q108,150 100,150 Q92,150 84,138 Q70,128 70,108 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* pale cheeks / muzzle */}
      <path d="M84,118 Q100,112 116,118 Q112,138 100,146 Q88,138 84,118 Z" fill={palette.belly} />

      {/* tiny nose acting as the mouth tip */}
      <path d="M100,134 Q105,134 103,139 Q100,142 97,139 Q95,134 100,134 Z" fill={palette.outline} stroke={palette.outline} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M100,140 Q100,145 93,146" fill="none" stroke={palette.outline} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M100,140 Q100,145 107,146" fill="none" stroke={palette.outline} strokeWidth={2.2} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={108} w={26} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
