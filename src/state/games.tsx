import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BRACKET } from '@/data/bracket'
import type { TeamCode } from '@/domain/types'
import { buildPredictedBracket, type Predictions } from '@/domain/predict'
import { playerKey, type FantasyPick, type RoundSquad, type Round, type Slot } from '@/domain/fantasy'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/state/auth'
import { useApp } from '@/state/store'

const PRED_KEY = 'homeside.predictions'
const PRED_LOCK_KEY = 'homeside.predictions.locked'
const FANT_KEY = 'homeside.fantasy.v2'
// Whose data the local cache currently holds, so switching accounts in the same
// browser never leaks the previous user's picks into a new account's row.
const OWNER_KEY = 'homeside.owner'
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

const emptySquad = (): RoundSquad => ({ players: [], captain: null })

interface GamesCtx {
  predictions: Predictions
  setPrediction: (matchNo: number, code: TeamCode) => void
  clearPredictions: () => void
  predictLocked: boolean
  lockPredictions: () => void

  fantasy: FantasyRounds
  setRoundPick: (round: Round, slot: Slot, pick: FantasyPick | null) => void
  seedRound: (round: Round, players: FantasyPick[]) => void
  setRoundSquad: (round: Round, squad: RoundSquad) => void
  setCaptain: (round: Round, key: string) => void
  resetFantasy: () => void
}

const Ctx = createContext<GamesCtx | null>(null)

