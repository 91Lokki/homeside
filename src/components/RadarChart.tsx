import { AXIS_LABEL, type AxisKey, type Ratings } from '@/domain/ratings'
import { rgba } from '@/lib/prng'
import { cn } from '@/lib/utils'

const ORDER: AxisKey[] = ['attack', 'finishing', 'possession', 'defense', 'creativity', 'discipline']
const SIZE = 260
const C = SIZE / 2
const R = 96

function point(i: number, value: number) {
  const angle = (-90 + i * 60) * (Math.PI / 180)
  const r = (value / 100) * R
  return [C + Math.cos(angle) * r, C + Math.sin(angle) * r] as const
}

/** Hexagonal radar from REAL aggregated stats. Null axes render at 0 with a dot. */
export function RadarChart({ ratings, color, className }: { ratings: Ratings; color: string; className?: string }) {
  const valuePts = ORDER.map((k, i) => point(i, ratings.axes[k] ?? 0))
  const valuePath = valuePts.map((p) => p.join(',')).join(' ')

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn('h-auto w-full max-w-[320px]', className)} role="img" aria-label="Ability radar">
      {/* rings */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={ORDER.map((_, i) => point(i, f * 100).join(',')).join(' ')}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {ORDER.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--hairline)" strokeWidth={1} />
      })}
      {/* value polygon */}
      <polygon points={valuePath} fill={rgba(color, 0.22)} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {ORDER.map((k, i) => {
        const v = ratings.axes[k]
        const [x, y] = point(i, v ?? 0)
        return <circle key={k} cx={x} cy={y} r={3} fill={v == null ? 'var(--faint)' : color} />
      })}
      {/* axis labels */}
      {ORDER.map((k, i) => {
        const [x, y] = point(i, 122)
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted text-[10px] font-medium uppercase"
            style={{ letterSpacing: '0.04em' }}
          >
            {AXIS_LABEL[k]}
          </text>
        )
      })}
    </svg>
  )
}
