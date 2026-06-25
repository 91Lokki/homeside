import { Face } from '../faces'
import { rgba } from '@/lib/prng'
import type { MascotArt } from '../types'

/** England — a calm heraldic lion whose petal-like white mane echoes a rose, with one red rose at the chest. */
export const ENG: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  // mane: eight soft petals ringing the head — the white "rose" silhouette (the signature feature)
  const petals = [-90, -45, 0, 45, 90, 135, 180, 225]
  const maneCx = 100
  const maneCy = 96
  const maneR = 40
  return (
    <g>
      {/* tail with a tufted tip, curling out behind */}
      <path
        d="M138,168 Q166,162 162,134 Q160,120 148,124"
        fill="none"
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <path
        d="M160,116 Q172,118 166,132 Q156,130 156,120 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* paws */}
      <ellipse cx={84} cy={188} rx={13} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={116} cy={188} rx={13} ry={9} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />

      {/* seated body */}
      <path
        d="M70,178 Q66,128 100,126 Q134,128 130,178 Q100,190 70,178 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <ellipse cx={100} cy={160} rx={22} ry={26} fill={palette.belly} />

      {/* rounded ears peeking above the mane */}
      <circle cx={76} cy={70} r={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={124} cy={70} r={11} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={76} cy={70} r={4.5} fill={rgba('#ff7a6b', 0.3)} />
      <circle cx={124} cy={70} r={4.5} fill={rgba('#ff7a6b', 0.3)} />

      {/* the white petal-mane — the rose-like signature ring */}
      {petals.map((deg) => {
        const a = (deg * Math.PI) / 180
        const px = maneCx + Math.cos(a) * maneR
        const py = maneCy + Math.sin(a) * maneR
        return (
          <ellipse
            key={deg}
            cx={px}
            cy={py}
            rx={15}
            ry={15}
            fill={palette.color}
            stroke={palette.outline}
            strokeWidth={sw}
          />
        )
      })}

      {/* lion face plate — sits on top of the mane so it reads as the head */}
      <circle cx={maneCx} cy={maneCy} r={34} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={maneCx} cy={maneCy + 8} rx={22} ry={20} fill={palette.belly} />

      {/* little muzzle so the lion has a snout (Face draws its own gentle mouth) */}
      <ellipse cx={maneCx} cy={maneCy + 14} rx={5} ry={3.6} fill={palette.outline} />

      {/* the single red rose at the chest — secondary accent */}
      <g>
        <circle cx={100} cy={158} r={9} fill={palette.color2} stroke={palette.outline} strokeWidth={sw} />
        <path d="M100,151 Q104,158 100,165 Q96,158 100,151 Z" fill={rgba('#ffffff', 0.22)} />
        <path d="M91,158 Q100,154 109,158" fill="none" stroke={rgba('#ffffff', 0.3)} strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* eyes + soft mouth, placed on the face plate */}
      <Face mood={mood} cx={maneCx} cy={maneCy} w={26} eyeR={7} ink={palette.ink} />
    </g>
  )
}
