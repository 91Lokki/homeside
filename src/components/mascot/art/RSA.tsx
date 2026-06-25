import { Face } from '../faces'
import type { MascotArt } from '../types'

/** South Africa — a calm springbok whose crown is an open protea bloom. */
export const RSA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* springbok lyre horns (behind the head) */}
      <path d="M82,86 Q66,66 70,46 Q60,60 64,84 Q72,94 82,86 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M118,86 Q134,66 130,46 Q140,60 136,84 Q128,94 118,86 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* tall slim springbok ears */}
      <path d="M70,98 Q50,96 44,112 Q60,120 76,110 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M130,98 Q150,96 156,112 Q140,120 124,110 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* feet */}
      <ellipse cx={88} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={192} rx={10} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* rounded body */}
      <ellipse cx={100} cy={150} rx={42} ry={44} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={164} rx={25} ry={26} fill={palette.belly} />
      {/* springbok flank stripe */}
      <path d="M62,150 Q100,160 138,150" fill="none" stroke={palette.color2} strokeWidth={sw} strokeLinecap="round" />

      {/* head with a gentle springbok muzzle */}
      <path d="M70,104 Q70,128 84,140 Q100,150 116,140 Q130,128 130,104 Q100,94 70,104 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={100} cy={134} rx={11} ry={9} fill={palette.belly} />
      <ellipse cx={100} cy={132} rx={3.4} ry={2.6} fill={palette.outline} />

      {/* protea bloom crown — the signature feature */}
      <g>
        {/* outer ring of pointed petals */}
        <path
          d="M100,42
             L112,58 L130,52 L124,70 L143,72 L130,86 L146,96
             L127,100 L132,118 L114,110 L108,128 L100,110
             L92,128 L86,110 L68,118 L73,100 L54,96 L70,86
             L57,72 L76,70 L70,52 L88,58 Z"
          fill={palette.color}
          stroke={palette.outline}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        {/* inner cup */}
        <ellipse cx={100} cy={92} rx={20} ry={18} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
        {/* tiny golden center to echo the secondary color */}
        <circle cx={100} cy={92} r={6} fill={palette.color2} stroke={palette.outline} strokeWidth={1.8} />
      </g>

      {/* face on the muzzle — the nose is the mouth */}
      <Face mood={mood} cx={100} cy={120} w={28} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
