import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Croatia — a kite-shaped sprite whose diamond body wears a red-and-white checkerboard. */
export const CRO: MascotArt = ({ palette, mood }) => {
  const sw = 3.4

  // Diamond (rhombus) body — a kite/shield silhouette, distinct from a round blob.
  const cx = 100
  const cy = 124
  const halfW = 56 // left/right reach
  const halfH = 70 // top/bottom reach
  const top = cy - halfH
  const bot = cy + halfH
  const left = cx - halfW
  const right = cx + halfW
  const r = 16 // corner softening

  // Rounded-diamond outline path (gentle quadratic corners so it reads friendly).
  const bodyPath = [
    `M${cx},${top}`,
    `Q${cx + r},${top + r * 0.55} ${right - r * 0.55},${cy - r}`,
    `Q${right},${cy} ${right - r * 0.55},${cy + r}`,
    `Q${cx + r},${bot - r * 0.55} ${cx},${bot}`,
    `Q${cx - r},${bot - r * 0.55} ${left + r * 0.55},${cy + r}`,
    `Q${left},${cy} ${left + r * 0.55},${cy - r}`,
    `Q${cx - r},${top + r * 0.55} ${cx},${top}`,
    'Z',
  ].join(' ')

  // Checkerboard tiles laid on the diagonal grid of the diamond.
  // Each tile is a small diamond (square rotated 45deg) tracking the body's lattice.
  const t = 18 // half-diagonal of one tile
  const tile = (gx: number, gy: number) => {
    const px = cx + (gx - gy) * t
    const py = cy + (gx + gy) * t
    return `M${px},${py - t} L${px + t},${py} L${px},${py + t} L${px - t},${py} Z`
  }
  // Pick interior cells that stay within the rhombus; alternate fill = checker.
  // The center cell is left WHITE so the face reads cleanly on the belly.
  const cells: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ]

  return (
    <g>
      {/* tassel tail (behind, lower-left) */}
      <path
        d="M58,176 Q44,190 50,200 Q58,196 64,188 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* little feet peeking under the diamond */}
      <ellipse cx={86} cy={190} rx={9} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={114} cy={190} rx={9} ry={6} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* diamond body base (white belly fill so red checks pop) */}
      <path d={bodyPath} fill={palette.belly} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />

      {/* checkerboard — the ONE signature, in the strong team color */}
      {cells.map(([gx, gy], i) => (
        <path key={i} d={tile(gx, gy)} fill={palette.color} />
      ))}

      {/* re-stroke the silhouette on top so the pattern stays tidy inside */}
      <path d={bodyPath} fill="none" stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />

      {/* soft inner sheen at the very top point */}
      <path d={`M${cx},${top + 6} Q${cx + 8} ${top + 16} ${cx + 2} ${top + 24}`} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity={0.5} />

      {/* tiny rounded crest cap at the top tip for a heraldic-shield feel */}
      <circle cx={cx} cy={top - 2} r={6} fill={palette.color} stroke={palette.outline} strokeWidth={sw} />

      {/* one calm face near the upper-middle white cell */}
      <Face mood={mood} cx={cx} cy={cy - 8} w={26} eyeR={7.5} ink={palette.ink} />
    </g>
  )
}