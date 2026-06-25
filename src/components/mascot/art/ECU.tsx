import { Face } from '../faces'
import type { MascotArt } from '../types'
import { rgba } from '@/lib/prng'

/** Ecuador — a calm Andean condor: broad lifted wings, a soft white ruff, a hooked beak. */
export const ECU: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* feet gripping the perch */}
      <ellipse cx={88} cy={192} rx={11} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={112} cy={192} rx={11} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* broad wings lifted behind the body — the condor silhouette */}
      <path
        d="M70,128 Q30,118 34,70 Q56,96 78,108 Q72,120 70,128 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M130,128 Q170,118 166,70 Q144,96 122,108 Q128,120 130,128 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* wing flight-feather hints */}
      <path d="M44,76 Q56,98 74,110" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      <path d="M156,76 Q144,98 126,110" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.55} />

      {/* upright body */}
      <path
        d="M68,150 Q66,108 100,104 Q134,108 132,150 Q132,184 100,186 Q68,184 68,150 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <ellipse cx={100} cy={156} rx={22} ry={26} fill={palette.belly} />

      {/* soft white feathered ruff at the base of the neck (the condor's signature collar) */}
      <path
        d="M72,116 Q86,128 100,128 Q114,128 128,116 Q120,100 100,100 Q80,100 72,116 Z"
        fill="#fff"
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M84,118 Q88,124 92,118 M96,121 Q100,127 104,121 M108,118 Q112,124 116,118" fill="none" stroke={palette.outline} strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />

      {/* bare head */}
      <ellipse cx={100} cy={80} rx={24} ry={23} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      {/* small head crest / caruncle */}
      <path
        d="M100,57 Q92,46 100,42 Q108,46 100,57 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* hooked beak — the strong-color signature feature; it serves as the mouth */}
      <path
        d="M100,82 Q124,80 130,90 Q126,98 116,98 Q120,90 100,92 Q97,87 100,82 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* warm cheek wattle accent */}
      <ellipse cx={84} cy={92} rx={5} ry={4} fill={rgba(palette.color, 0.5)} />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={96} cy={76} w={24} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
