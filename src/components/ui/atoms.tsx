import type { ReactNode } from 'react'
import type { Result } from '@/domain/record'
import { cn } from '@/lib/utils'

/** Uppercase micro-label. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('label', className)}>{children}</span>
}

/** A small pulsing live indicator. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-team opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-team" />
    </span>
  )
}

/** Recent form as small neutral cells; the home team's wins glow in its color. */
export function FormDots({ form, accent = false }: { form: Result[]; accent?: boolean }) {
  if (!form.length) return <span className="text-faint text-2xs">—</span>
  return (
    <span className="inline-flex gap-1 tnum" aria-label={`Form: ${form.join(' ')}`}>
      {form.slice(-5).map((r, i) => (
        <span
          key={i}
          className={cn(
            'grid h-4 w-4 place-items-center rounded-[5px] text-[9px] font-semibold',
            r === 'W' && accent && 'bg-team-soft text-team',
            r === 'W' && !accent && 'bg-sunken text-ink',
            r === 'D' && 'border text-muted',
            r === 'L' && 'text-faint',
          )}
        >
          {r}
        </span>
      ))}
    </span>
  )
}

/** A labelled stat block. */
export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label>{label}</Label>
      <span className="font-grotesk text-2xl font-medium tnum leading-none">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

/** A neutral hairline divider. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-hairline', className)} />
}

/** A small score chip. */
export function Score({ home, away, live = false }: { home: number | null; away: number | null; live?: boolean }) {
  const blank = home == null || away == null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[8px] px-2 py-0.5 font-grotesk text-sm font-semibold tnum',
        live ? 'bg-team-soft text-team' : 'bg-sunken text-ink',
      )}
    >
      {blank ? <span className="text-faint">vs</span> : <>{home}<span className="text-faint">–</span>{away}</>}
    </span>
  )
}
