import { Face } from '../faces'
import { rgba } from '@/lib/prng'
import type { MascotArt } from '../types'

/** Cabo Verde — a calm Cory's shearwater gliding low, broad swept-back wings + a long hooked seabird bill. */
export const CPV: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* far wing (behind the body) — long, slender, swept back like a soaring seabird */}
      <path
        d="M104,120 Q142,98 168,116 Q146,124 128,132 Q114,130 104,126 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* soft sea-glide hint under the bird (translucent accent, sparing) */}
      <ellipse cx={100} cy={196} rx={46} ry={6} fill={rgba('#003893', 0.14)} />

      {/* webbed feet tucked under */}
      <ellipse cx={88} cy={184} rx={9} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={110} cy={184} rx={9} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* streamlined body — an egg tilted forward, not a round blob */}
      <path
        d="M70,108 Q72,76 100,72 Q132,74 140,108 Q148,150 116,178 Q98,186 80,176 Q56,150 70,108 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* pale underbelly */}
      <path
        d="M86,118 Q100,112 116,120 Q124,148 104,172 Q92,176 84,168 Q76,144 86,118 Z"
        fill={palette.belly}
      />

      {/* long forked tail trailing behind, low */}
      <path
        d="M118,168 Q146,174 162,166 Q148,178 122,182 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* near wing folded over the back, the long primaries sweeping to a point */}
      <path
        d="M96,100 Q140,90 166,112 Q142,121 118,128 Q104,124 96,113 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* a couple of calm feather lines, no clutter */}
      <path d="M118,115 Q140,110 158,116" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
      <path d="M116,122 Q136,119 154,123" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.45} />

      {/* rounded head */}
      <circle cx={92} cy={88} r={26} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* the signature: a long, gently hooked tube-nosed shearwater bill in the team color */}
      <path
        d="M72,86 Q46,84 36,92 Q40,100 50,100 Q62,100 74,96 Q78,90 72,86 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* the little downward hook at the bill tip */}
      <path d="M36,92 Q31,96 35,101 Q40,100 42,98" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* tube-nostril ridge along the top of the bill */}
      <path d="M56,89 Q63,87 70,88" fill="none" stroke={palette.outline} strokeWidth={2} strokeLinecap="round" opacity={0.5} />

      {/* eyes only — the bill is the mouth */}
      <Face mood={mood} cx={92} cy={84} w={22} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
