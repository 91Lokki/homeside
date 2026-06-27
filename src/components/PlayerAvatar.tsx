import { useState } from 'react'
import { playerKey } from '@/domain/fantasy'
import { PLAYER_PHOTOS } from '@/data/playerPhotos'
import { cn } from '@/lib/utils'
import { Flag } from './Flag'

/**
 * A player's portrait (self-hosted, sourced from Transfermarkt) with a small
 * country-flag badge so nationality is still legible. Falls back to the plain
 * flag when there's no photo for this player — or if the asset fails to load.
 */
export function PlayerAvatar({
  teamCode,
  name,
  number,
  size = 46,
  className,
  flagBadge = true,
}: {
  teamCode: string
  name: string
  number?: number | null
  size?: number
  className?: string
  flagBadge?: boolean
}) {
  const [errored, setErrored] = useState(false)
  const src = PLAYER_PHOTOS[playerKey({ teamCode, name, number })]

  if (!src || errored) {
    return <Flag code={teamCode} size={size} className={className} />
  }

  const badge = Math.max(14, Math.round(size * 0.34))
  return (
    <span className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <img
        src={src}
        alt={name}
        loading="lazy"
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className="h-full w-full rounded-full bg-black/[0.06] object-cover object-top ring-1 ring-inset ring-black/[0.08] dark:bg-white/10 dark:ring-white/10"
      />
      {flagBadge && (
        <Flag
          code={teamCode}
          size={badge}
          className="absolute -bottom-0.5 -left-0.5 ring-2 ring-canvas"
        />
      )}
    </span>
  )
}
