import { useMemo } from 'react'
import type { Mood } from '@/domain/bond'
import { darken, lighten, mixHex, rgba, rngFromString } from '@/lib/prng'
import { cn } from '@/lib/utils'
import { Glyph, resolveGlyph } from './glyphs'

export interface MascotProps {
  /** Team code — seeds the creature so each team's mascot is unique & stable. */
  code: string
  color: string
  color2?: string
  symbol: string
  /** Bond level 1..7 — drives size, warmth of color, and a soft aura. */
  level?: number
  mood?: Mood
  size?: number
  animate?: boolean
  className?: string
  title?: string
}

const EAR_TYPES = ['round', 'pointed', 'tuft', 'none'] as const
type EarType = (typeof EAR_TYPES)[number]

/**
 * The home-team mascot: an original, calm little companion rendered as flat,
 * seeded SVG. No gradients, no clutter — it grows gently with the bond and
 * shifts mood with real results, but is never punished.
 */
export function Mascot({
  code,
  color,
  color2,
  symbol,
  level = 1,
  mood = 'calm',
  size = 280,
  animate = true,
  className,
  title,
}: MascotProps) {
  const p = useMemo(() => buildParams(code, color, color2 ?? color, level), [code, color, color2, level])
  const glyph = useMemo(() => resolveGlyph(symbol), [symbol])

  // Growth: gentle scale + a downward settle for a blue mood.
  const growth = 0.84 + ((Math.min(level, 7) - 1) / 6) * 0.16
  const settle = mood === 'blue' ? 6 : 0
  const tilt = mood === 'new' ? -4 : 0
  const showAura = level >= 5

  const sw = 3.4 // outline weight

  return (
    <svg
      viewBox="0 0 200 224"
      width={size}
      height={(size * 224) / 200}
      role="img"
      aria-label={title ?? `${code} mascot`}
      className={cn('select-none overflow-visible', className)}
    >
      {/* soft aura at deep bond — a single calm ring, never a pile of effects */}
      {showAura && (
        <g className={animate ? 'animate-breathe' : undefined} style={{ transformOrigin: '100px 116px' }}>
          <circle cx={100} cy={112} r={92} fill="none" stroke={rgba(color, level >= 7 ? 0.16 : 0.1)} strokeWidth={2} />
          {level >= 7 && <circle cx={100} cy={112} r={104} fill="none" stroke={rgba(color, 0.07)} strokeWidth={2} />}
        </g>
      )}

      {/* flat contact oval — grounds the creature without a drop shadow */}
      <ellipse cx={100} cy={206} rx={52} ry={9} fill={rgba('#1a1a17', 0.06)} />

      <g
        className={animate ? 'animate-breathe' : undefined}
        style={{ transformOrigin: '100px 200px', transform: `translateY(${settle}px) rotate(${tilt}deg) scale(${growth})` }}
      >
        {/* ---- appendages drawn behind the body so the silhouette stays clean ---- */}
        <Ears type={p.ear} dx={p.earDx} fill={p.bodyFill} stroke={p.outline} sw={sw} />
        <Arms raised={mood === 'cheering'} fill={p.bodyFill} stroke={p.outline} sw={sw} bodyW={p.bodyW} />
        {/* feet */}
        <ellipse cx={100 - p.footDx} cy={190} rx={11} ry={7.5} fill={p.bodyFill} stroke={p.outline} strokeWidth={sw} />
        <ellipse cx={100 + p.footDx} cy={190} rx={11} ry={7.5} fill={p.bodyFill} stroke={p.outline} strokeWidth={sw} />

        {/* ---- body ---- */}
        <ellipse cx={100} cy={118} rx={p.bodyW} ry={p.bodyH} fill={p.bodyFill} stroke={p.outline} strokeWidth={sw} />

        {/* belly patch */}
        <ellipse cx={100} cy={140} rx={p.bodyW * 0.52} ry={p.bodyH * 0.5} fill={p.belly} />

        {/* seeded markings — quiet, constant per team */}
        {p.markings.map((m, i) => (
          <circle key={i} cx={m.x} cy={m.y} r={m.r} fill={rgba(p.outline, 0.12)} />
        ))}

        {/* cheeks */}
        {mood !== 'blue' && (
          <>
            <ellipse cx={100 - p.eyeDx - 4} cy={p.faceY + 12} rx={mood === 'happy' || mood === 'cheering' ? 8 : 6} ry={4.4} fill={rgba(p.cheek, 0.55)} />
            <ellipse cx={100 + p.eyeDx + 4} cy={p.faceY + 12} rx={mood === 'happy' || mood === 'cheering' ? 8 : 6} ry={4.4} fill={rgba(p.cheek, 0.55)} />
          </>
        )}

        {/* face */}
        <Face mood={mood} eyeDx={p.eyeDx} faceY={p.faceY} rEye={p.rEye} ink={p.ink} outline={p.outline} animate={animate} bodyFill={p.bodyFill} />

        {/* motif crest — grows a touch with the bond */}
        <g transform={`translate(100, ${118 - p.bodyH - 6 + (level >= 4 ? 0 : 3)}) scale(${0.62 + Math.min(level, 7) * 0.05})`}>
          <Glyph id={glyph} fill={color} stroke={darken(color, 0.45)} sw={1.6} />
        </g>
      </g>
    </svg>
  )
}

