import { useMemo } from 'react'
import type { Mood } from '@/domain/bond'
import { rgba } from '@/lib/prng'
import { clamp, cn } from '@/lib/utils'
import { GENERIC, MASCOT_ART } from './art'
import { buildPalette } from './types'

export interface MascotProps {
  /** Team code — selects the bespoke character (or the generic fallback). */
  code: string
  color: string
  color2?: string
  symbol?: string
  /** Bond level 1..7 — drives gentle growth (size) + a soft aura at deep bond. */
  level?: number
  mood?: Mood
  size?: number
  animate?: boolean
  className?: string
  title?: string
}

/**
 * The mascot frame. It builds the flat palette from the team color, applies
 * gentle growth (scale) + a soft aura with the bond, a breathing idle, and a
 * contact oval — then renders that team's hand-authored character.
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
  const palette = useMemo(() => buildPalette(color, color2 ?? color), [color, color2])
  const art = MASCOT_ART[code] ?? GENERIC
  const lvl = clamp(level, 1, 7)
  const growth = 0.84 + ((lvl - 1) / 6) * 0.16
  const settle = mood === 'blue' ? 6 : 0
  const tilt = mood === 'new' ? -3 : 0
  const showAura = lvl >= 5

  return (
    <svg
      viewBox="0 0 200 224"
      width={size}
      height={(size * 224) / 200}
      role="img"
      aria-label={title ?? `${code} mascot`}
      className={cn('h-auto max-w-full select-none overflow-visible', className)}
    >
      {showAura && (
        <g className={animate ? 'animate-breathe' : undefined} style={{ transformOrigin: '100px 116px' }}>
          <circle cx={100} cy={112} r={92} fill="none" stroke={rgba(color, lvl >= 7 ? 0.16 : 0.1)} strokeWidth={2} />
          {lvl >= 7 && <circle cx={100} cy={112} r={104} fill="none" stroke={rgba(color, 0.07)} strokeWidth={2} />}
        </g>
      )}

      {/* flat contact oval — grounds the creature without a drop shadow */}
      <ellipse cx={100} cy={206} rx={52} ry={9} fill={rgba('#1a1a17', 0.06)} />

      <g
        className={animate ? 'animate-breathe' : undefined}
        style={{ transformOrigin: '100px 200px', transform: `translateY(${settle}px) rotate(${tilt}deg) scale(${growth})` }}
      >
        {art({ palette, mood, level: lvl, code, symbol })}
      </g>
    </svg>
  )
}
