import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Paraguay — a little bellbird (campana), head tipped back mid-song, a tiny bell ringing beside it. */
export const PAR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* perch twig (behind feet) */}
      <path d="M64,196 Q100,190 140,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* feet gripping the perch */}
      <path d="M86,184 L86,196 M80,196 L92,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M112,184 L112,196 M106,196 L118,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* tail (slim, swept down-left) */}
      <path d="M78,150 Q56,168 58,188 Q72,180 86,164 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* upright songbird body — slim and tall, not a blob */}
      <path
        d="M99,76 Q132,84 134,128 Q134,176 99,184 Q70,176 70,128 Q72,86 99,76 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* soft belly */}
      <ellipse cx={97} cy={146} rx={22} ry={30} fill={palette.belly} />

      {/* folded wing */}
      <path d="M120,108 Q142,124 128,158 Q112,148 112,118 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* head, tipped back in song */}
      <ellipse cx={96} cy={84} rx={30} ry={28} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* tiny tuft / crest */}
      <path d="M88,58 Q92,46 98,52 Q102,46 106,58 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* the singing bill — the signature, opened wide to ring out the bell-call */}
      <path d="M122,76 Q156,68 166,82 Q150,88 122,86 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M122,86 Q150,90 164,100 Q150,104 122,96 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* hanging bell (campana) — the motif, ringing beside the singer */}
      <path d="M150,124 L150,134" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M142,150 Q142,134 150,134 Q158,134 158,150 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M140,150 L160,150" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={150} cy={154} r={2.6} fill={palette.outline} />

      {/* eyes only — the open bill is the mouth */}
      <Face mood={mood} cx={92} cy={82} w={24} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}