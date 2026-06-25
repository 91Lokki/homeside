import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Portugal — a folk Rooster of Barcelos: tall red comb, curved beak, a proud fan of tail feathers, and a little heart on the chest. */
export const POR: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* sweeping tail feathers (behind, the proud rooster fan) */}
      <path
        d="M70,150 Q34,138 30,98 Q48,108 64,116 Q40,96 42,66 Q60,84 76,104 Q66,78 80,56 Q92,82 90,116 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* feet */}
      <path d="M86,188 L86,200 M80,200 L92,200" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <path d="M112,188 L112,200 M106,200 L118,200" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />

      {/* body — an upright teardrop, narrow chest swelling to a round base */}
      <path
        d="M99,86 Q132,92 138,138 Q140,180 99,188 Q58,180 60,138 Q66,92 99,86 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      {/* pale chest */}
      <ellipse cx={97} cy={150} rx={26} ry={30} fill={palette.belly} />

      {/* folk heart on the chest (the signature folk-art touch) */}
      <path
        d="M97,148 Q90,140 84,146 Q79,151 97,166 Q115,151 110,146 Q104,140 97,148 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />

      {/* folded wing */}
      <path d="M124,120 Q142,134 130,162 Q116,154 116,130 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* tall serrated comb — THE signature red crest */}
      <path
        d="M82,70 Q80,54 90,52 Q90,42 100,42 Q102,52 110,52 Q121,52 120,68 Q110,62 100,64 Q90,62 82,70 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* curved beak (the mouth) */}
      <path d="M118,92 Q138,90 140,100 Q132,104 119,102 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      {/* red wattle under the beak */}
      <path d="M114,104 Q120,116 112,120 Q108,112 110,104 Z" fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={96} cy={92} w={26} eyeR={7.5} ink={palette.ink} showMouth={false} />
    </g>
  )
}
