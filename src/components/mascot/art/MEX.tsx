import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Mexico — a perched golden eagle: crested head, broad spread wings, hooked beak. */
export const MEX: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* fanned tail (behind, lower) */}
      <path d="M84,178 Q78,202 100,200 Q122,202 116,178 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* broad spread wings (the silhouette) */}
      <path d="M70,120 Q30,118 32,158 Q56,156 74,144 Q70,132 70,120 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,120 Q170,118 168,158 Q144,156 126,144 Q130,132 130,120 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* wing feather hints */}
      <path d="M46,134 Q58,138 70,138" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />
      <path d="M154,134 Q142,138 130,138" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />

      {/* talons */}
      <path d="M86,188 Q82,200 76,198 M86,188 Q86,201 90,200 M86,188 Q92,199 96,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M114,188 Q110,199 104,196 M114,188 Q114,201 110,200 M114,188 Q118,200 124,198" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* body */}
      <ellipse cx={100} cy={148} rx={40} ry={42} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={160} rx={23} ry={26} fill={palette.belly} />

      {/* head */}
      <circle cx={100} cy={98} r={34} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* raised crest of head feathers (the signature) */}
      <path
        d="M72,80 Q66,52 84,52 Q88,64 96,66 Q98,46 110,50 Q110,64 118,66 Q132,54 134,76 Q116,66 100,68 Q84,68 72,80 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* hooked eagle beak — the body's own mouth */}
      <path d="M92,108 Q108,108 112,116 Q110,126 100,127 Q98,134 90,130 Q86,118 92,108 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={100} cy={94} w={30} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
