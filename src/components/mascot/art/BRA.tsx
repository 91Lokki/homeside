import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Brazil — a round little toucan with an oversized, friendly beak. */
export const BRA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* tail (behind) */}
      <path d="M52,150 Q34,150 40,128 Q52,140 64,138 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={86} cy={190} rx={10} ry={7} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={110} cy={190} rx={10} ry={7} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />

      {/* body */}
      <ellipse cx={96} cy={132} rx={50} ry={56} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={92} cy={150} rx={30} ry={34} fill={palette.belly} />

      {/* folded wing */}
      <path d="M126,120 Q150,130 138,162 Q120,156 116,132 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* big toucan beak (the signature) */}
      <path
        d="M112,92 Q156,90 176,112 Q150,120 116,116 Q108,104 112,92 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M118,108 Q142,108 168,111" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.5} />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={92} cy={96} w={28} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
