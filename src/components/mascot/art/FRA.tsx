import { Face } from '../faces'
import type { MascotArt } from '../types'

/** France — a proud little Gallic rooster: upright chest, a tall serrated comb crowning the head, a sweeping arc of sickle tail-plumes, and a small beak with soft wattle. */
export const FRA: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* sturdy legs */}
      <path d="M90,176 L88,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M112,176 L114,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      {/* splayed three-toed feet */}
      <path d="M88,196 L80,198 M88,196 L88,199 M88,196 L96,198" fill="none" stroke={palette.outline} strokeWidth={sw - 0.6} strokeLinecap="round" />
      <path d="M114,196 L106,198 M114,196 L114,199 M114,196 L122,198" fill="none" stroke={palette.outline} strokeWidth={sw - 0.6} strokeLinecap="round" />

      {/* sweeping arc of sickle tail-plumes (behind, secondary color) */}
      <path
        d="M132,158 Q170,150 168,108 Q160,98 152,108 Q160,134 130,140 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M132,150 Q160,140 156,114"
        fill="none"
        stroke={palette.outline}
        strokeWidth={sw - 1}
        strokeLinecap="round"
      />

      {/* plump upright body */}
      <path
        d="M70,150 Q66,108 100,104 Q138,108 134,154 Q126,184 100,184 Q74,184 70,150 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* puffed chest / belly */}
      <ellipse cx={94} cy={156} rx={24} ry={26} fill={palette.belly} />

      {/* folded wing accent */}
      <path d="M122,140 Q138,150 130,172 Q116,168 116,148 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* head, set forward atop the chest */}
      <circle cx={96} cy={82} r={26} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* small beak (this is the mouth) */}
      <path d="M120,80 Q136,78 140,84 Q134,90 120,88 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* soft wattle beneath the beak */}
      <path d="M118,92 Q124,104 116,106 Q112,100 114,92 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* THE SIGNATURE: a tall serrated comb crowning the head (strong team color) */}
      <path
        d="M78,62 Q72,42 84,44 Q86,30 98,40 Q102,26 114,38 Q120,28 124,44 Q132,46 122,60 Q102,52 78,62 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={92} cy={82} w={22} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
