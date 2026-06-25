import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Bosnia and Herzegovina — a golden-lily sprite: a six-pointed Lilium bosniacum bloom for a head over a slim stem-body. */
export const BIH: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* leaf fronds (behind the stem) */}
      <path d="M70,158 Q40,150 44,118 Q66,128 74,158 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,158 Q160,150 156,118 Q134,128 126,158 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={88} cy={192} rx={9.5} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={9.5} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* slim stem-body */}
      <path d="M82,180 Q80,142 86,116 Q100,108 114,116 Q120,142 118,180 Q100,188 82,180 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={100} cy={158} rx={16} ry={22} fill={palette.belly} />

      {/* sepals peeking between the petals (secondary, sparing) */}
      <path d="M68,98 Q58,72 78,60 Q86,82 80,100 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M132,98 Q142,72 122,60 Q114,82 120,100 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* the lily bloom — six pointed, recurved petals (the signature) */}
      <g>
        {/* lower side petals */}
        <path d="M100,108 Q62,112 50,86 Q72,72 100,90 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M100,108 Q138,112 150,86 Q128,72 100,90 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        {/* upper side petals, gently recurved to points */}
        <path d="M100,98 Q70,84 66,50 Q90,52 100,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M100,98 Q130,84 134,50 Q110,52 100,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        {/* tall central petal — the crowning point */}
        <path d="M88,92 Q86,48 100,40 Q114,48 112,92 Q100,98 88,92 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
        {/* faint center ribs hinting at the bloom's throat */}
        <path d="M100,46 Q102,72 100,94" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.45} />
        <path d="M78,58 Q88,76 96,90" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.35} />
        <path d="M122,58 Q112,76 104,90" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.35} />
      </g>

      {/* face nestled in the bloom's throat */}
      <Face mood={mood} cx={100} cy={120} w={30} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}
