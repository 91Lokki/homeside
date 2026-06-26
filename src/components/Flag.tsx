import { isoForCode } from '@/data/flags'
import { teamByCode } from '@/data/teams'
import { cn } from '@/lib/utils'

/** A rounded country flag for a team code, with a team-colour fallback. */
export function Flag({ code, size = 30, className }: { code?: string | null; size?: number; className?: string }) {
  const iso = isoForCode(code)
  if (!iso) {
    const t = code ? teamByCode[code] : null
    return (
      <span
        className={cn('inline-grid place-items-center rounded-full font-grotesk text-[9px] font-bold', className)}
        style={{ width: size, height: size, background: t?.color ?? 'rgba(255,255,255,0.12)', color: t?.color2 ?? '#fff' }}
        aria-label={code ?? undefined}
      >
        {code ?? '—'}
      </span>
    )
  }
  return (
    <span
      className={cn(`fi fi-${iso} fis`, className)}
      style={{ width: size, height: size, borderRadius: '50%', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' }}
      role="img"
      aria-label={code ?? ''}
    />
  )
}
