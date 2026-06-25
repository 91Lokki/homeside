/**
 * Motif crests — a single small emblem that sprouts from the top of each
 * mascot's head, loosely inspired by a national symbol. Kept deliberately tiny
 * and simple (one element, never a pile of decorations).
 *
 * Each glyph is drawn centered on (0,0) within roughly a 24×24 box and is
 * scaled/positioned by the Mascot component.
 */
import type { ReactNode } from 'react'

export type GlyphId =
  | 'leaf'
  | 'maple'
  | 'feather'
  | 'wing'
  | 'star'
  | 'sun'
  | 'crescent'
  | 'flame'
  | 'drop'
  | 'mountain'
  | 'wave'
  | 'flower'
  | 'gem'
  | 'sprout'
  | 'horn'
  | 'spark'

interface GlyphProps {
  fill: string
  stroke: string
  sw: number // stroke width
}

const G: Record<GlyphId, (p: GlyphProps) => ReactNode> = {
  leaf: ({ fill, stroke, sw }) => (
    <g>
      <path d="M0,11 C-7,4 -7,-7 0,-12 C7,-7 7,4 0,11 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M0,9 L0,-9" stroke={stroke} strokeWidth={sw * 0.7} strokeLinecap="round" />
    </g>
  ),
  maple: ({ fill, stroke, sw }) => (
    <path
      d="M0,-12 L2.4,-5 L8,-7 L5,-1 L11,1 L5.5,3.5 L7,9 L1.5,6 L0,12 L-1.5,6 L-7,9 L-5.5,3.5 L-11,1 L-5,-1 L-8,-7 L-2.4,-5 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  ),
  feather: ({ fill, stroke, sw }) => (
    <g>
      <path d="M0,12 C-6,4 -6,-6 0,-12 C6,-6 6,4 0,12 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M0,10 L0,-10 M0,-4 L4,-7 M0,-4 L-4,-7 M0,2 L4,-1 M0,2 L-4,-1" stroke={stroke} strokeWidth={sw * 0.6} strokeLinecap="round" />
    </g>
  ),
  wing: ({ fill, stroke, sw }) => (
    <path
      d="M-11,4 C-6,-4 4,-8 11,-6 C6,-3 7,2 2,5 C5,5 6,9 1,9 C-3,9 -8,8 -11,4 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  ),
  star: ({ fill, stroke, sw }) => (
    <path
      d="M0,-12 L3.2,-3.8 L11.4,-3.7 L4.8,1.4 L7.2,9.6 L0,4.7 L-7.2,9.6 L-4.8,1.4 L-11.4,-3.7 L-3.2,-3.8 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  ),
  sun: ({ fill, stroke, sw }) => (
    <g stroke={stroke} strokeWidth={sw} strokeLinecap="round">
      <circle cx={0} cy={0} r={6} fill={fill} />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <line key={i} x1={Math.cos(a) * 8} y1={Math.sin(a) * 8} x2={Math.cos(a) * 11.5} y2={Math.sin(a) * 11.5} />
      })}
    </g>
  ),
  crescent: ({ fill, stroke, sw }) => (
    <path d="M5,-10 A11,11 0 1 0 5,10 A8.5,8.5 0 1 1 5,-10 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  ),
  flame: ({ fill, stroke, sw }) => (
    <path
      d="M0,-12 C5,-5 8,-2 8,4 C8,9 4,12 0,12 C-4,12 -8,9 -8,4 C-8,0 -5,-2 -3,-5 C-3,-1 -1,0 0,-2 C1,-5 0,-8 0,-12 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinejoin="round"
    />
  ),
  drop: ({ fill, stroke, sw }) => (
    <path d="M0,-12 C6,-3 8,2 8,5 A8,8 0 1 1 -8,5 C-8,2 -6,-3 0,-12 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  ),
  mountain: ({ fill, stroke, sw }) => (
    <g>
      <path d="M-11,9 L-3,-6 L2,2 L6,-4 L11,9 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      <path d="M-5,-1.5 L-3,-6 L-1,-2.5 Z" fill={stroke} />
    </g>
  ),
  wave: ({ fill, stroke, sw }) => (
    <g fill="none" stroke={stroke} strokeWidth={sw * 1.4} strokeLinecap="round">
      <path d="M-11,-4 C-7,-9 -3,1 1,-4 C5,-9 9,1 11,-4" />
      <path d="M-11,4 C-7,-1 -3,9 1,4 C5,-1 9,9 11,4" stroke={fill} />
    </g>
  ),
  flower: ({ fill, stroke, sw }) => (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        return <ellipse key={i} cx={Math.cos(a) * 6} cy={Math.sin(a) * 6} rx={3.4} ry={5.4} fill={fill} transform={`rotate(${(a * 180) / Math.PI + 90} ${Math.cos(a) * 6} ${Math.sin(a) * 6})`} />
      })}
      <circle cx={0} cy={0} r={3} fill={stroke} />
    </g>
  ),
  gem: ({ fill, stroke, sw }) => (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d="M-7,-4 L7,-4 L11,0 L0,11 L-11,0 Z" fill={fill} />
      <path d="M-7,-4 L-3,0 L0,11 M7,-4 L3,0 L0,11 M-11,0 L11,0 M-3,0 L3,0" fill="none" strokeWidth={sw * 0.6} />
    </g>
  ),
  sprout: ({ fill, stroke, sw }) => (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <path d="M0,11 L0,-2" fill="none" />
      <path d="M0,-1 C-9,-2 -9,-11 -1,-10 C-1,-3 -0.5,-2 0,-1 Z" fill={fill} />
      <path d="M0,-3 C9,-4 9,-13 1,-12 C1,-5 0.5,-4 0,-3 Z" fill={fill} />
    </g>
  ),
  horn: ({ fill, stroke, sw }) => (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d="M-2,11 C-9,4 -9,-8 -3,-12 C-1,-6 -1,2 1,11 Z" fill={fill} />
      <path d="M3,11 C10,4 10,-8 4,-12 C2,-6 2,2 0,11 Z" fill={fill} />
    </g>
  ),
  spark: ({ fill, stroke, sw }) => (
    <path d="M0,-11 C1.5,-3 3,-1.5 11,0 C3,1.5 1.5,3 0,11 C-1.5,3 -3,1.5 -11,0 C-3,-1.5 -1.5,-3 0,-11 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
  ),
}

