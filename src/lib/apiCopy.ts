import type { ApiStatus } from './api'

/**
 * Honest, user-facing explanation of why live match data isn't showing — so the
 * UI never blames a missing key when the real reason is the daily rate limit.
 */
export function liveDataNote(status: ApiStatus): string {
  switch (status) {
    case 'rate-limited':
      return 'Live data is rate-limited right now — the free feed allows only 100 requests a day. It fills in automatically once the daily limit resets.'
    case 'error':
      return 'The live data feed is temporarily unavailable. It will fill in automatically once the feed is back.'
    case 'no-key':
      return 'Live data isn’t connected yet — goals, possession and shots appear here once it is.'
    case 'ok':
      return 'This match isn’t in the live data feed yet.'
  }
}
