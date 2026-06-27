import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BRACKET } from '@/data/bracket'
import type { TeamCode } from '@/domain/types'
import { buildPredictedBracket, type Predictions } from '@/domain/predict'
import { playerKey, type FantasyPick, type RoundSquad, type Round, type Slot } from '@/domain/fantasy'

const PRED_KEY = 'homeside.predictions'
const FANT_KEY = 'homeside.fantasy.v2'

type FantasyRounds = Partial<Record<Round, RoundSquad>>

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

/** Drop downstream predictions made stale by an upstream change (see Predict). */
function pruneStale(preds: Predictions): Predictions {
  const next = { ...preds }
  for (let guard = 0; guard < 8; guard++) {
    const occ = buildPredictedBracket(BRACKET, [], next)
    let changed = false
    for (const m of BRACKET) {
      if (m.stage === 'R32') continue
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

const emptySquad = (): RoundSquad => ({ players: [], captain: null, vice: null })

interface GamesCtx {
  predictions: Predictions
  setPrediction: (matchNo: number, code: TeamCode) => void
  clearPredictions: () => void

  fantasy: FantasyRounds
  setRoundPick: (round: Round, slot: Slot, pick: FantasyPick | null) => void
  seedRound: (round: Round, players: FantasyPick[]) => void
  setRoundSquad: (round: Round, squad: RoundSquad) => void
  setCaptain: (round: Round, key: string) => void
  setVice: (round: Round, key: string) => void
  resetFantasy: () => void
}

const Ctx = createContext<GamesCtx | null>(null)

export function GamesProvider({ children }: { children: ReactNode }) {
  const [predictions, setPredictions] = useState<Predictions>(() => load(PRED_KEY, {}))
  const [fantasy, setFantasy] = useState<FantasyRounds>(() => load(FANT_KEY, {}))

  useEffect(() => safeSet(PRED_KEY, JSON.stringify(predictions)), [predictions])
  useEffect(() => safeSet(FANT_KEY, JSON.stringify(fantasy)), [fantasy])

  const setPrediction = useCallback((matchNo: number, code: TeamCode) => {
    setPredictions((p) => pruneStale({ ...p, [matchNo]: code }))
  }, [])
  const clearPredictions = useCallback(() => setPredictions({}), [])

  const setRoundPick = useCallback((round: Round, slot: Slot, pick: FantasyPick | null) => {
    setFantasy((fr) => {
      const cur = fr[round] ?? emptySquad()
      const removed = cur.players.find((p) => p.slot === slot)
      const players = cur.players.filter((p) => p.slot !== slot)
      if (pick) players.push(pick)
      let { captain, vice } = cur
      if (removed) {
        const k = playerKey(removed)
        if (captain === k) captain = null
        if (vice === k) vice = null
      }
      return { ...fr, [round]: { players, captain, vice } }
    })
  }, [])

  const seedRound = useCallback((round: Round, players: FantasyPick[]) => {
    setFantasy((fr) => {
      if (fr[round]) return fr
      return { ...fr, [round]: { players: players.map((p) => ({ ...p })), captain: null, vice: null } }
    })
  }, [])

  /** Replace a round's whole squad in one write (used to commit a transfer draft). */
  const setRoundSquad = useCallback((round: Round, squad: RoundSquad) => {
    setFantasy((fr) => ({
      ...fr,
      [round]: { players: squad.players.map((p) => ({ ...p })), captain: squad.captain, vice: squad.vice },
    }))
  }, [])

  const setCaptain = useCallback((round: Round, key: string) => {
    setFantasy((fr) => {
      const cur = fr[round]
      if (!cur) return fr
      const vice = cur.vice === key ? null : cur.vice
      return { ...fr, [round]: { ...cur, captain: key, vice } }
    })
  }, [])

  const setVice = useCallback((round: Round, key: string) => {
    setFantasy((fr) => {
      const cur = fr[round]
      if (!cur || cur.captain === key) return fr
      return { ...fr, [round]: { ...cur, vice: key } }
    })
  }, [])

  const resetFantasy = useCallback(() => setFantasy({}), [])

  const value = useMemo<GamesCtx>(
    () => ({ predictions, setPrediction, clearPredictions, fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain, setVice, resetFantasy }),
    [predictions, setPrediction, clearPredictions, fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain, setVice, resetFantasy],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGames() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGames must be used within GamesProvider')
  return v
}
