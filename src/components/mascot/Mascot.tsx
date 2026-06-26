import { useMemo } from 'react'
import type { Mood } from '@/domain/mood'
import { rgba } from '@/lib/prng'
import { cn } from '@/lib/utils'
import { GENERIC, MASCOT_ART } from './art'
import { buildPalette } from './types'

export interface MascotProps {
  /** Team code — selects the bespoke character (or the generic fallback). */
  code: string
  color: string
  color2?: string
  symbol?: string
  mood?: Mood
  size?: number
  animate?: boolean
  className?: string
  title?: string
}

/**
 * The mascot frame — now a small accent (the bond/leveling system is gone). It
 * builds the flat palette from the team color, gives a breathing idle + a gentle
 * mood-based settle, and renders that team's hand-authored character.
 */
export function Mascot({ code, color, color2, symbol, mood = 'calm', size = 160, animate = true, className, title }: MascotProps) {
  const palette = useMemo(() => buildPalette(color, color2 ?? color), [color, color2])
  const art = MASCOT_ART[code] ?? GENERIC
  const settle = mood === 'blue' ? 6 : 0
  const tilt = mood === 'new' ? -3 : 0

  return (
    <svg
      viewBox="0 0 200 224"
      width={size}
      height={(size * 224) / 200}
      role="img"
      aria-label={title ?? `${code} mascot`}
      className={cn('h-auto max-w-full select-none overflow-visible', className)}
    >
      {/* flat contact oval — grounds the creature without a drop shadow */}
      <ellipse cx={100} cy={206} rx={52} ry={9} fill={rgba('#1a1a17', 0.06)} />

      <g
        className={animate ? 'animate-breathe' : undefined}
        style={{ transformOrigin: '100px 200px', transform: `translateY(${settle}px) rotate(${tilt}deg)` }}
      >
        {art({ palette, mood, level: 1, code, symbol })}
      </g>
    </svg>
  )
}
