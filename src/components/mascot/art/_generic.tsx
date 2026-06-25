import { rgba, rngFromString } from '@/lib/prng'
import { Glyph, resolveGlyph } from '../glyphs'
import { Face } from '../faces'
import type { MascotArt } from '../types'

/**
 * Fallback character for any team without a hand-authored mascot yet. A calm,
 * rounded creature seeded from the team code, with the national-symbol crest.
 * Bespoke per-team art in this folder takes precedence (see ./index.ts).
 */
export const GENERIC: MascotArt = ({ palette, mood, code, symbol }) => {
  const rng = rngFromString(code + '·generic')
  const bodyW = rng.range(56, 66)
  const bodyH = rng.range(62, 74)
  const ear = rng.pick(['round', 'tuft', 'none'] as const)
  const earDx = rng.range(28, 34)
  const glyph = resolveGlyph(symbol ?? 'leaf')
  const sw = 3.4

  return (
    <g>
      {/* ears (behind body) */}
      {ear === 'round' && (
        <>
          <circle cx={100 - earDx} cy={66} r={14} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
          <circle cx={100 + earDx} cy={66} r={14} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
        </>
      )}
      {ear === 'tuft' && (
        <>
          <ellipse cx={100 - earDx} cy={62} rx={9} ry={13} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
          <ellipse cx={100 + earDx} cy={62} rx={9} ry={13} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
        </>
      )}

      {/* feet */}
      <ellipse cx={100 - 22} cy={190} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100 + 22} cy={190} rx={11} ry={7.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* body */}
      <ellipse cx={100} cy={120} rx={bodyW} ry={bodyH} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={100} cy={140} rx={bodyW * 0.52} ry={bodyH * 0.5} fill={palette.belly} />

      {/* face */}
      <Face mood={mood} cx={100} cy={104} w={38} ink={palette.ink} />

      {/* national-symbol crest */}
      <g transform={`translate(100, ${120 - bodyH - 2}) scale(0.8)`}>
        <Glyph id={glyph} fill={palette.color} stroke={palette.outline} sw={1.6} />
      </g>

      {/* a quiet marking in the secondary color */}
      <circle cx={100 + bodyW * 0.3} cy={140} r={5} fill={rgba(palette.color2, 0.4)} />
    </g>
  )
}
