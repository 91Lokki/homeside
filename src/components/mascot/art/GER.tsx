import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Germany — a gentle heraldic Bundesadler: a small round eagle with bold, upswept angular wings and a calm hooked beak. */
export const GER: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* upswept heraldic wings (behind) — angular feather tips, the signature silhouette */}
      <path
        d="M74,128 Q44,118 34,84 Q48,92 56,90 Q42,100 48,118 Q60,108 66,112 Q54,122 58,134 Q70,128 76,134 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M126,128 Q156,118 166,84 Q152,92 144,90 Q158,100 152,118 Q140,108 134,112 Q146,122 142,134 Q130,128 124,134 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* splayed talons */}
      <path d="M88,188 l-7,8 M88,188 l0,10 M88,188 l7,8" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M112,188 l-7,8 M112,188 l0,10 M112,188 l7,8" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* rounded eagle body in the strong team color */}
      <ellipse cx={100} cy={146} rx={42} ry={46} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />
      {/* soft heraldic breast shield */}
      <path
        d="M82,138 Q100,132 118,138 Q118,160 100,176 Q82,160 82,138 Z"
        fill={palette.belly}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* a couple of folded tail feathers peeking below */}
      <path d="M90,186 Q100,196 110,186" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* round head sitting on the body */}
      <circle cx={100} cy={92} r={30} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* small heraldic crest tuft */}
      <path d="M100,62 Q96,50 104,52 Q102,58 106,62 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* calm hooked beak (this is the mouth) with a tiny secondary-color tongue */}
      <path
        d="M93,100 Q100,98 107,100 Q107,112 101,118 Q95,114 95,108 Q94,104 93,100 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={100} cy={88} w={28} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}