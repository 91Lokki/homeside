import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Saudi Arabia — a gentle date-palm sprite: a rounded trunk-body under an
 *  arching crown of fronds, with a small cluster of dates tucked beneath. */
export const KSA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* feet */}
      <ellipse cx={88} cy={190} rx={11} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={112} cy={190} rx={11} ry={7} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* trunk-body — tall and gently tapered, not a round blob */}
      <path
        d="M80,176 Q76,128 84,96 Q92,86 100,86 Q108,86 116,96 Q124,128 120,176 Q100,184 80,176 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* belly panel */}
      <path d="M90,170 Q86,134 92,104 Q100,100 108,104 Q114,134 110,170 Q100,175 90,170 Z" fill={palette.belly} />
      {/* trunk segment rings (date-palm bark) */}
      <path d="M84,148 Q100,153 116,148" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />
      <path d="M82,128 Q100,133 118,128" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />
      <path d="M82,112 Q100,116 118,112" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.45} strokeLinecap="round" />

      {/* dates — a tiny cluster tucked under the crown (secondary color, sparingly) */}
      <ellipse cx={126} cy={92} rx={5} ry={6.5} fill={palette.color2} stroke={palette.outline} strokeWidth={2.4} />
      <ellipse cx={133} cy={99} rx={5} ry={6.5} fill={palette.color2} stroke={palette.outline} strokeWidth={2.4} />
      <ellipse cx={124} cy={101} rx={5} ry={6.5} fill={palette.color2} stroke={palette.outline} strokeWidth={2.4} />

      {/* crown of fronds — THE signature: an arching burst in the strong team color */}
      {/* far-left frond */}
      <path d="M96,84 Q56,76 34,92 Q56,86 96,92 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* left frond */}
      <path d="M97,82 Q66,58 50,52 Q72,62 97,90 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* upper-left frond */}
      <path d="M98,80 Q86,50 78,40 Q92,54 100,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* center frond */}
      <path d="M100,80 Q104,48 100,40 Q96,48 100,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* upper-right frond */}
      <path d="M102,80 Q114,50 122,40 Q108,54 100,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* right frond */}
      <path d="M103,82 Q134,58 150,52 Q128,62 103,90 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* far-right frond */}
      <path d="M104,84 Q144,76 166,92 Q144,86 104,92 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* frond mid-ribs for a soft leafy read */}
      <path d="M99,86 Q62,80 40,90" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.4} strokeLinecap="round" />
      <path d="M101,86 Q138,80 160,90" fill="none" stroke={palette.outline} strokeWidth={1.5} opacity={0.4} strokeLinecap="round" />

      {/* small crown knot where fronds meet the trunk */}
      <ellipse cx={100} cy={86} rx={14} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* face on the trunk */}
      <Face mood={mood} cx={100} cy={120} w={26} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}