import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Belgium — a calm little lion: a bold heraldic mane (strong color) frames a soft round face, with a curling tufted tail. */
export const BEL: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* curling tufted tail (behind, sweeping up) */}
      <path
        d="M138,170 Q166,166 162,134 Q160,114 146,116 Q156,124 152,138 Q148,156 130,158 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* tail tuft (signature color) */}
      <path
        d="M150,108 Q140,100 150,94 Q156,100 164,98 Q160,106 166,114 Q156,114 150,108 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* front paws */}
      <ellipse cx={84} cy={186} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={116} cy={186} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <path d="M80,184 L80,189 M84,185 L84,190 M88,184 L88,189" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />
      <path d="M112,184 L112,189 M116,185 L116,190 M120,184 L120,189" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.4} />

      {/* haunches / seated body */}
      <ellipse cx={100} cy={158} rx={42} ry={36} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={166} rx={24} ry={22} fill={palette.belly} />

      {/* little rounded ears tucked into the mane */}
      <circle cx={74} cy={78} r={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={126} cy={78} r={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={74} cy={78} r={4.5} fill={palette.belly} />
      <circle cx={126} cy={78} r={4.5} fill={palette.belly} />

      {/* THE SIGNATURE: bold heraldic mane — a ring of soft flame-points in the strong team color */}
      <path
        d="M100,40
           L110,56 L126,46 L128,66 L148,62 L142,82
           L162,86 L150,102 L166,114 L148,122 L156,140
           L136,140 L138,160 L120,152 L116,170
           L100,160 L84,170 L80,152 L62,160 L64,140
           L44,140 L52,122 L34,114 L50,102 L38,86
           L58,82 L52,62 L72,66 L74,46 L90,56 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* soft round face resting inside the mane */}
      <circle cx={100} cy={104} r={36} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={118} rx={20} ry={16} fill={palette.belly} />

      {/* gentle muzzle + little nose (the body provides the mouth) */}
      <ellipse cx={100} cy={120} rx={11} ry={8} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <path d="M93,116 Q100,112 107,116 Q100,122 93,116 Z" fill={palette.outline} />
      <path d="M100,122 Q100,128 94,130 M100,122 Q100,128 106,130" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={102} w={28} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
