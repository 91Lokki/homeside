/** Local-time formatting. Everything is stored in UTC; the user sees their tz. */

const dayFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const fullFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function localDay(iso: string): string {
  return dayFmt.format(new Date(iso))
}

export function localTime(iso: string): string {
  return timeFmt.format(new Date(iso))
}

export function localFull(iso: string): string {
  return fullFmt.format(new Date(iso))
}

/** A short key like "2026-06-14" in the user's local tz, for grouping by day. */
export function localDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** The user's IANA timezone name, e.g. "Asia/Taipei". */
export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'local time'
  }
}

/**
 * A calm relative phrase for an upcoming kickoff: "in 3 days", "tomorrow",
 * "in 2 hours". `now` is injectable for testing/determinism.
 */
export function relativeKickoff(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime()
  const diff = then - now.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 0) return 'underway'
  if (mins < 60) return `in ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `in ${hours} hr${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  if (days === 1) return 'tomorrow'
  if (days < 14) return `in ${days} days`
  const weeks = Math.round(days / 7)
  return `in ${weeks} weeks`
}
