import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Czechia — a calm linden-leaf sprite: a heart-shaped leaf body, a tall curving stem, and a bright central vein. */
export const CZE: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* stem / petiole rising from the leaf notch (behind), with a tiny linden bract */}
      <path d="M100,86 Q92,58 104,44" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M104,44 Q120,42 124,54 Q110,60 104,52 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={86} cy={190} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={190} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* heart-shaped LINDEN LEAF body — two rounded top lobes, a soft notch, tapering to a gentle point */}
      <path
        d="M100,90
           Q88,80 66,84
           Q40,90 38,118
           Q36,150 64,172
           Q88,190 100,184
           Q112,190 136,172
           Q164,150 162,118
           Q160,90 134,84
           Q112,80 100,90 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* inner leaf blade (lighter) */}
      <path
        d="M100,104
           Q90,98 74,102
           Q56,108 56,128
           Q56,152 78,168
           Q92,178 100,174
           Q108,178 122,168
           Q144,152 144,128
           Q144,108 126,102
           Q110,98 100,104 Z"
        fill={palette.belly}
      />

      {/* central vein (the signature — strong team color), running from notch to leaf tip */}
      <path d="M100,92 Q100,140 100,180" fill="none" stroke={palette.color} strokeWidth={5.2} strokeLinecap="round" />
      {/* a few soft side veins */}
      <path d="M100,118 Q82,120 70,114" fill="none" stroke={palette.color} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M100,118 Q118,120 130,114" fill="none" stroke={palette.color} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M100,144 Q84,148 74,144" fill="none" stroke={palette.color} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />
      <path d="M100,144 Q116,148 126,144" fill="none" stroke={palette.color} strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />

      {/* face nestled in the upper blade */}
      <Face mood={mood} cx={100} cy={122} w={30} ink={palette.ink} />
    </g>
  )
}
