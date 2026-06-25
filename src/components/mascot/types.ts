import type { ReactNode } from 'react'
import type { Mood } from '@/domain/bond'
import { darken, lighten, mixHex } from '@/lib/prng'

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
  return {
    color,
    color2,
    body: mixHex(color, '#ffffff', 0.32),
    belly: lighten(color, 0.66),
    outline: darken(color, 0.5),
    ink: '#23231f',
  }
}
