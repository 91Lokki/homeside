import { Face } from '../faces'
import type { MascotArt } from '../types'

/** Canada — a calm maple-leaf sprite: a soft five-lobed leaf is the whole body. */
export const CAN: MascotArt = ({ palette, mood }) => {
  const sw = 3.4
  return (
    <g>
      {/* little feet (behind the stem) */}
      <ellipse cx={87} cy={190} rx={9.5} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />
      <ellipse cx={113} cy={190} rx={9.5} ry={6.5} fill={palette.body} stroke={palette.outline} strokeWidth={sw} />

      {/* slim stem — tucks up under the leaf and reaches down to the ground */}
      <path d="M96,150 L96,184 Q100,189 104,184 L104,150 Z" fill={palette.color2} stroke={palette.outline} strokeWidth={sw} strokeLinejoin="round" />

      {/* maple-leaf body — five broad rounded lobes (the signature silhouette) */}
      <path
        d="M100,44
           Q106,62 104,76
           Q116,66 121,54
           Q126,64 121,78
           Q138,72 152,72
           Q146,86 132,92
           Q150,98 160,112
           Q142,116 126,112
           Q132,130 130,148
           Q116,140 100,150
           Q84,140 70,148
           Q68,130 74,112
           Q58,116 40,112
           Q50,98 68,92
           Q54,86 48,72
           Q62,72 79,78
           Q74,64 79,54
           Q84,66 96,76
           Q94,62 100,44 Z"
        fill={palette.color}
        stroke={palette.outline}
        strokeWidth={sw}
        strokeLinejoin="round"
      />

      {/* soft inner panel where the face rests */}
      <ellipse cx={100} cy={106} rx={29} ry={30} fill={palette.belly} />

      {/* gentle central vein hint */}
      <path d="M100,150 Q100,126 100,92" fill="none" stroke={palette.outline} strokeWidth={1.6} opacity={0.32} />

      {/* face on the leaf */}
      <Face mood={mood} cx={100} cy={104} w={32} ink={palette.ink} />
    </g>
  )
}