export function Glyph({ id, ...p }: { id: GlyphId } & GlyphProps) {
  return G[id](p)
}

/** Map a free-text national symbol keyword to one of our crest glyphs. */
export function resolveGlyph(symbol: string): GlyphId {
  const s = symbol.toLowerCase()
  const has = (...keys: string[]) => keys.some((k) => s.includes(k))

  if (has('maple')) return 'maple'
  if (has('feather', 'quetzal', 'plume')) return 'feather'
  if (has('eagle', 'falcon', 'hawk', 'condor', 'crane', 'bird', 'rooster', 'cock', 'wing', 'phoenix')) return 'wing'
  if (has('sun')) return 'sun'
  if (has('moon', 'crescent', 'star and crescent')) return 'crescent'
  if (has('star')) return 'star'
  if (has('flame', 'fire', 'volcano', 'torch')) return 'flame'
  if (has('wave', 'sea', 'ocean', 'water', 'fjord', 'river')) return 'wave'
  if (has('drop', 'rain', 'dew')) return 'drop'
  if (has('mountain', 'peak', 'alp', 'andes', 'hill')) return 'mountain'
  if (has('tulip', 'flower', 'rose', 'lotus', 'cherry', 'blossom', 'orchid', 'protea', 'edelweiss')) return 'flower'
  if (has('gem', 'diamond', 'jewel', 'crystal', 'emerald')) return 'gem'
  if (has('cedar', 'oak', 'tree', 'leaf', 'palm', 'olive', 'fern', 'laurel')) return 'leaf'
  if (has('sprout', 'shamrock', 'clover', 'wheat', 'grass', 'seedling')) return 'sprout'
  if (has('horn', 'bull', 'ox', 'antelope', 'oryx', 'ram', 'goat', 'deer', 'elk', 'moose')) return 'horn'
  if (has('spark', 'gold', 'shine', 'light')) return 'spark'
  return 'leaf'
}
