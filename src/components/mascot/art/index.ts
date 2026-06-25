import type { MascotArt } from '../types'
import { GENERIC } from './_generic'
import { ARG } from './ARG'
import { BRA } from './BRA'
import { NED } from './NED'

/**
 * Per-team hand-authored mascots. Any team not listed here falls back to GENERIC.
 * (More teams are added as their bespoke art lands.)
 */
export const MASCOT_ART: Record<string, MascotArt> = {
  ARG,
  BRA,
  NED,
}

export { GENERIC }
