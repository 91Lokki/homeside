import { Face } from '../faces'
import type { MascotArt } from '../types'

/** DR Congo — a calm little leopard cub: round ears, soft cheek ruffs, a long
 *  curling tail, and a scatter of signature rosette spots in the strong color. */
export const COD: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* long leopard tail, curling up the right side (behind the body) */}
      <path
        d="M140,170 Q172,168 168,128 Q166,104 150,108 Q160,118 156,138 Q152,158 132,162 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* tail tip accent */}
      <ellipse cx={153} cy={110} rx={5.5} ry={5} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />

      {/* haunches / paws */}
      <ellipse cx={78} cy={188} rx={15} ry={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={122} cy={188} rx={15} ry={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      {/* toe beans */}
      <circle cx={73} cy={190} r={2.4} fill={palette.outline} />
      <circle cx={83} cy={190} r={2.4} fill={palette.outline} />
      <circle cx={117} cy={190} r={2.4} fill={palette.outline} />
      <circle cx={127} cy={190} r={2.4} fill={palette.outline} />

      {/* body */}
      <ellipse cx={100} cy={150} rx={44} ry={46} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={164} rx={26} ry={28} fill={palette.belly} />

      {/* rounded leopard ears (behind the head) */}
      <path d="M74,86 Q60,58 50,78 Q48,98 70,100 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M126,86 Q140,58 150,78 Q152,98 130,100 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* inner ears (secondary, used sparingly) */}
      <path d="M70,86 Q62,72 57,82 Q56,93 70,94 Z" fill={palette.color2} />
      <path d="M130,86 Q138,72 143,82 Q144,93 130,94 Z" fill={palette.color2} />

      {/* head with soft cheek ruffs (the feline silhouette) */}
      <path
        d="M100,66
           Q138,66 142,98
           Q146,118 130,128
           Q120,134 112,128
           Q106,140 94,140
           Q88,134 88,128
           Q86,134 78,134
           Q60,128 58,108
           Q56,72 100,66 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* light muzzle */}
      <ellipse cx={100} cy={118} rx={20} ry={15} fill={palette.belly} />

      {/* signature rosette spots in the strong team color */}
      <ellipse cx={78} cy={150} rx={4.5} ry={3.6} fill={palette.color} />
      <ellipse cx={98} cy={140} rx={4.5} ry={3.6} fill={palette.color} />
      <ellipse cx={120} cy={148} rx={4.5} ry={3.6} fill={palette.color} />
      <ellipse cx={84} cy={170} rx={4.5} ry={3.6} fill={palette.color} />
      <ellipse cx={116} cy={172} rx={4.5} ry={3.6} fill={palette.color} />
      <ellipse cx={70} cy={130} rx={4} ry={3.2} fill={palette.color} />
      <ellipse cx={132} cy={132} rx={4} ry={3.2} fill={palette.color} />

      {/* little leopard nose + snout line (this is the mouth) */}
      <path d="M95,114 Q100,118 105,114 Q102,120 100,120 Q98,120 95,114 Z" fill={palette.outline} stroke={palette.outline} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M100,120 Q100,127 92,129" fill="none" stroke={palette.outline} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M100,120 Q100,127 108,129" fill="none" stroke={palette.outline} strokeWidth={2.6} strokeLinecap="round" />

      {/* whiskers, gentle */}
      <path d="M82,118 Q66,116 58,120" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M118,118 Q134,116 142,120" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.7} />

      {/* eyes only — the muzzle/nose reads as the mouth */}
      <Face mood={mood} cx={100} cy={100} w={30} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
