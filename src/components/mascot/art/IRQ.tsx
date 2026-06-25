import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Iraq — a gentle date-palm sprite: a ringed trunk torso under a crown of arching fronds, with a heavy cluster of ripe dates. */
export const IRQ: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* arching palm fronds — the signature crown, fanning out behind the head */}
      {/* far-left frond */}
      <path d="M96,70 Q52,58 30,76 Q56,72 70,84 Q54,80 44,92 Q66,82 84,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* far-right frond */}
      <path d="M104,70 Q148,58 170,76 Q144,72 130,84 Q146,80 156,92 Q134,82 116,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* upper-left frond */}
      <path d="M98,64 Q70,40 52,42 Q72,48 80,62 Q66,56 58,64 Q78,58 92,72 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* upper-right frond */}
      <path d="M102,64 Q130,40 148,42 Q128,48 120,62 Q134,56 142,64 Q122,58 108,72 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* tall center frond */}
      <path d="M100,62 Q96,34 100,26 Q104,34 100,62 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet at the base of the trunk */}
      <ellipse cx={88} cy={192} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* slender ringed palm trunk — the distinct silhouette, narrow and tall */}
      <path
        d="M86,96
           Q80,140 84,176 Q86,188 100,188 Q114,188 116,176
           Q120,140 114,96
           Q108,90 100,90 Q92,90 86,96 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M92,128 Q100,148 108,128" fill={palette.belly} />

      {/* trunk rings — the diamond bark texture of a date palm */}
      <path d="M85,118 Q100,124 115,118" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M84,138 Q100,144 116,138" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M84,158 Q100,164 116,158" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* hanging cluster of ripe dates — the warm secondary accent, sparing */}
      <path d="M118,104 Q132,108 134,124 Q130,118 122,116 Q126,124 122,130 Q118,118 114,112 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={124} cy={116} rx={3.4} ry={4.4} fill={palette.color2} />
      <ellipse cx={130} cy={122} rx={3.4} ry={4.4} fill={palette.color2} />
      <ellipse cx={122} cy={126} rx={3.4} ry={4.4} fill={palette.color2} />

      {/* round friendly head nestled where the fronds meet the trunk */}
      <ellipse cx={100} cy={84} rx={30} ry={28} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={92} rx={17} ry={14} fill={palette.belly} />

      {/* a little tuft where the crown sprouts from the head */}
      <path d="M94,58 Q100,50 106,58 Q100,62 94,58 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* full face — the head has its own mouth */}
      <Face mood={mood} cx={100} cy={82} w={24} eyeR={7} ink={palette.ink} />
    </g>
  )
}