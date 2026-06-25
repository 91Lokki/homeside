import type { ReactNode } from 'react'
import type { Mood } from '@/domain/bond'
import { darken, lighten, luminance, mixHex } from '@/lib/prng'
import { clamp } from '@/lib/utils'

/** Flat palette derived from a team's true colors (no gradients). */
export interface MascotPalette {
  /** The strong team color — use for the signature accent (beak, sun, bloom…). */
  color: string
  /** Secondary color — use sparingly. */
  color2: string
  /** Soft body fill (a gentle tint of the team color). */
  body: string
  /** Lighter belly / inner fill. */
  belly: string
  /** Line work (a darkened team color). */
  outline: string
  /** Eyes / facial ink. */
  ink: string
}

export interface MascotArtProps {
  palette: MascotPalette
  mood: Mood
  /** Bond level 1–7 (growth is handled by the frame; usually ignore this). */
  level: number
  /** Team code — the generic fallback uses it as a seed; bespoke art can ignore. */
  code: string
  /** Optional national-symbol keyword (the generic fallback uses it). */
  symbol?: string
}

/**
 * A team's hand-authored character. Returns SVG content drawn inside the frame's
 * `0 0 200 224` viewBox (ground ≈ y 206). Draw a DISTINCT body/form + national
 * motifs in flat fills from `palette`, and place a `<Face/>` for the mood.
 */
export type MascotArt = (p: MascotArtProps) => ReactNode

export function buildPalette(color: string, color2: string): MascotPalette {
  // Lighten the body more for very dark team colors so the silhouette stays
  // visible against the dark-mode canvas (a black-primary eagle shouldn't vanish).
  const whiteMix = clamp(0.3 + (0.5 - luminance(color)) * 0.5, 0.3, 0.6)
  return {
    color,
    color2,
    body: mixHex(color, '#ffffff', whiteMix),
    belly: lighten(color, 0.68),
    outline: darken(color, 0.45),
    ink: '#23231f',
  }
}
