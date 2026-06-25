import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Sweden — a calm little moose: long gentle muzzle, droopy ears, and broad palmate antlers as the signature crown. */
export const SWE: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* slim legs */}
      <rect x={80} y={172} width={11} height={22} rx={5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={109} y={172} width={11} height={22} rx={5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* little hooves */}
      <ellipse cx={85} cy={194} rx={8} ry={5} fill={palette.outline} />
      <ellipse cx={114} cy={194} rx={8} ry={5} fill={palette.outline} />

      {/* broad palmate antlers (the signature — strong team color), behind the head */}
      <path
        d="M78,86
           Q56,82 44,66
           Q56,70 60,62
           Q50,58 44,46
           Q60,54 66,46
           Q62,36 70,30
           Q74,46 84,54
           Q82,68 84,82 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M122,86
           Q144,82 156,66
           Q144,70 140,62
           Q150,58 156,46
           Q140,54 134,46
           Q138,36 130,30
           Q126,46 116,54
           Q118,68 116,82 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* upright body */}
      <ellipse cx={100} cy={148} rx={42} ry={44} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={158} rx={25} ry={28} fill={palette.belly} />

      {/* droopy ears tucked under the antlers */}
      <path d="M70,96 Q50,98 50,116 Q66,114 76,104 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,96 Q150,98 150,116 Q134,114 124,104 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* head */}
      <ellipse cx={100} cy={108} rx={32} ry={28} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* long gentle moose muzzle (the silhouette tell) */}
      <path
        d="M82,116
           Q82,142 100,150
           Q118,142 118,116
           Q110,124 100,124
           Q90,124 82,116 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* soft nostrils on the snout (its own mouth, so Face hides its mouth) */}
      <ellipse cx={94} cy={134} rx={2.6} ry={3.4} fill={palette.outline} />
      <ellipse cx={106} cy={134} rx={2.6} ry={3.4} fill={palette.outline} />

      {/* tiny dewlap accent (secondary color, used sparingly) */}
      <path d="M96,150 Q100,162 104,150 Q100,156 96,150 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={106} w={26} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
