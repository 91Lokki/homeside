import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Uzbekistan — Khumo, the mythical Huma bird of fortune: an upright, serene
 *  bird with a slender S-curved neck, a small upright feather crest, and broad
 *  sweeping open wings (the signature) lifting as if it never lands. */
export const UZB: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* fanned tail plumes (behind), drifting down to the side */}
      <path
        d="M104,160
           Q132,176 150,200
           Q140,200 130,194
           Q138,200 128,202
           Q120,196 116,188
           Q116,196 108,194
           Q104,182 100,176 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* slender perched legs */}
      <line x1={90} y1={176} x2={88} y2={196} stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <line x1={104} y1={176} x2={106} y2={196} stroke={palette.outline} strokeWidth={sw} strokeLinecap="round" />
      <ellipse cx={86} cy={197} rx={8} ry={4.2} fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />
      <ellipse cx={108} cy={197} rx={8} ry={4.2} fill={palette.color} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* far wing sweeping up behind (the signature — strong team color) */}
      <path
        d="M86,128
           Q44,118 30,82
           Q50,90 62,84
           Q44,80 38,60
           Q56,72 70,70
           Q60,58 62,46
           Q78,64 90,76 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* upright teardrop body (a distinct standing-bird silhouette, not a blob) */}
      <path
        d="M97,98
           Q120,100 126,128
           Q130,156 110,172
           Q97,178 84,172
           Q64,156 68,128
           Q74,100 97,98 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* soft breast */}
      <ellipse cx={97} cy={146} rx={20} ry={24} fill={palette.belly} />

      {/* near wing folded forward across the breast (signature, strong color) */}
      <path
        d="M112,118
           Q150,120 168,86
           Q148,94 136,88
           Q154,82 160,62
           Q142,74 128,72
           Q138,60 136,48
           Q120,68 108,84
           Q104,102 112,118 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* slender S-curved neck rising to the head */}
      <path
        d="M88,104
           Q78,86 86,72
           Q92,62 102,64
           Q108,72 104,82
           Q100,94 102,104 Z"
        fill={palette.body}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* head */}
      <circle cx={96} cy={58} r={22} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* small upright feather crest (Huma plume, secondary color) */}
      <path
        d="M92,40
           Q88,24 96,16
           Q98,28 102,34
           Q108,24 112,18
           Q112,32 108,40 Z"
        fill={palette.color2}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* small gentle beak (its own mouth, so Face hides its mouth) */}
      <path
        d="M76,58 Q60,60 62,66 Q72,68 80,64 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* eyes only — the beak is the mouth */}
      <Face mood={mood} cx={98} cy={54} w={20} eyeR={7} ink={palette.ink} showMouth={false} />
    </g>
  )
}
