import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Côte d'Ivoire — a gentle little elephant with broad ears and a softly curling trunk. */
export const CIV: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* feet */}
      <ellipse cx={80} cy={188} rx={13} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={120} cy={188} rx={13} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      {/* little tail (behind) */}
      <path d="M146,158 Q162,162 158,182 Q150,178 148,166 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* broad ears (behind the head) */}
      <path d="M70,96 Q38,82 40,116 Q44,144 74,132 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,96 Q162,82 160,116 Q156,144 126,132 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* inner ears */}
      <path d="M66,102 Q50,96 52,116 Q56,130 70,124 Z" fill={palette.belly} />
      <path d="M134,102 Q150,96 148,116 Q144,130 130,124 Z" fill={palette.belly} />
      {/* body */}
      <ellipse cx={100} cy={148} rx={46} ry={48} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={162} rx={28} ry={30} fill={palette.belly} />
      {/* head */}
      <ellipse cx={100} cy={104} rx={38} ry={36} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      {/* small tusks framing the trunk */}
      <path d="M90,134 Q84,146 90,152 Q94,144 94,136 Z" fill="#fff" stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M110,134 Q116,146 110,152 Q106,144 106,136 Z" fill="#fff" stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* the signature: a softly curling trunk in the strong team color */}
      <path
        d="M100,128 Q98,156 106,176 Q114,194 100,200 Q86,196 92,184 Q98,176 92,160 Q88,142 90,128 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* trunk tip highlight */}
      <ellipse cx={99} cy={192} rx={4} ry={3} fill={palette.belly} />
      {/* eyes only — the trunk reads as the snout, so no mouth */}
      <Face mood={mood} cx={100} cy={100} w={30} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}