import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Colombia — a perched Andean condor: broad arched wings, a soft neck ruff, and a golden crown-comb above a hooked beak. */
export const COL: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* feet gripping the perch */}
      <ellipse cx={84} cy={192} rx={11} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={116} cy={192} rx={11} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />

      {/* broad left wing arcing up and out (the signature silhouette) */}
      <path
        d="M70,150 Q34,138 30,98 Q28,72 46,80 Q44,108 66,120 Q56,140 78,154 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* left wing flight feathers */}
      <path d="M42,84 Q40,104 58,116" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M52,82 Q50,100 66,112" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* broad right wing arcing up and out */}
      <path
        d="M130,150 Q166,138 170,98 Q172,72 154,80 Q156,108 134,120 Q144,140 122,154 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* right wing flight feathers */}
      <path d="M158,84 Q160,104 142,116" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M148,82 Q150,100 134,112" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" />

      {/* plump upright body between the folded wings */}
      <ellipse cx={100} cy={148} rx={42} ry={46} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={160} rx={24} ry={28} fill={palette.belly} />

      {/* soft fluffy neck ruff (the condor's pale collar) framing the head */}
      <path
        d="M100,118
           Q72,116 70,98 Q86,104 80,90 Q96,98 92,82
           Q100,90 108,82 Q104,98 120,90 Q114,104 130,98
           Q128,116 100,118 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* small bare head sitting on the ruff */}
      <ellipse cx={100} cy={80} rx={24} ry={23} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* the signature: a fleshy comb-crown in the strong team color */}
      <path
        d="M86,60 Q84,42 96,50 Q100,38 104,50 Q116,42 114,60 Q100,56 86,60 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* small wattle of the same strong color under the chin */}
      <path d="M100,98 Q94,108 100,112 Q106,108 100,98 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* hooked beak — the condor's own mouth */}
      <path
        d="M100,86 Q116,86 118,96 Q112,102 102,98 Q98,92 100,86 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={94} cy={78} w={22} eyeR={6.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
