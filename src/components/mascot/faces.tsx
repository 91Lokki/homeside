import type { Mood } from '@/domain/mood'
import { rgba } from '@/lib/prng'

/**
 * Shared expression kit. Every mascot draws its own distinct body, then places a
 * <Face/> so moods read consistently across all teams:
 *   new   — curious, round eyes + tiny mouth
 *   happy — arc "^_^" eyes + open smile
 *   calm  — soft eyes + gentle smile
 *   blue  — drooping eyes + small frown
 */
export function Face({
  mood,
  cx,
  cy,
  w = 34,
  eyeR = 8,
  ink = '#23231f',
  animate = true,
  blush = true,
  showMouth = true,
}: {
  mood: Mood
  cx: number
  cy: number
  /** distance between the two eyes */
  w?: number
  eyeR?: number
  ink?: string
  animate?: boolean
  blush?: boolean
  /** set false when the body's own form (a beak, a snout) is the mouth */
  showMouth?: boolean
}) {
  const lx = cx - w / 2
  const rx = cx + w / 2
  const mouthY = cy + eyeR + 12
  const arcEyes = mood === 'happy' || mood === 'calm'
  const canBlink = animate && !arcEyes

  return (
    <g>
      {blush && mood !== 'blue' && (
        <>
          <ellipse cx={lx - eyeR} cy={cy + eyeR + 1} rx={mood === 'happy' ? 7 : 5.5} ry={3.8} fill={rgba('#ff7a6b', 0.32)} />
          <ellipse cx={rx + eyeR} cy={cy + eyeR + 1} rx={mood === 'happy' ? 7 : 5.5} ry={3.8} fill={rgba('#ff7a6b', 0.32)} />
        </>
      )}

      <g
        className={canBlink ? 'animate-blink' : undefined}
        style={canBlink ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
      >
        {arcEyes ? (
          <>
            <ArcEye x={lx} y={cy} r={eyeR} stroke={ink} happy={mood === 'happy'} />
            <ArcEye x={rx} y={cy} r={eyeR} stroke={ink} happy={mood === 'happy'} />
          </>
        ) : (
          <>
            <RoundEye x={lx} y={cy} r={eyeR} ink={ink} blue={mood === 'blue'} />
            <RoundEye x={rx} y={cy} r={eyeR} ink={ink} blue={mood === 'blue'} />
          </>
        )}
      </g>

      {showMouth && <Mouth mood={mood} cx={cx} y={mouthY} ink={ink} />}
    </g>
  )
}

function RoundEye({ x, y, r, ink, blue }: { x: number; y: number; r: number; ink: string; blue: boolean }) {
  const dy = blue ? r * 0.4 : 0
  return (
    <g>
      <circle cx={x} cy={y + dy} r={r} fill={ink} />
      <circle cx={x - r * 0.35} cy={y - r * 0.35 + dy} r={r * 0.32} fill="#fff" />
      {blue && <path d={`M${x - r - 1},${y - 1} Q${x},${y - r - 2} ${x + r + 1},${y - 1}`} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" opacity={0.5} />}
    </g>
  )
}

function ArcEye({ x, y, r, stroke, happy }: { x: number; y: number; r: number; stroke: string; happy: boolean }) {
  const lift = happy ? r * 1.5 : r * 0.7
  return <path d={`M${x - r},${y + 1} Q${x},${y - lift} ${x + r},${y + 1}`} fill="none" stroke={stroke} strokeWidth={3.2} strokeLinecap="round" />
}

function Mouth({ mood, cx, y, ink }: { mood: Mood; cx: number; y: number; ink: string }) {
  if (mood === 'happy') {
    return <path d={`M${cx - 11},${y - 2} Q${cx},${y + 10} ${cx + 11},${y - 2}`} fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
  }
  if (mood === 'blue') {
    return <path d={`M${cx - 7},${y + 3} Q${cx},${y - 2} ${cx + 7},${y + 3}`} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
  }
  if (mood === 'new') {
    return <ellipse cx={cx} cy={y} rx={2.6} ry={3} fill={ink} />
  }
  return <path d={`M${cx - 7},${y} Q${cx},${y + 6} ${cx + 7},${y}`} fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
}
