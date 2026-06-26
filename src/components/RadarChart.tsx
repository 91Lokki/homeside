import { AXIS_LABEL, type AxisKey, type Ratings } from '@/domain/ratings'
import { cn } from '@/lib/utils'

const ORDER: AxisKey[] = ['attack', 'finishing', 'possession', 'defense', 'creativity', 'discipline']
const SIZE = 280
const C = SIZE / 2
const R = 100

function point(i: number, value: number) {
  const angle = (-90 + i * 60) * (Math.PI / 180)
  const r = (value / 100) * R
  return [C + Math.cos(angle) * r, C + Math.sin(angle) * r] as const
}

/** Hexagonal ability radar from REAL aggregated stats. Null axes render at 0. */
export function RadarChart({ ratings, color, className }: { ratings: Ratings; color: string; className?: string }) {
  const valuePts = ORDER.map((k, i) => point(i, ratings.axes[k] ?? 0))
  const valuePath = valuePts.map((p) => p.join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn('h-auto w-full max-w-[340px]', className)} role="img" aria-label="Ability radar">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <stop offset="100%" stopColor={color} stopOpacity={0.1} />
        </radialGradient>
      </defs>

      {/* concentric hex rings */}
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
        <polygon key={f} points={ORDER.map((_, i) => point(i, f * 100).join(',')).join(' ')} fill="none" stroke="var(--hairline)" strokeWidth={1} />
      ))}
      {/* spokes */}
      {ORDER.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />
      })}

      {/* value shape (animated pop-in) */}
      <g className="animate-radar" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <polygon points={valuePath} fill="url(#radarFill)" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        {ORDER.map((k, i) => {
          const v = ratings.axes[k]
          const [x, y] = point(i, v ?? 0)
          return (
            <g key={k}>
              <circle cx={x} cy={y} r={4.5} fill="var(--surface)" />
              <circle cx={x} cy={y} r={3} fill={v == null ? 'var(--faint)' : color} />
            </g>
          )
        })}
      </g>

      {/* axis labels */}
      {ORDER.map((k, i) => {
        const [x, y] = point(i, 124)
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-faint text-[9.5px] font-semibold uppercase"
            style={{ letterSpacing: '0.06em' }}
          >
            {AXIS_LABEL[k]}
          </text>
        )
      })}
    </svg>
  )
}
