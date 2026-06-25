import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Jordan — a serene Arabian oryx: pale rounded body crowned by a pair of long, near-straight, gently back-swept horns (the signature), with a slender muzzle and soft facial markings. */
export const JOR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* the signature: two long, slender, almost-straight horns sweeping up and back */}
      <path d="M88,72 Q78,40 70,16 Q66,12 64,16 Q70,42 82,74 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M112,72 Q122,40 130,16 Q134,12 136,16 Q130,42 118,74 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* faint ridges that ring the oryx horn */}
      <path d="M73,32 L79,30" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M76,44 L83,42" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M80,56 L87,54" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M127,32 L121,30" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M124,44 L117,42" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />
      <path d="M120,56 L113,54" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />

      {/* slim legs */}
      <ellipse cx={86} cy={190} rx={9} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={190} rx={9} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* tufted tail tucked behind */}
      <path d="M146,150 Q160,156 158,176 Q150,170 148,158 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* pale, gently rounded body */}
      <ellipse cx={100} cy={146} rx={46} ry={44} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={160} rx={26} ry={26} fill={palette.belly} />

      {/* upright neck rising to the head — gives the oryx its poised stance */}
      <path d="M84,118 Q82,98 92,88 Q108,88 116,98 Q118,116 110,124 Q100,128 90,124 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* head with a tapering oryx muzzle — narrow snout, not a round blob */}
      <path d="M76,86 Q74,62 100,60 Q126,62 124,86 Q124,98 116,104 Q110,116 100,116 Q90,116 84,104 Q76,98 76,86 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* soft oryx face mask — a gentle blaze down the muzzle */}
      <path d="M100,72 Q108,86 104,108 Q100,112 96,108 Q92,86 100,72 Z" fill={palette.belly} />

      {/* little upright ears just below the horns */}
      <path d="M74,80 Q60,78 58,88 Q68,90 76,86 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M126,80 Q140,78 142,88 Q132,90 124,86 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* dark muzzle tip — the body has its own nose/mouth */}
      <ellipse cx={100} cy={106} rx={6} ry={4.4} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={86} w={24} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
