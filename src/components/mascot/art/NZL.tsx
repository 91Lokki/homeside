import { Face } from '../faces'
import type { MascotArt } from '../types'

/** New Zealand — a plump, shaggy little kiwi: round neckless body, stubby legs and a long, slender, down-curved probing beak. */
export const NZL: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* stubby legs + three-toed feet */}
      <path d="M86,176 L86,190" fill="none" stroke={palette.outline} strokeWidth={sw + 1} strokeLinecap="round" />
      <path d="M112,176 L112,190" fill="none" stroke={palette.outline} strokeWidth={sw + 1} strokeLinecap="round" />
      <path d="M78,191 L86,189 L94,191 M86,189 L86,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M104,191 L112,189 L120,191 M112,189 L112,196" fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />

      {/* plump pear-shaped, neckless kiwi body — tall at the back, tucking forward to a small head */}
      <path
        d="M96,176 Q56,178 50,128 Q46,86 86,72 Q120,62 142,90 Q160,114 150,150 Q142,178 116,178 Q104,178 96,176 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* soft pale belly */}
      <path
        d="M70,150 Q60,124 80,108 Q98,98 112,116 Q120,140 106,164 Q86,174 74,162 Q68,156 70,150 Z"
        fill={palette.belly}
      />

      {/* shaggy hair-like feather tufts along the back (the kiwi's loose plumage) */}
      <path d="M70,78 Q64,68 70,62" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M84,72 Q80,60 88,56" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M100,70 Q98,58 106,56" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M118,76 Q120,64 128,66" fill="none" stroke={palette.outline} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />

      {/* a tiny tucked vestigial wing (kiwi are flightless) */}
      <path
        d="M138,118 Q150,124 146,138 Q138,138 134,128 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* THE SIGNATURE: long, slender, down-curved kiwi beak in the strong team color */}
      <path
        d="M58,104 Q34,116 22,142 Q20,150 26,150 Q32,140 44,128 Q56,116 66,112 Q64,106 58,104 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* nostril near the beak tip (a kiwi quirk) */}
      <circle cx={28} cy={144} r={1.8} fill={palette.outline} />

      {/* face — the long beak is the mouth, so eyes only, set on the small forward head */}
      <Face mood={mood} cx={84} cy={100} w={22} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}