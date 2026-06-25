import { Face } from '../faces'
import type { MascotArt } from '../types'

/** South Korea — a gentle crouching tiger: pointed ears, cheek ruff and bold red stripes. */
export const KOR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* curling tail (behind), tipped with a stripe */}
      <path
        d="M150,168 Q176,166 174,140 Q172,122 156,124 Q166,132 162,146 Q158,160 144,158 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path d="M168,150 Q174,148 173,140" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />

      {/* haunches / crouching body */}
      <ellipse cx={100} cy={158} rx={52} ry={40} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={172} rx={30} ry={22} fill={palette.belly} />

      {/* front paws */}
      <ellipse cx={78} cy={190} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={122} cy={190} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* body stripes (the signature, in the strong team color) */}
      <path d="M70,148 Q74,158 70,170" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />
      <path d="M130,148 Q126,158 130,170" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />

      {/* ears — pointed, the unmistakable feline silhouette */}
      <path d="M58,84 Q50,52 76,62 Q78,78 74,90 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M142,84 Q150,52 124,62 Q122,78 126,90 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M62,80 Q58,64 71,69 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw - 1} strokeLinejoin="round" />
      <path d="M138,80 Q142,64 129,69 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw - 1} strokeLinejoin="round" />

      {/* head — broad with soft cheek ruff tufts */}
      <path
        d="M100,52
           Q146,52 150,92
           Q154,108 142,118
           Q150,120 146,126
           Q136,126 132,120
           Q118,132 100,132
           Q82,132 68,120
           Q64,126 54,126
           Q50,120 58,118
           Q46,108 50,92
           Q54,52 100,52 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* forehead stripes — the bold team-color mark */}
      <path d="M100,55 Q100,68 100,76" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />
      <path d="M84,58 Q86,68 90,74" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />
      <path d="M116,58 Q114,68 110,74" fill="none" stroke={palette.color} strokeWidth={sw} strokeLinecap="round" />

      {/* muzzle (the mouth) with a small secondary-color nose */}
      <ellipse cx={100} cy={112} rx={22} ry={15} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <path d="M91,108 Q100,114 109,108 Q100,118 91,108 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw - 1} strokeLinejoin="round" />
      <path d="M100,114 Q100,120 92,121" fill="none" stroke={palette.outline} strokeWidth={sw - 1} strokeLinecap="round" />
      <path d="M100,114 Q100,120 108,121" fill="none" stroke={palette.outline} strokeWidth={sw - 1} strokeLinecap="round" />

      {/* whisker hints */}
      <path d="M80,110 Q70,109 62,112" fill="none" stroke={palette.outline} strokeWidth={sw - 1.4} strokeLinecap="round" />
      <path d="M120,110 Q130,109 138,112" fill="none" stroke={palette.outline} strokeWidth={sw - 1.4} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={92} w={36} eyeR={8} ink={palette.ink} showMouth={false} />
    </g>
  )
}