export function GamesProvider({ children }: { children: ReactNode }) {
  const { user, displayName } = useAuth()
  const { homeCode, setHomeCode } = useApp()
  const [predictions, setPredictions] = useState<Predictions>(() => load(PRED_KEY, {}))
  const [fantasy, setFantasy] = useState<FantasyRounds>(() => load(FANT_KEY, {}))
  // Once a bracket is confirmed it can no longer be edited. Local-only (not
  // synced): a per-browser guard, reset on a fresh account hydrate / clear.
  const [predictLocked, setPredictLocked] = useState<boolean>(() => load(PRED_LOCK_KEY, false))

  // localStorage stays the source of truth offline, and a local cache when signed
  // in — these always run, so the app is unchanged for signed-out users.
  useEffect(() => safeSet(PRED_KEY, JSON.stringify(predictions)), [predictions])
  useEffect(() => safeSet(PRED_LOCK_KEY, JSON.stringify(predictLocked)), [predictLocked])
  useEffect(() => safeSet(FANT_KEY, JSON.stringify(fantasy)), [fantasy])

  /* ----------------------------- cloud sync ------------------------------- */
  // Snapshot of what's already on the server, so we never re-upsert unchanged
  // data (including the echo right after hydrating from the server).
  const lastSyncedRef = useRef<string | null>(null)
  const hydratedUserRef = useRef<string | null>(null)
  const userId = user?.id ?? null

  // The fingerprint of everything we sync, so we never re-upsert unchanged data
  // (including the echo right after hydrating) — and so a home-team change alone
  // still counts as a change worth saving.
  const snapOf = (p: Predictions, f: FantasyRounds, home: string | null, name: string | null) =>
    JSON.stringify({ predictions: p, fantasy: f, home: home ?? null, name: name ?? null })
  const readOwner = () => {
    try {
      return localStorage.getItem(OWNER_KEY)
    } catch {
      return null
    }
  }

  // On sign-in, reconcile this account with the cloud:
  //  • server row exists → it wins; mirror picks AND home team down.
  //  • no row, but local data belongs to a DIFFERENT account → start clean
  //    (never seed a new account from the previous user's picks/team).
  //  • no row, local is genuinely pre-login (or already ours) → migrate it up.
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
        .select('predictions, fantasy, home_code, display_name')
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
        const home = (data.home_code as string | null) ?? null
        setPredictions(p)
        setFantasy(f)
        setHomeCode(home)
        // The lock is local; on a genuine account switch don't carry the previous
        // user's lock over (same-user refresh keeps it).
        if (readOwner() && readOwner() !== userId) setPredictLocked(false)
        // Record the server's display_name so that if our live Google name differs
        // (e.g. the row predates name-sync), the upsert effect refreshes it.
        lastSyncedRef.current = snapOf(p, f, home, (data.display_name as string | null) ?? null)
      } else if (readOwner() && readOwner() !== userId) {
        // local cache belongs to a different account — wipe to a clean slate.
        setPredictions({})
        setFantasy({})
        setHomeCode(null)
        setPredictLocked(false)
        const { error: upErr } = await supabase
          .from('picks')
          .upsert({ user_id: userId, email: user.email, display_name: displayName, predictions: {}, fantasy: {}, home_code: null })
        if (!cancelled && !upErr) lastSyncedRef.current = snapOf({}, {}, null, displayName)
        else if (upErr) console.warn('[sync] reset failed:', upErr.message) // eslint-disable-line no-console
      } else {
        // genuine pre-login data (or already ours) — migrate it up.
        const { error: upErr } = await supabase
          .from('picks')
          .upsert({ user_id: userId, email: user.email, display_name: displayName, predictions, fantasy, home_code: homeCode })
        if (!cancelled && !upErr) lastSyncedRef.current = snapOf(predictions, fantasy, homeCode, displayName)
        else if (upErr) console.warn('[sync] seed failed:', upErr.message) // eslint-disable-line no-console
      }
      try {
        localStorage.setItem(OWNER_KEY, userId)
      } catch {
        /* ignore */
      }
      if (!cancelled) hydratedUserRef.current = userId
    })()
    return () => {
      cancelled = true
    }
    // Intentionally keyed only on the user — predictions/fantasy/homeCode are read
    // as the first-login seed, not as triggers (the upsert effect handles edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user])

  // Debounced upsert: whenever picks OR the home team change after hydrate, push.
  useEffect(() => {
    if (!supabase || !userId || !user) return
    if (hydratedUserRef.current !== userId) return // wait for hydrate to finish
    const snap = snapOf(predictions, fantasy, homeCode, displayName)
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
          home_code: homeCode,
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
  }, [predictions, fantasy, homeCode, userId, user, displayName])

  const setPrediction = useCallback((matchNo: number, code: TeamCode) => {
    setPredictions((p) => pruneStale({ ...p, [matchNo]: code }))
  }, [])
  const clearPredictions = useCallback(() => {
    setPredictions({})
    setPredictLocked(false)
  }, [])
  const lockPredictions = useCallback(() => setPredictLocked(true), [])

  const setRoundPick = useCallback((round: Round, slot: Slot, pick: FantasyPick | null) => {
    setFantasy((fr) => {
      const cur = fr[round] ?? emptySquad()
      const removed = cur.players.find((p) => p.slot === slot)
      const players = cur.players.filter((p) => p.slot !== slot)
      if (pick) players.push(pick)
      let { captain } = cur
      if (removed && captain === playerKey(removed)) captain = null
      return { ...fr, [round]: { players, captain } }
    })
  }, [])

  const seedRound = useCallback((round: Round, players: FantasyPick[]) => {
    setFantasy((fr) => {
      if (fr[round]) return fr
      return { ...fr, [round]: { players: players.map((p) => ({ ...p })), captain: null } }
    })
  }, [])

  /** Replace a round's whole squad in one write (used to commit a transfer draft). */
  const setRoundSquad = useCallback((round: Round, squad: RoundSquad) => {
    setFantasy((fr) => ({
      ...fr,
      [round]: { players: squad.players.map((p) => ({ ...p })), captain: squad.captain },
    }))
  }, [])

  const setCaptain = useCallback((round: Round, key: string) => {
    setFantasy((fr) => {
      const cur = fr[round]
      if (!cur) return fr
      return { ...fr, [round]: { ...cur, captain: key } }
    })
  }, [])

  const resetFantasy = useCallback(() => setFantasy({}), [])

  const value = useMemo<GamesCtx>(
    () => ({ predictions, setPrediction, clearPredictions, predictLocked, lockPredictions, fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain, resetFantasy }),
    [predictions, setPrediction, clearPredictions, predictLocked, lockPredictions, fantasy, setRoundPick, seedRound, setRoundSquad, setCaptain, resetFantasy],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGames() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGames must be used within GamesProvider')
  return v
}
