import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Curaçao — a serene little flamingo: a tall S-curved neck, slender legs, and a soft down-bent bill. */
export const CUW: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* slender flamingo legs (signature strong color), tucked close, one bent at the knee */}
      <path
        d="M92,150 L88,176 L80,194"
        fill="none"
        stroke={palette.color}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M108,150 L112,178 L122,194"
        fill="none"
        stroke={palette.color}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* webbed feet */}
      <ellipse cx={78} cy={196} rx={9} ry={5} fill={palette.color} stroke={palette.outline} strokeWidth={2.6} />
      <ellipse cx={124} cy={196} rx={9} ry={5} fill={palette.color} stroke={palette.outline} strokeWidth={2.6} />

      {/* short fanned tail behind */}
      <path
        d="M70,140 Q50,142 56,124 Q66,134 78,130 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* plump rounded body */}
      <ellipse cx={100} cy={132} rx={42} ry={34} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={98} cy={142} rx={24} ry={20} fill={palette.belly} />

      {/* folded wing with a couple of soft feather lines */}
      <path
        d="M120,116 Q146,124 138,154 Q118,150 112,126 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <line x1={122} y1={128} x2={132} y2={138} stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />
      <line x1={120} y1={140} x2={130} y2={148} stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />

      {/* the signature: a tall S-curved flamingo neck rising and bending over (strong color) */}
      <path
        d="M86,120 Q70,96 84,76 Q98,58 116,62 Q132,66 130,82 Q128,94 116,92"
        fill="none"
        stroke={palette.color}
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* small rounded head at the top of the curve */}
      <circle cx={118} cy={84} r={17} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* down-bent flamingo bill (its own mouth) — pale base, dark hooked tip */}
      <path
        d="M133,82 Q150,84 150,96 Q150,106 140,106 Q136,98 132,92 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M150,96 Q150,106 140,106 Q142,100 146,97 Z"
        fill={palette.outline}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the bill is the mouth */}
      <Face mood={mood} cx={115} cy={80} w={18} eyeR={6.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
