import { Face } from '../faces'
import type { MascotArt } from '../types'
import { rgba } from '@/lib/prng'

/** Austria — a calm edelweiss flower-sprite: a ring of soft woolly star-petals
 *  crowns a small round stem-body, with the strong team color reserved for the
 *  tiny central floret cluster (the one botanical signature of the edelweiss). */
export const AUT: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  // Eight felty petals radiating from the bloom centre at (100,104).
  const cx = 100
  const cy = 104
  const petals = [
    { a: -90, len: 50, w: 17 },
    { a: -45, len: 47, w: 16 },
    { a: 0, len: 50, w: 17 },
    { a: 45, len: 47, w: 16 },
    { a: 90, len: 42, w: 16 },
    { a: 135, len: 47, w: 16 },
    { a: 180, len: 50, w: 17 },
    { a: -135, len: 47, w: 16 },
  ]
  const rad = (d: number) => (d * Math.PI) / 180
  return (
    <g>
      {/* stem (behind, rising from the ground into the bloom) */}
      <path
        d="M100,196 Q95,170 98,150 Q100,138 100,128"
        fill="none"
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* two leaf-arms hugging the stem */}
      <path
        d="M98,168 Q70,164 60,176 Q78,184 98,178 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <path
        d="M102,160 Q132,154 144,166 Q124,176 102,170 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* small round stem-body sitting just below the bloom */}
      <ellipse cx={100} cy={158} rx={26} ry={28} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={166} rx={14} ry={15} fill={palette.belly} />

      {/* the edelweiss bloom — eight soft woolly star-petals (the silhouette) */}
      {petals.map((p, i) => {
        const ox = cx + Math.cos(rad(p.a)) * 16
        const oy = cy + Math.sin(rad(p.a)) * 16
        const tx = cx + Math.cos(rad(p.a)) * p.len
        const ty = cy + Math.sin(rad(p.a)) * p.len
        const perpx = Math.cos(rad(p.a + 90))
        const perpy = Math.sin(rad(p.a + 90))
        const midx = (ox + tx) / 2
        const midy = (oy + ty) / 2
        // a soft pointed leaf-petal: base width -> rounded tip
        const d =
          `M${ox + perpx * p.w * 0.5},${oy + perpy * p.w * 0.5} ` +
          `Q${midx + perpx * p.w},${midy + perpy * p.w} ${tx},${ty} ` +
          `Q${midx - perpx * p.w},${midy - perpy * p.w} ${ox - perpx * p.w * 0.5},${oy - perpy * p.w * 0.5} Z`
        return (
          <path
            key={i}
            d={d}
            fill={palette.body}
            stroke={palette.outline}
            strokeWidth={sw}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )
      })}

      {/* bloom centre disc — softens where petals meet */}
      <circle cx={cx} cy={cy} r={24} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={24} fill={rgba('#ffffff', 0.18)} />

      {/* the signature: tiny central floret cluster in the strong team color */}
      <circle cx={cx - 9} cy={cy + 13} r={4} fill={palette.color} />
      <circle cx={cx + 9} cy={cy + 13} r={4} fill={palette.color} />
      <circle cx={cx - 4} cy={cy + 16} r={3.4} fill={palette.color} />
      <circle cx={cx + 4} cy={cy + 16} r={3.4} fill={palette.color} />

      {/* one face nestled in the bloom centre */}
      <Face mood={mood} cx={cx} cy={cy - 2} w={22} eyeR={7} ink={palette.ink} />
    </g>
  )
}