/* --------------------------------- parts ---------------------------------- */

function Ears({ type, dx, fill, stroke, sw }: { type: EarType; dx: number; fill: string; stroke: string; sw: number }) {
  if (type === 'none') return null
  const y = 66
  const left = 100 - dx
  const right = 100 + dx
  if (type === 'round') {
    return (
      <>
        <circle cx={left} cy={y} r={15} fill={fill} stroke={stroke} strokeWidth={sw} />
        <circle cx={right} cy={y} r={15} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>
    )
  }
  if (type === 'pointed') {
    return (
      <>
        <path d={`M${left - 13},${y + 8} L${left - 2},${y - 22} L${left + 11},${y + 6} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d={`M${right - 11},${y + 6} L${right + 2},${y - 22} L${right + 13},${y + 8} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </>
    )
  }
  // tuft — small soft rounded bumps
  return (
    <>
      <ellipse cx={left} cy={y - 4} rx={9} ry={13} fill={fill} stroke={stroke} strokeWidth={sw} />
      <ellipse cx={right} cy={y - 4} rx={9} ry={13} fill={fill} stroke={stroke} strokeWidth={sw} />
    </>
  )
}

function Arms({ raised, fill, stroke, sw, bodyW }: { raised: boolean; fill: string; stroke: string; sw: number; bodyW: number }) {
  const x = bodyW - 4
  if (raised) {
    return (
      <>
        <ellipse cx={100 - x} cy={96} rx={9} ry={15} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(28 ${100 - x} 96)`} />
        <ellipse cx={100 + x} cy={96} rx={9} ry={15} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(-28 ${100 + x} 96)`} />
      </>
    )
  }
  return (
    <>
      <ellipse cx={100 - x} cy={134} rx={9} ry={15} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(12 ${100 - x} 134)`} />
      <ellipse cx={100 + x} cy={134} rx={9} ry={15} fill={fill} stroke={stroke} strokeWidth={sw} transform={`rotate(-12 ${100 + x} 134)`} />
    </>
  )
}

function Face({
  mood,
  eyeDx,
  faceY,
  rEye,
  ink,
  outline,
  animate,
  bodyFill,
}: {
  mood: Mood
  eyeDx: number
  faceY: number
  rEye: number
  ink: string
  outline: string
  animate: boolean
  bodyFill: string
}) {
  const lx = 100 - eyeDx
  const rx = 100 + eyeDx
  const ey = faceY

  // Happy & calm use gentle closed arcs; the rest use round eyes that can blink.
  const arcEyes = mood === 'happy' || mood === 'calm'
  const blink = animate && !arcEyes

  function RoundEye({ x }: { x: number }) {
    const r = mood === 'cheering' ? rEye * 1.12 : rEye
    const pupilDy = mood === 'blue' ? r * 0.45 : 0
    return (
      <g>
        <circle cx={x} cy={ey + pupilDy} r={r} fill={ink} />
        <circle cx={x - r * 0.35} cy={ey - r * 0.35 + pupilDy} r={r * 0.32} fill="#fff" />
        {mood === 'blue' && (
          // a soft drooping upper lid in body color
          <path d={`M${x - r - 1},${ey - 1} Q${x},${ey - r - 2} ${x + r + 1},${ey - 1}`} fill="none" stroke={bodyFill} strokeWidth={r * 1.1} strokeLinecap="round" />
        )}
      </g>
    )
  }

  return (
    <g>
      <g
        className={blink ? (animate ? 'animate-blink' : undefined) : undefined}
        style={blink ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
      >
        {arcEyes ? (
          <>
            <ArcEye x={lx} y={ey} r={rEye} stroke={ink} happy={mood === 'happy'} />
            <ArcEye x={rx} y={ey} r={rEye} stroke={ink} happy={mood === 'happy'} />
          </>
        ) : (
          <>
            <RoundEye x={lx} />
            <RoundEye x={rx} />
          </>
        )}
      </g>
      <Mouth mood={mood} y={ey + 20} ink={ink} outline={outline} />
    </g>
  )
}

function ArcEye({ x, y, r, stroke, happy }: { x: number; y: number; r: number; stroke: string; happy: boolean }) {
  // happy: a higher curve (∩); calm: a shallower, serene curve.
  const lift = happy ? r * 1.5 : r * 0.7
  return <path d={`M${x - r},${y + 1} Q${x},${y - lift} ${x + r},${y + 1}`} fill="none" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" />
}

function Mouth({ mood, y, ink, outline }: { mood: Mood; y: number; ink: string; outline: string }) {
  if (mood === 'cheering') {
    return <ellipse cx={100} cy={y + 1} rx={7} ry={9} fill={darken(outline, 0.1)} />
  }
  if (mood === 'happy') {
    return <path d={`M${100 - 11},${y - 2} Q100,${y + 10} ${100 + 11},${y - 2}`} fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
  }
  if (mood === 'blue') {
    return <path d={`M${100 - 7},${y + 3} Q100,${y - 2} ${100 + 7},${y + 3}`} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
  }
  if (mood === 'new') {
    return <ellipse cx={100} cy={y} rx={2.6} ry={3} fill={darken(outline, 0.1)} />
  }
  // calm
  return <path d={`M${100 - 7},${y} Q100,${y + 6} ${100 + 7},${y}`} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
}

/* -------------------------------- params ---------------------------------- */

interface Params {
  bodyW: number
  bodyH: number
  earDx: number
  footDx: number
  eyeDx: number
  rEye: number
  faceY: number
  ear: EarType
  bodyFill: string
  belly: string
  outline: string
  cheek: string
  ink: string
  markings: Array<{ x: number; y: number; r: number }>
}

function buildParams(code: string, color: string, color2: string, level: number): Params {
  const rng = rngFromString(code + '·mascot')

  const bodyW = rng.range(58, 68)
  const bodyH = rng.range(64, 76)
  const ear = rng.pick(EAR_TYPES)

  // Warmth of color grows with the bond: low bond reads slightly muted.
  const mute = (1 - (Math.min(level, 7) - 1) / 6) * 0.26
  const bodyBase = mixHex(color, '#ffffff', 0.34)
  const bodyFill = mixHex(bodyBase, '#cbcbc3', mute)

  const markCount = rng.int(2, 4)
  const markings = Array.from({ length: markCount }, () => ({
    x: 100 + rng.range(-bodyW * 0.5, bodyW * 0.5),
    y: 118 + rng.range(-bodyH * 0.2, bodyH * 0.55),
    r: rng.range(3, 6),
  }))

  return {
    bodyW,
    bodyH,
    earDx: rng.range(28, 36),
    footDx: rng.range(20, 26),
    eyeDx: rng.range(19, 25),
    rEye: rng.range(7, 8.6),
    faceY: 100 + rng.range(-3, 4),
    ear,
    bodyFill,
    belly: lighten(color, 0.66),
    outline: darken(color, 0.5),
    cheek: mixHex(color2, '#ff9a8a', 0.35),
    ink: '#23231f',
    markings,
  }
}
