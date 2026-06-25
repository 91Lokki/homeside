import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Spain — a gentle little bull: a broad soft muzzle under a pair of sweeping, friendly horns. */
export const ESP: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* tufted tail flicking out behind */}
      <path
        d="M50,168 Q30,170 30,150 Q30,140 40,140 Q36,150 44,156 Q52,160 56,158 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <ellipse cx={32} cy={146} rx={6} ry={7} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />

      {/* hooves */}
      <ellipse cx={86} cy={192} rx={11} ry={8} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={192} rx={11} ry={8} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />

      {/* sturdy rounded body */}
      <ellipse cx={100} cy={156} rx={44} ry={42} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={168} rx={26} ry={26} fill={palette.belly} />

      {/* soft floppy ears (behind the horns) */}
      <ellipse cx={66} cy={96} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} transform="rotate(-24 66 96)" />
      <ellipse cx={134} cy={96} rx={13} ry={9} fill={palette.body} stroke={palette.outline} strokeWidth={sw} transform="rotate(24 134 96)" />

      {/* THE SIGNATURE: a pair of sweeping, gentle horns in the strong team color */}
      <path
        d="M78,82 Q56,76 50,58 Q48,46 56,42 Q54,54 64,62 Q74,70 84,72 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M122,82 Q144,76 150,58 Q152,46 144,42 Q146,54 136,62 Q126,70 116,72 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* broad, friendly head */}
      <ellipse cx={100} cy={104} rx={38} ry={34} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* a soft curl of forelock between the horns */}
      <path d="M92,76 Q100,68 108,76 Q104,80 100,79 Q96,80 92,76 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={2} strokeLinejoin="round" />

      {/* broad bull muzzle (its own mouth) */}
      <ellipse cx={100} cy={124} rx={24} ry={17} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      {/* two soft nostrils */}
      <ellipse cx={91} cy={122} rx={3.2} ry={4} fill={palette.outline} />
      <ellipse cx={109} cy={122} rx={3.2} ry={4} fill={palette.outline} />
      {/* gentle smile across the muzzle */}
      <path
        d={
          mood === 'blue'
            ? 'M91,133 Q100,129 109,133'
            : 'M90,131 Q100,138 110,131'
        }
        fill="none"
        stroke={palette.outline}
        strokeWidth={2.6}
        strokeLinecap="round"
      />

      {/* eyes only — the muzzle is the mouth */}
      <Face mood={mood} cx={100} cy={102} w={28} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}