import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Norway — a calm elk in side-profile stride: long level back, deep chest, a hanging bell, and tall branching antlers as the signature crown. */
export const NOR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* far legs (behind, slightly muted by overlap) */}
      <rect x={72} y={156} width={10} height={36} rx={5} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={118} y={156} width={10} height={36} rx={5} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={77} cy={194} rx={7} ry={4.6} fill={palette.outline} />
      <ellipse cx={123} cy={194} rx={7} ry={4.6} fill={palette.outline} />

      {/* tall branching antlers (the signature — strong team color), rising behind the head */}
      <path
        d="M62,98
           Q56,80 60,66
           Q52,70 46,62
           Q56,62 60,56
           Q50,56 46,48
           Q58,52 64,48
           Q62,42 70,42
           Q72,52 80,56
           Q78,70 76,90 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M92,98
           Q96,80 96,64
           Q104,70 110,60
           Q102,60 100,52
           Q110,56 116,48
           Q108,46 108,42
           Q118,48 124,44
           Q124,54 132,54
           Q124,66 110,74
           Q104,84 102,94 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* deep body — long level back, rounded haunch, deep chest (the side-profile silhouette) */}
      <path
        d="M70,148
           Q62,128 78,118
           Q96,110 122,114
           Q142,116 146,134
           Q150,158 134,170
           Q108,178 86,172
           Q70,166 70,148 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* soft belly */}
      <ellipse cx={106} cy={156} rx={26} ry={15} fill={palette.belly} />

      {/* near legs (front of body) */}
      <rect x={84} y={160} width={11} height={34} rx={5.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={128} y={160} width={11} height={34} rx={5.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={89.5} cy={194} rx={8} ry={5} fill={palette.outline} />
      <ellipse cx={133.5} cy={194} rx={8} ry={5} fill={palette.outline} />

      {/* upright neck and head */}
      <path d="M70,142 Q60,118 70,100 Q86,92 96,104 Q98,124 88,140 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      <ellipse cx={78} cy={102} rx={26} ry={24} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* a tucked, droopy ear */}
      <path d="M58,92 Q42,90 40,104 Q54,106 64,98 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* long elk muzzle dropping forward (its own mouth, so Face hides its mouth) */}
      <path
        d="M58,104
           Q40,108 36,124
           Q38,138 54,138
           Q66,134 68,118
           Q64,108 58,104 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* soft nostril on the snout */}
      <ellipse cx={42} cy={123} rx={2.8} ry={3.6} fill={palette.outline} />

      {/* the pendulous bell / dewlap (secondary color, used sparingly) */}
      <path d="M70,128 Q66,150 74,158 Q82,150 80,130 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={80} cy={98} w={22} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
