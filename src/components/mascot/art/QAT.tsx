import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Qatar — a serene Arabian oryx: slender upright neck and two long swept horns (the signature). */
export const QAT: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* hind leg + front leg (behind body) */}
      <rect x={84} y={158} width={11} height={36} rx={5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={110} y={158} width={11} height={36} rx={5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* small dark hooves */}
      <ellipse cx={89} cy={193} rx={7} ry={4} fill={palette.outline} />
      <ellipse cx={115} cy={193} rx={7} ry={4} fill={palette.outline} />

      {/* short tufted tail */}
      <path d="M138,150 Q156,156 152,176 Q144,170 134,164 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* compact body */}
      <ellipse cx={100} cy={150} rx={44} ry={34} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={158} rx={26} ry={20} fill={palette.belly} />

      {/* slender upright neck (gives the distinct oryx posture) */}
      <path d="M86,128 Q82,98 92,80 L116,84 Q116,112 114,132 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* long elegant head/muzzle */}
      <path d="M80,84 Q78,58 96,52 Q120,50 126,66 Q130,84 120,94 Q100,100 84,96 Z" fill={palette.body} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* soft inner muzzle */}
      <ellipse cx={92} cy={86} rx={15} ry={11} fill={palette.belly} />
      {/* tiny nose */}
      <ellipse cx={82} cy={82} rx={4} ry={3} fill={palette.outline} />

      {/* upright ears */}
      <path d="M112,60 Q124,48 130,58 Q126,66 116,68 Z" fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* THE SIGNATURE — two long, gently back-swept oryx horns */}
      <path d="M100,52 Q108,24 116,42" fill="none" stroke={palette.outline} strokeWidth={sw + 4.6} strokeLinecap="round" />
      <path d="M100,52 Q108,24 116,42" fill="none" stroke={palette.color} strokeWidth={sw + 1.6} strokeLinecap="round" />
      <path d="M108,50 Q120,22 130,38" fill="none" stroke={palette.outline} strokeWidth={sw + 4.6} strokeLinecap="round" />
      <path d="M108,50 Q120,22 130,38" fill="none" stroke={palette.color} strokeWidth={sw + 1.6} strokeLinecap="round" />

      {/* face on the head — muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={74} w={22} eyeR={6.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
