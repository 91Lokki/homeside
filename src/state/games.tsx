import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BRACKET } from '@/data/bracket'
import type { TeamCode } from '@/domain/types'
import { buildPredictedBracket, type Predictions } from '@/domain/predict'
import type { FantasyTeam, FantasyPick, Slot } from '@/domain/fantasy'

const PRED_KEY = 'homeside.predictions'
const FANT_KEY = 'homeside.fantasy'
const LOCK_KEY = 'homeside.fantasyLocked'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode / quota — ignore */
  }
}

/**
 * Drop any downstream prediction that is no longer a valid occupant of its match
 * after an upstream change (the predicted winner that fed it has moved). Keeps the
 * stored bracket consistent with what the user sees; they re-pick the cleared ties.
 */
function pruneStale(preds: Predictions): Predictions {
  const next = { ...preds }
  for (let guard = 0; guard < 8; guard++) {
    const occ = buildPredictedBracket(BRACKET, [], next)
    let changed = false
    for (const m of BRACKET) {
      if (m.stage === 'R32') continue // group-derived occupants — picked directly from real teams
      const pick = next[m.matchNo]
      if (pick == null) continue
      const o = occ[m.matchNo]
      if (!o || (pick !== o.homeCode && pick !== o.awayCode)) {
        delete next[m.matchNo]
        changed = true
      }
    }
    if (!changed) break
  }
  return next
}

interface GamesCtx {
  predictions: Predictions
  setPrediction: (matchNo: number, code: TeamCode) => void
  clearPredictions: () => void

  fantasy: FantasyTeam
  fantasyLocked: boolean
  setFantasyPick: (slot: Slot, pick: FantasyPick | null) => void
  lockFantasy: () => void
  resetFantasy: () => void
}

const Ctx = createContext<GamesCtx | null>(null)

export function GamesProvider({ children }: { children: ReactNode }) {
  const [predictions, setPredictions] = useState<Predictions>(() => load(PRED_KEY, {}))
  const [fantasy, setFantasy] = useState<FantasyTeam>(() => load(FANT_KEY, {}))
  const [fantasyLocked, setFantasyLocked] = useState<boolean>(() => load(LOCK_KEY, false))

  useEffect(() => {
    safeSet(PRED_KEY, JSON.stringify(predictions))
  }, [predictions])
  useEffect(() => {
    safeSet(FANT_KEY, JSON.stringify(fantasy))
  }, [fantasy])
  useEffect(() => {
    safeSet(LOCK_KEY, JSON.stringify(fantasyLocked))
  }, [fantasyLocked])

  const setPrediction = useCallback((matchNo: number, code: TeamCode) => {
    setPredictions((p) => pruneStale({ ...p, [matchNo]: code }))
  }, [])
  const clearPredictions = useCallback(() => setPredictions({}), [])

  const setFantasyPick = useCallback((slot: Slot, pick: FantasyPick | null) => {
    setFantasy((f) => {
      const next = { ...f }
      if (pick) next[slot] = pick
      else delete next[slot]
      return next
    })
  }, [])
  const lockFantasy = useCallback(() => setFantasyLocked(true), [])
  const resetFantasy = useCallback(() => {
    setFantasy({})
    setFantasyLocked(false)
  }, [])

  const value = useMemo<GamesCtx>(
    () => ({ predictions, setPrediction, clearPredictions, fantasy, fantasyLocked, setFantasyPick, lockFantasy, resetFantasy }),
    [predictions, setPrediction, clearPredictions, fantasy, fantasyLocked, setFantasyPick, lockFantasy, resetFantasy],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGames() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGames must be used within GamesProvider')
  return v
}
