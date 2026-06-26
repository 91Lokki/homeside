import { useEffect, useState } from 'react'
import { fetchMatchDetail, type MatchDetail } from './api'

/**
 * Shared, deduplicated access to finished-match box scores. The server already
 * hard-caches /api/match; this adds a session-level memo so the radar and the
 * fantasy scorer never refetch the same match, keeping us well under the cap.
 */
const cache = new Map<number, MatchDetail | null>()
const inflight = new Map<number, Promise<MatchDetail | null>>()

function load(id: number): Promise<MatchDetail | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id) ?? null)
  const existing = inflight.get(id)
  if (existing) return existing
  const p = fetchMatchDetail(id).then((d) => {
    cache.set(id, d)
    inflight.delete(id)
    return d
  })
  inflight.set(id, p)
  return p
}

export function useMatchDetails(ids: number[]): { details: Record<number, MatchDetail>; loading: boolean } {
  const key = ids.slice().sort((a, b) => a - b).join(',')
  const [state, setState] = useState<{ details: Record<number, MatchDetail>; loading: boolean }>(() => ({
    details: {},
    loading: ids.length > 0,
  }))

  useEffect(() => {
    let cancelled = false
    const list = key ? key.split(',').map(Number) : []
    if (list.length === 0) {
      setState({ details: {}, loading: false })
      return
    }
    setState((s) => ({ ...s, loading: true }))
    Promise.all(list.map(load)).then((results) => {
      if (cancelled) return
      const details: Record<number, MatchDetail> = {}
      list.forEach((id, i) => {
        const d = results[i]
        if (d) details[id] = d
      })
      setState({ details, loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return state
}
