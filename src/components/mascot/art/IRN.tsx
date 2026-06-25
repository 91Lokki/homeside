import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Iran — a slender Asiatic cheetah sitting tall, with tear-line markings and a spotted coat. */
export const IRN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* long cheetah tail sweeping up behind the body */}
      <path
        d="M138,176 Q172,176 174,138 Q176,112 160,104 Q166,122 160,138 Q154,158 138,162 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* dark ringed tail tip */}
      <path d="M160,104 Q176,112 174,134 Q166,124 158,120 Q158,110 160,104 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <circle cx={167} cy={150} r={3} fill={palette.color} />

      {/* front paws planted, sitting upright */}
      <ellipse cx={86} cy={190} rx={11} ry={8} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={190} rx={11} ry={8} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* slender, lean upright body — narrow shoulders widening to a seated haunch */}
      <path
        d="M84,118
           Q78,140 80,168 Q82,186 100,186 Q118,186 120,168
           Q122,140 116,118
           Q108,110 100,110 Q92,110 84,118 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <ellipse cx={100} cy={158} rx={18} ry={24} fill={palette.belly} />

      {/* spotted coat — the signature feature, the team color */}
      <circle cx={90} cy={132} r={3.4} fill={palette.color} />
      <circle cx={110} cy={130} r={3.4} fill={palette.color} />
      <circle cx={82} cy={150} r={3.4} fill={palette.color} />
      <circle cx={118} cy={148} r={3.4} fill={palette.color} />
      <circle cx={88} cy={168} r={3.4} fill={palette.color} />
      <circle cx={112} cy={168} r={3.4} fill={palette.color} />
      <circle cx={100} cy={142} r={3.4} fill={palette.color} />

      {/* tall rounded cheetah ears */}
      <ellipse cx={80} cy={66} rx={12} ry={14} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={120} cy={66} rx={12} ry={14} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={80} cy={68} rx={5} ry={6.5} fill={palette.color2} />
      <ellipse cx={120} cy={68} rx={5} ry={6.5} fill={palette.color2} />

      {/* small rounded head */}
      <ellipse cx={100} cy={92} rx={32} ry={30} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* a couple of head spots to carry the coat motif up */}
      <circle cx={84} cy={80} r={2.8} fill={palette.color} />
      <circle cx={116} cy={80} r={2.8} fill={palette.color} />

      {/* soft muzzle with the nose as the mouth */}
      <ellipse cx={100} cy={104} rx={13} ry={9.5} fill={palette.belly} />
      <path d="M100,100 Q106,102 103,107 Q100,110 97,107 Q94,102 100,100 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M100,108 Q100,114 93,115" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M100,108 Q100,114 107,115" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* the iconic cheetah tear-lines, from the inner eyes down past the muzzle */}
      <path d="M90,94 Q86,104 92,114" fill="none" stroke={palette.outline} strokeWidth={2.8} strokeLinecap="round" />
      <path d="M110,94 Q114,104 108,114" fill="none" stroke={palette.outline} strokeWidth={2.8} strokeLinecap="round" />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={88} w={26} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
