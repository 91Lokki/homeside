import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BRACKET } from '@/data/bracket'
import type { TeamCode } from '@/domain/types'
import { buildPredictedBracket, type Predictions } from '@/domain/predict'
import { playerKey, type FantasyPick, type RoundSquad, type Round, type Slot } from '@/domain/fantasy'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/auth'

const PRED_KEY = 'homeside.predictions'
const FANT_KEY = 'homeside.fantasy.v2'
const TEAM_KEY = 'homeside.team'
const SYNC_DEBOUNCE_MS = 800

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
  const { user, displayName } = useAuth()
  const [predictions, setPredictions] = useState<Predictions>(() => load(PRED_KEY, {}))
  const [fantasy, setFantasy] = useState<FantasyRounds>(() => load(FANT_KEY, {}))

  // localStorage stays the source of truth offline, and a local cache when signed
  // in — these always run, so the app is unchanged for signed-out users.
  useEffect(() => safeSet(PRED_KEY, JSON.stringify(predictions)), [predictions])
  useEffect(() => safeSet(FANT_KEY, JSON.stringify(fantasy)), [fantasy])

  /* ----------------------------- cloud sync ------------------------------- */
  // Snapshot of what's already on the server, so we never re-upsert unchanged
  // data (including the echo right after hydrating from the server).
  const lastSyncedRef = useRef<string | null>(null)
  const hydratedUserRef = useRef<string | null>(null)
  const userId = user?.id ?? null

  // On sign-in: server row wins if it exists (mirror it down); otherwise this is
  // a first login, so push whatever is in localStorage up to seed the row.
  useEffect(() => {
    if (!supabase || !userId || !user) {
      hydratedUserRef.current = null
      lastSyncedRef.current = null
      return
    }
    if (hydratedUserRef.current === userId) return
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase
        .from('picks')
        .select('predictions, fantasy')
        .eq('user_id', userId)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[sync] load failed:', error.message)
        return
      }
      if (data) {
        const p = (data.predictions as Predictions) ?? {}
        const f = (data.fantasy as FantasyRounds) ?? {}
        setPredictions(p)
        setFantasy(f)
        lastSyncedRef.current = JSON.stringify({ predictions: p, fantasy: f })
      } else {
        // No server row yet — seed it from the current local state.
        const seed = { predictions, fantasy }
        const { error: upErr } = await supabase.from('picks').upsert({
          user_id: userId,
          email: user.email,
          display_name: displayName,
          predictions: seed.predictions,
          fantasy: seed.fantasy,
          home_code: localStorage.getItem(TEAM_KEY),
        })
        if (!cancelled && !upErr) lastSyncedRef.current = JSON.stringify(seed)
        else if (upErr) {
          // eslint-disable-next-line no-console
          console.warn('[sync] seed failed:', upErr.message)
        }
      }
      if (!cancelled) hydratedUserRef.current = userId
    })()
    return () => {
      cancelled = true
    }
    // Intentionally keyed only on the user — predictions/fantasy are read as the
    // first-login seed, not as triggers (the upsert effect handles edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user])

  // Debounced upsert: whenever picks change after the initial hydrate, push them.
  useEffect(() => {
    if (!supabase || !userId || !user) return
    if (hydratedUserRef.current !== userId) return // wait for hydrate to finish
    const snap = JSON.stringify({ predictions, fantasy })
    if (snap === lastSyncedRef.current) return // nothing actually changed
    const t = window.setTimeout(() => {
      void supabase!
        .from('picks')
        .upsert({
          user_id: userId,
          email: user.email,
          display_name: displayName,
          predictions,
          fantasy,
          home_code: localStorage.getItem(TEAM_KEY),
        })
        .then(({ error }) => {
          if (error) {
            // eslint-disable-next-line no-console
            console.warn('[sync] save failed:', error.message)
          } else {
            lastSyncedRef.current = snap
          }
        })
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [predictions, fantasy, userId, user, displayName])

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
