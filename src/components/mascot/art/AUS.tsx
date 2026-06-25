import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Australia — an upright little kangaroo: tall ears, thick curling tail and a big springy hind foot. */
export const AUS: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* thick tail, curling forward to brace on the ground (behind body) */}
      <path
        d="M104,150 Q150,158 160,188 Q161,200 150,200 Q146,184 124,180 Q104,176 96,160 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* big springy hind foot */}
      <path
        d="M70,184 Q56,184 50,192 Q49,199 58,199 L96,199 Q100,192 94,186 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* rounded haunch / thigh */}
      <ellipse cx={92} cy={166} rx={34} ry={26} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* upright body, tapering up to a slim neck */}
      <path
        d="M76,168 Q66,118 84,92 Q96,78 112,86 Q126,96 122,126 Q120,156 110,170 Q92,182 76,168 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* soft belly */}
      <path
        d="M86,108 Q98,100 108,110 Q112,140 104,162 Q92,170 84,158 Q80,132 86,108 Z"
        fill={palette.belly}
      />

      {/* little tucked forepaws */}
      <ellipse cx={98} cy={126} rx={9} ry={6.5} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* head */}
      <ellipse cx={100} cy={74} rx={26} ry={24} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* gentle muzzle */}
      <path
        d="M118,76 Q132,76 134,84 Q132,92 120,90 Q112,84 118,76 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* the signature: two tall upright kangaroo ears in the strong team color */}
      <path
        d="M84,58 Q74,24 84,18 Q94,22 92,52 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M112,56 Q120,22 130,20 Q137,30 122,58 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* inner ear hint (secondary, used sparingly) */}
      <path d="M85,52 Q80,32 86,26 Q90,32 89,50 Z" fill={palette.color2} />
      <path d="M115,52 Q120,32 126,28 Q126,36 120,53 Z" fill={palette.color2} />

      {/* face — muzzle is the mouth, so eyes only */}
      <Face mood={mood} cx={98} cy={70} w={22} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
