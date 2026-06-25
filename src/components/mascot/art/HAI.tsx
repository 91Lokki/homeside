import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Haiti — a perched Hispaniolan trogon: upright body, long squared tail, bright breast. */
export const HAI: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* long squared trogon tail (the signature silhouette, hangs straight down behind) */}
      <path
        d="M88,150 L84,196 Q84,202 90,202 L110,202 Q116,202 116,196 L112,150 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* soft tail banding */}
      <line x1={92} y1={176} x2={108} y2={176} stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />
      <line x1={91} y1={190} x2={109} y2={190} stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />

      {/* little perch feet */}
      <ellipse cx={88} cy={166} rx={8} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={166} rx={8} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* rounded upright body */}
      <path
        d="M62,118 Q62,80 100,78 Q138,80 138,118 Q138,160 100,162 Q62,160 62,118 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* bright trogon breast (signature accent, lower belly) */}
      <path
        d="M76,128 Q76,108 100,106 Q124,108 124,128 Q124,156 100,160 Q76,156 76,128 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* folded wing with a few coverts */}
      <path
        d="M128,104 Q150,114 142,146 Q126,142 122,116 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <line x1={129} y1={116} x2={138} y2={124} stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />
      <line x1={127} y1={128} x2={137} y2={136} stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />

      {/* short rounded head crown */}
      <path
        d="M74,86 Q72,58 100,56 Q128,58 126,86 Q100,94 74,86 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* short stout trogon bill (its own mouth) */}
      <path
        d="M100,92 Q90,94 90,100 Q90,106 100,106 Q110,106 110,100 Q110,94 100,92 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the bill is the mouth */}
      <Face mood={mood} cx={100} cy={78} w={26} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
